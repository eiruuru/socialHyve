/** Client member role values stored in the database. */
export const CLIENT_ROLE = {
  APPROVER: 'creatives_qa',
  VIEWER: 'guest',
};

/** @deprecated Legacy values — kept for reads of stale data only. */
const LEGACY_CLIENT_ROLES = {
  approver: CLIENT_ROLE.APPROVER,
  viewer: CLIENT_ROLE.VIEWER,
};

export const CLIENT_ROLE_OPTIONS = [
  { value: CLIENT_ROLE.APPROVER, label: 'Creatives QA' },
  { value: CLIENT_ROLE.VIEWER, label: 'Guest' },
];

const CLIENT_ROLE_LABELS = {
  [CLIENT_ROLE.APPROVER]: 'Creatives QA',
  [CLIENT_ROLE.VIEWER]: 'Guest',
};

export function normalizeClientRole(role) {
  if (!role) return role;
  return LEGACY_CLIENT_ROLES[role] || role;
}

export function formatClientRole(role) {
  if (!role) return '';
  const normalized = normalizeClientRole(role);
  return CLIENT_ROLE_LABELS[normalized] || role;
}

/** Format sidebar / account role labels (client + org roles). */
export function formatRoleLabel(role) {
  if (!role) return '';
  const normalized = normalizeClientRole(role);
  if (CLIENT_ROLE_LABELS[normalized]) return CLIENT_ROLE_LABELS[normalized];
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function isClientRole(role) {
  const normalized = normalizeClientRole(role);
  return normalized === CLIENT_ROLE.APPROVER || normalized === CLIENT_ROLE.VIEWER;
}
