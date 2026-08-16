/** Internal client member role values stored in the database. */
export const CLIENT_ROLE = {
  APPROVER: 'approver',
  VIEWER: 'viewer',
};

export const CLIENT_ROLE_OPTIONS = [
  { value: CLIENT_ROLE.APPROVER, label: 'Creatives QA' },
  { value: CLIENT_ROLE.VIEWER, label: 'Guest' },
];

const CLIENT_ROLE_LABELS = {
  [CLIENT_ROLE.APPROVER]: 'Creatives QA',
  [CLIENT_ROLE.VIEWER]: 'Guest',
};

export function formatClientRole(role) {
  if (!role) return '';
  return CLIENT_ROLE_LABELS[role] || role;
}

/** Format sidebar / account role labels (client + org roles). */
export function formatRoleLabel(role) {
  if (!role) return '';
  const clientLabel = formatClientRole(role);
  if (clientLabel !== role) return clientLabel;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function isClientRole(role) {
  return role === CLIENT_ROLE.APPROVER || role === CLIENT_ROLE.VIEWER;
}
