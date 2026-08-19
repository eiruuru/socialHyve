import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  assertPlatformAdmin,
  generateTempPassword,
  logAdminEvent,
} from '../_shared/platformAdmin.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    await assertPlatformAdmin(service, user.id);

    const body = await req.json().catch(() => ({}));
    const requestId = body.requestId as string;
    const action = body.action as 'approve' | 'reject';
    const reviewNote = String(body.reviewNote || '').trim() || null;

    if (!requestId || !action) {
      return jsonResponse({ error: 'requestId and action required' }, 400);
    }

    const { data: row, error: rowErr } = await service
      .from('waitlist_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (rowErr) throw rowErr;
    if (!row) return jsonResponse({ error: 'Waitlist request not found' }, 404);
    if (row.status !== 'pending') {
      return jsonResponse({ error: 'Request already reviewed' }, 409);
    }

    if (action === 'reject') {
      const { error } = await service
        .from('waitlist_requests')
        .update({
          status: 'rejected',
          review_note: reviewNote,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      await logAdminEvent(service, {
        actorUserId: user.id,
        action: 'waitlist_rejected',
        targetType: 'waitlist_request',
        targetId: requestId,
        metadata: { email: row.email, reviewNote },
      });

      return jsonResponse({ ok: true, status: 'rejected' });
    }

    const email = String(row.email).trim().toLowerCase();
    const tempPassword = generateTempPassword();

    const { data: existingProfile } = await service
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    let provisionedUserId: string;
    let existingAccount = false;

    if (existingProfile?.id) {
      existingAccount = true;
      provisionedUserId = existingProfile.id as string;
      const { error: updateErr } = await service.auth.admin.updateUserById(provisionedUserId, {
        password: tempPassword,
        email_confirm: true,
      });
      if (updateErr) throw updateErr;
    } else {
      const { data: created, error: createErr } = await service.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: row.name || null },
      });
      if (createErr) throw createErr;
      if (!created.user) throw new Error('Failed to create user');
      provisionedUserId = created.user.id;
    }

    await service.from('profiles').upsert({
      id: provisionedUserId,
      email,
      full_name: row.name || null,
      must_change_password: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    const { error: waitlistErr } = await service
      .from('waitlist_requests')
      .update({
        status: 'approved',
        review_note: reviewNote,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        provisioned_user_id: provisionedUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (waitlistErr) throw waitlistErr;

    await logAdminEvent(service, {
      actorUserId: user.id,
      action: 'waitlist_approved',
      targetType: 'waitlist_request',
      targetId: requestId,
      metadata: { email, provisionedUserId, existingAccount },
    });

    return jsonResponse({
      ok: true,
      status: 'approved',
      email,
      tempPassword,
      provisionedUserId,
      existingAccount,
    });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Forbidden' ? 403
      : message === 'Unauthorized' || message === 'Missing authorization' ? 401
      : 400;
    return jsonResponse({ error: message }, status);
  }
});
