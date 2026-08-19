import { assertOrgRole, assertClientRole, syncOrganizationOwner } from '../_shared/adminMembers.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { assertPlatformAdmin, generateTempPassword, logAdminEvent } from '../_shared/platformAdmin.ts';
import { provisionUserAccount } from '../_shared/provisionUser.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

type Action = 'provision' | 'update_profile' | 'reset_password' | 'set_must_change_password';

type Assignment = {
  type: 'organization' | 'client';
  organizationId?: string;
  clientId?: string;
  role: string;
};

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
      case 'provision': {
        const email = String(body.email || '').trim().toLowerCase();
        const fullName = body.fullName ? String(body.fullName).trim() : null;
        const assignments = (body.assignments ?? []) as Assignment[];

        if (!email) return jsonResponse({ error: 'email required' }, 400);

        const { userId, tempPassword, existingAccount } = await provisionUserAccount(service, {
          email,
          fullName,
          resetPasswordIfExists: true,
          mustChangePassword: true,
        });

        for (const assignment of assignments) {
          if (assignment.type === 'organization') {
            const organizationId = assignment.organizationId;
            if (!organizationId) continue;
            assertOrgRole(assignment.role);
            if (assignment.role === 'owner') {
              await syncOrganizationOwner(service, organizationId, userId);
            } else {
              await service.from('organization_members').upsert(
                { organization_id: organizationId, user_id: userId, role: assignment.role },
                { onConflict: 'organization_id,user_id' },
              );
            }
          } else if (assignment.type === 'client') {
            const clientId = assignment.clientId;
            if (!clientId) continue;
            assertClientRole(assignment.role);
            await service.from('client_members').upsert(
              { client_id: clientId, user_id: userId, role: assignment.role },
              { onConflict: 'client_id,user_id' },
            );
          }
        }

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_provision_user',
          targetType: 'user',
          targetId: userId,
          metadata: { email, existingAccount, assignmentCount: assignments.length },
        });

        return jsonResponse({ ok: true, userId, email, tempPassword, existingAccount });
      }

      case 'update_profile': {
        const userId = body.userId as string;
        const fullName = body.fullName !== undefined ? String(body.fullName || '').trim() || null : undefined;

        if (!userId) return jsonResponse({ error: 'userId required' }, 400);

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (fullName !== undefined) updates.full_name = fullName;

        const { data: profile, error } = await service
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select('id, email, full_name, must_change_password, updated_at')
          .maybeSingle();
        if (error) throw error;
        if (!profile) return jsonResponse({ error: 'User not found' }, 404);

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_update_profile',
          targetType: 'user',
          targetId: userId,
          metadata: { fullName },
        });

        return jsonResponse({ ok: true, profile });
      }

      case 'reset_password': {
        const userId = body.userId as string;
        if (!userId) return jsonResponse({ error: 'userId required' }, 400);

        const { data: profile, error: profileErr } = await service
          .from('profiles')
          .select('id, email')
          .eq('id', userId)
          .maybeSingle();
        if (profileErr) throw profileErr;
        if (!profile) return jsonResponse({ error: 'User not found' }, 404);

        const tempPassword = generateTempPassword();
        const { error: authErr } = await service.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true,
        });
        if (authErr) throw authErr;

        await service.from('profiles').update({
          must_change_password: true,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_reset_password',
          targetType: 'user',
          targetId: userId,
          metadata: { email: profile.email },
        });

        return jsonResponse({ ok: true, userId, email: profile.email, tempPassword });
      }

      case 'set_must_change_password': {
        const userId = body.userId as string;
        const value = !!body.value;

        if (!userId) return jsonResponse({ error: 'userId required' }, 400);

        const { data: profile, error } = await service
          .from('profiles')
          .update({ must_change_password: value, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select('id, email, must_change_password')
          .maybeSingle();
        if (error) throw error;
        if (!profile) return jsonResponse({ error: 'User not found' }, 404);

        await logAdminEvent(service, {
          actorUserId: user.id,
          action: 'admin_set_must_change_password',
          targetType: 'user',
          targetId: userId,
          metadata: { value },
        });

        return jsonResponse({ ok: true, profile });
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
