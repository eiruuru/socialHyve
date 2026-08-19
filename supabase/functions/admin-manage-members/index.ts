import { assertOrgRole, assertClientRole, syncOrganizationOwner, assertNotOrgOwner } from '../_shared/adminMembers.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { assertPlatformAdmin, logAdminEvent } from '../_shared/platformAdmin.ts';
import { findUserIdByEmail, provisionUserAccount } from '../_shared/provisionUser.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

type Action =
  | 'add_org_member'
  | 'add_client_member'
  | 'update_org_member_role'
  | 'update_client_member_role'
  | 'remove_org_member'
  | 'remove_client_member';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    await assertPlatformAdmin(service, user.id);

    const body = await req.json().catch(() => ({}));
    const action = body.action as Action;

    if (!action) return jsonResponse({ error: 'action required' }, 400);

    switch (action) {
      case 'add_org_member': {
        const organizationId = body.organizationId as string;
        const email = String(body.email || '').trim().toLowerCase();
        const fullName = body.fullName ? String(body.fullName).trim() : null;
        const role = body.role as string;
        const provisionIfMissing = body.provisionIfMissing !== false;

        if (!organizationId || !email || !role) {
          return jsonResponse({ error: 'organizationId, email, and role required' }, 400);
        }
        assertOrgRole(role);

        const { data: org } = await service
          .from('organizations')
          .select('id')
          .eq('id', organizationId)
          .maybeSingle();
        if (!org) return jsonResponse({ error: 'Organization not found' }, 404);

        let userId = await findUserIdByEmail(service, email);
        let tempPassword: string | null = null;
        let existingAccount = false;

        if (!userId) {
          if (!provisionIfMissing) {
            return jsonResponse({ added: false, reason: 'user_not_found' });
          }
          const provisioned = await provisionUserAccount(service, {
            email,
            fullName,
            resetPasswordIfExists: true,
            mustChangePassword: true,
          });
          userId = provisioned.userId;
          tempPassword = provisioned.tempPassword;
          existingAccount = provisioned.existingAccount;
        }

        if (role === 'owner') {
          await syncOrganizationOwner(service, organizationId, userId);
        } else {
          const { data: member, error: memberErr } = await service
            .from('organization_members')
            .upsert(
              { organization_id: organizationId, user_id: userId, role },
              { onConflict: 'organization_id,user_id' },
            )
            .select('*')
            .single();
          if (memberErr) throw memberErr;

          await service
            .from('organization_invites')
            .delete()
            .eq('organization_id', organizationId)
            .ilike('email', email);

          await logAdminEvent(service, {
            actorUserId: user.id,
            action: 'admin_add_org_member',
            targetType: 'user',
            targetId: userId,
            metadata: { organizationId, email, role, existingAccount },
          });

          return jsonResponse({ ok: true, userId, email, role, member, tempPassword, existingAccount });
        }

        await service
          .from('organization_invites')
          .delete()
          .eq('organization_id', organizationId)
          .ilike('email', email);

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_add_org_member',
          targetType: 'user',
          targetId: userId,
          metadata: { organizationId, email, role: 'owner', existingAccount },
        });

        return jsonResponse({ ok: true, userId, email, role: 'owner', tempPassword, existingAccount });
      }

      case 'add_client_member': {
        const clientId = body.clientId as string;
        const email = String(body.email || '').trim().toLowerCase();
        const fullName = body.fullName ? String(body.fullName).trim() : null;
        const role = body.role as string;
        const provisionIfMissing = body.provisionIfMissing !== false;

        if (!clientId || !email || !role) {
          return jsonResponse({ error: 'clientId, email, and role required' }, 400);
        }
        assertClientRole(role);

        const { data: client, error: clientErr } = await service
          .from('clients')
          .select('id, organization_id')
          .eq('id', clientId)
          .maybeSingle();
        if (clientErr) throw clientErr;
        if (!client) return jsonResponse({ error: 'Client not found' }, 404);

        let userId = await findUserIdByEmail(service, email);
        let tempPassword: string | null = null;
        let existingAccount = false;

        if (!userId) {
          if (!provisionIfMissing) {
            return jsonResponse({ added: false, reason: 'user_not_found' });
          }
          const provisioned = await provisionUserAccount(service, {
            email,
            fullName,
            resetPasswordIfExists: true,
            mustChangePassword: true,
          });
          userId = provisioned.userId;
          tempPassword = provisioned.tempPassword;
          existingAccount = provisioned.existingAccount;
        }

        const { data: member, error: memberErr } = await service
          .from('client_members')
          .upsert(
            { client_id: clientId, user_id: userId, role },
            { onConflict: 'client_id,user_id' },
          )
          .select('*')
          .single();
        if (memberErr) throw memberErr;

        await service
          .from('client_invites')
          .delete()
          .eq('client_id', clientId)
          .ilike('email', email);

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_add_client_member',
          targetType: 'user',
          targetId: userId,
          metadata: { clientId, organizationId: client.organization_id, email, role, existingAccount },
        });

        return jsonResponse({
          ok: true,
          userId,
          email,
          role,
          member,
          tempPassword,
          existingAccount,
        });
      }

      case 'update_org_member_role': {
        const organizationId = body.organizationId as string;
        const userId = body.userId as string;
        const role = body.role as string;

        if (!organizationId || !userId || !role) {
          return jsonResponse({ error: 'organizationId, userId, and role required' }, 400);
        }
        assertOrgRole(role);

        if (role === 'owner') {
          await syncOrganizationOwner(service, organizationId, userId);
        } else {
          const { data: member, error } = await service
            .from('organization_members')
            .update({ role })
            .eq('organization_id', organizationId)
            .eq('user_id', userId)
            .select('*')
            .maybeSingle();
          if (error) throw error;
          if (!member) return jsonResponse({ error: 'Member not found' }, 404);
        }

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_update_org_member_role',
          targetType: 'user',
          targetId: userId,
          metadata: { organizationId, role },
        });

        return jsonResponse({ ok: true, userId, role });
      }

      case 'update_client_member_role': {
        const clientId = body.clientId as string;
        const userId = body.userId as string;
        const role = body.role as string;

        if (!clientId || !userId || !role) {
          return jsonResponse({ error: 'clientId, userId, and role required' }, 400);
        }
        assertClientRole(role);

        const { data: member, error } = await service
          .from('client_members')
          .update({ role })
          .eq('client_id', clientId)
          .eq('user_id', userId)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        if (!member) return jsonResponse({ error: 'Member not found' }, 404);

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_update_client_member_role',
          targetType: 'user',
          targetId: userId,
          metadata: { clientId, role },
        });

        return jsonResponse({ ok: true, userId, role, member });
      }

      case 'remove_org_member': {
        const organizationId = body.organizationId as string;
        const userId = body.userId as string;

        if (!organizationId || !userId) {
          return jsonResponse({ error: 'organizationId and userId required' }, 400);
        }

        await assertNotOrgOwner(service, organizationId, userId);

        const { error } = await service
          .from('organization_members')
          .delete()
          .eq('organization_id', organizationId)
          .eq('user_id', userId);
        if (error) throw error;

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_remove_org_member',
          targetType: 'user',
          targetId: userId,
          metadata: { organizationId },
        });

        return jsonResponse({ ok: true });
      }

      case 'remove_client_member': {
        const clientId = body.clientId as string;
        const userId = body.userId as string;

        if (!clientId || !userId) {
          return jsonResponse({ error: 'clientId and userId required' }, 400);
        }

        const { error } = await service
          .from('client_members')
          .delete()
          .eq('client_id', clientId)
          .eq('user_id', userId);
        if (error) throw error;

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_remove_client_member',
          targetType: 'user',
          targetId: userId,
          metadata: { clientId },
        });

        return jsonResponse({ ok: true });
      }

      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
