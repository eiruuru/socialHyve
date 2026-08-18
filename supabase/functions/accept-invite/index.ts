import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

type InviteType = 'organization' | 'client';

async function lookupOrgInvite(
  service: ReturnType<typeof getServiceClient>,
  token: string,
  { requireValid = true } = {},
) {
  let query = service
    .from('organization_invites')
    .select('*, organizations(name)')
    .eq('token', token);

  if (requireValid) {
    query = query.gt('expires_at', new Date().toISOString());
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function lookupClientInvite(
  service: ReturnType<typeof getServiceClient>,
  token: string,
  { requireValid = true } = {},
) {
  let query = service
    .from('client_invites')
    .select('*, clients(id, name)')
    .eq('token', token);

  if (requireValid) {
    query = query.gt('expires_at', new Date().toISOString());
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function inviteLookupError(
  service: ReturnType<typeof getServiceClient>,
  type: InviteType,
  token: string,
): Promise<string> {
  const lookup = type === 'organization' ? lookupOrgInvite : lookupClientInvite;
  const row = await lookup(service, token, { requireValid: false });
  if (!row) {
    return 'Invalid invite link — use the full link from your invite email or ask for a new one.';
  }
  if (new Date(row.expires_at as string) <= new Date()) {
    return 'This invite has expired. Ask your admin to send a new invite.';
  }
  return 'Invalid or expired invite';
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const type = body.type as InviteType;
    const token = body.token as string;

    if (!token || !type) {
      return jsonResponse({ error: 'token and type required' }, 400);
    }

    const service = getServiceClient();

    if (action === 'preview') {
      if (type === 'organization') {
        const invite = await lookupOrgInvite(service, token);
        if (!invite) {
          return jsonResponse({ error: await inviteLookupError(service, type, token) }, 404);
        }
        return jsonResponse({
          type: 'organization',
          email: invite.email,
          role: invite.role,
          label: invite.organizations?.name || 'Organization',
        });
      }

      const invite = await lookupClientInvite(service, token);
      if (!invite) {
        return jsonResponse({ error: await inviteLookupError(service, type, token) }, 404);
      }
      return jsonResponse({
        type: 'client',
        email: invite.email,
        role: invite.role,
        label: invite.clients?.name || 'Client',
        clientId: invite.clients?.id || invite.client_id,
      });
    }

    if (action === 'accept') {
      const { user } = await requireUser(req);
      const userEmail = user.email?.toLowerCase();

      if (type === 'organization') {
        const invite = await lookupOrgInvite(service, token);
        if (!invite) {
          return jsonResponse({ error: await inviteLookupError(service, type, token) }, 404);
        }
        if (invite.email.toLowerCase() !== userEmail) {
          return jsonResponse({ error: 'Invite email does not match your account' }, 403);
        }

        await service.from('organization_members').upsert(
          {
            organization_id: invite.organization_id,
            user_id: user.id,
            role: invite.role,
          },
          { onConflict: 'organization_id,user_id' },
        );
        await service.from('organization_invites').delete().eq('token', token);

        return jsonResponse({ redirectTo: '/app/calendar' });
      }

      const invite = await lookupClientInvite(service, token);
      if (!invite) {
        return jsonResponse({ error: await inviteLookupError(service, type, token) }, 404);
      }
      if (invite.email.toLowerCase() !== userEmail) {
        return jsonResponse({ error: 'Invite email does not match your account' }, 403);
      }

      const clientId = invite.clients?.id || invite.client_id;
      await service.from('client_members').upsert(
        {
          client_id: clientId,
          user_id: user.id,
          role: invite.role,
        },
        { onConflict: 'client_id,user_id' },
      );
      await service.from('client_invites').delete().eq('token', token);

      return jsonResponse({ redirectTo: `/app/client/${clientId}/review` });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Unauthorized' || message === 'Missing authorization' ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
