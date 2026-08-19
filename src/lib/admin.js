import { supabase } from './supabase';
import { invokeFunction } from './supabaseFunctions';

export async function bootstrapPlatformAdmin() {
  return invokeFunction('platformAdminBootstrap');
}

export async function submitWaitlistRequest({ email, name, message }) {
  return invokeFunction('waitlistSubmit', { email, name, message });
}

export async function listWaitlistRequests(status) {
  return invokeFunction('adminListWaitlist', status ? { status } : {});
}

export async function reviewWaitlistRequest({ requestId, action, reviewNote }) {
  return invokeFunction('adminReviewWaitlist', { requestId, action, reviewNote });
}

export async function listAdminOrganizations() {
  return invokeFunction('adminListOrganizations');
}

export async function getAdminOrganization(organizationId) {
  return invokeFunction('adminGetOrganization', { organizationId });
}

export async function updateAdminOrganizationPlan(payload) {
  return invokeFunction('adminUpdateOrganizationPlan', payload);
}

export async function listAdminUsers() {
  return invokeFunction('adminListUsers');
}

export async function getAdminUserPreview(userId) {
  return invokeFunction('adminGetUserPreview', { userId });
}

export async function getProfileMustChangePassword() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return !!data?.must_change_password;
}

export async function clearMustChangePassword() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id);
  if (error) throw error;
}
