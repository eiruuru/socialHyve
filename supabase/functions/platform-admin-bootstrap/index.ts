import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';
import { bootstrapPlatformAdminIfEligible, isPlatformAdmin } from '../_shared/platformAdmin.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { user } = await requireUser(req);
    const service = getServiceClient();
    await bootstrapPlatformAdminIfEligible(service, user.id, user.email);
    const admin = await isPlatformAdmin(service, user.id);
    return jsonResponse({ isPlatformAdmin: admin });
  } catch (err) {
    const message = (err as Error).message;
    const status = message === 'Unauthorized' || message === 'Missing authorization' ? 401 : 400;
    return jsonResponse({ error: message }, status);
  }
});
