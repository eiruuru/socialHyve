import { generateTempPassword } from './platformAdmin.ts';
import { getServiceClient } from './supabase.ts';

export type ProvisionUserResult = {
  userId: string;
  tempPassword: string | null;
  existingAccount: boolean;
};

export async function provisionUserAccount(
  service: ReturnType<typeof getServiceClient>,
  params: {
    email: string;
    fullName?: string | null;
    resetPasswordIfExists?: boolean;
    mustChangePassword?: boolean;
  },
): Promise<ProvisionUserResult> {
  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error('Email is required');

  const fullName = params.fullName?.trim() || null;
  const resetPasswordIfExists = params.resetPasswordIfExists !== false;
  const mustChangePassword = params.mustChangePassword !== false;

  const { data: existingProfile } = await service
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  let userId: string;
  let existingAccount = false;
  let tempPassword: string | null = null;

  if (existingProfile?.id) {
    existingAccount = true;
    userId = existingProfile.id as string;
    if (resetPasswordIfExists) {
      tempPassword = generateTempPassword();
      const { error: updateErr } = await service.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
      });
      if (updateErr) throw updateErr;
    }
  } else {
    tempPassword = generateTempPassword();
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr) throw createErr;
    if (!created.user) throw new Error('Failed to create user');
    userId = created.user.id;
  }

  const profileUpdate: Record<string, unknown> = {
    id: userId,
    email,
    updated_at: new Date().toISOString(),
  };
  if (fullName !== null) profileUpdate.full_name = fullName;
  if (mustChangePassword && tempPassword) profileUpdate.must_change_password = true;

  await service.from('profiles').upsert(profileUpdate, { onConflict: 'id' });

  return { userId, tempPassword, existingAccount };
}

export async function findUserIdByEmail(
  service: ReturnType<typeof getServiceClient>,
  email: string,
): Promise<string | null> {
  const { data, error } = await service
    .from('profiles')
    .select('id, email')
    .ilike('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string) || null;
}
