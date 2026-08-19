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

export async function listAdminUsers({
  search = '',
  filter = 'all',
  organizationId,
  limit = 50,
  offset = 0,
} = {}) {
  return invokeFunction('adminListUsers', {
    search: search || undefined,
    filter,
    organizationId,
    limit,
    offset,
  });
}

export async function getAdminUser(userId) {
  try {
    return await invokeFunction('adminGetUser', { userId });
  } catch {
    return invokeFunction('adminGetUserPreview', { userId });
  }
}

export async function getAdminUserPreview(userId) {
  return invokeFunction('adminGetUserPreview', { userId });
}

export async function provisionAdminUser({ email, fullName, assignments = [] }) {
  return invokeFunction('adminManageUser', {
    action: 'provision',
    email,
    fullName,
    assignments,
  });
}

export async function updateAdminUserProfile({ userId, fullName }) {
  return invokeFunction('adminManageUser', {
    action: 'update_profile',
    userId,
    fullName,
  });
}

export async function resetAdminUserPassword(userId) {
  return invokeFunction('adminManageUser', { action: 'reset_password', userId });
}

export async function setAdminUserMustChangePassword(userId, value) {
  return invokeFunction('adminManageUser', {
    action: 'set_must_change_password',
    userId,
    value,
  });
}

export async function adminAddOrgMember({
  organizationId,
  email,
  fullName,
  role,
  provisionIfMissing = true,
}) {
  return invokeFunction('adminManageMembers', {
    action: 'add_org_member',
    organizationId,
    email,
    fullName,
    role,
    provisionIfMissing,
  });
}

export async function adminAddClientMember({
  clientId,
  email,
  fullName,
  role,
  provisionIfMissing = true,
}) {
  return invokeFunction('adminManageMembers', {
    action: 'add_client_member',
    clientId,
    email,
    fullName,
    role,
    provisionIfMissing,
  });
}

export async function adminUpdateOrgMemberRole({ organizationId, userId, role }) {
  return invokeFunction('adminManageMembers', {
    action: 'update_org_member_role',
    organizationId,
    userId,
    role,
  });
}

export async function adminUpdateClientMemberRole({ clientId, userId, role }) {
  return invokeFunction('adminManageMembers', {
    action: 'update_client_member_role',
    clientId,
    userId,
    role,
  });
}

export async function adminRemoveOrgMember({ organizationId, userId }) {
  return invokeFunction('adminManageMembers', {
    action: 'remove_org_member',
    organizationId,
    userId,
  });
}

export async function adminRemoveClientMember({ clientId, userId }) {
  return invokeFunction('adminManageMembers', {
    action: 'remove_client_member',
    clientId,
    userId,
  });
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
