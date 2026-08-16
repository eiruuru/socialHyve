/** Scopes required for Interactions inbox (DMs + IG comments; FB comments optional). */
export const META_INTERACTIONS_SCOPES = [
  'pages_manage_metadata',
  'instagram_manage_comments',
  'instagram_manage_messages',
];

/** Needed for Facebook post comment sync/reply — enable when Login for Business allows it. */
export const META_FB_COMMENT_SCOPES = [
  'pages_read_engagement',
  'pages_manage_engagement',
];

/** Facebook Messenger also needs pages_messaging — configure via Login for Business, not scope=. */
export const META_MESSENGER_SCOPE = 'pages_messaging';

export function sessionHasInteractionsScopes(session) {
  const granted = session?.granted_scopes;
  if (!Array.isArray(granted) || granted.length === 0) return false;
  return META_INTERACTIONS_SCOPES.every((scope) => granted.includes(scope));
}

export function sessionsNeedInteractionsReconnect(sessions = []) {
  if (!sessions.length) return false;
  return sessions.some((session) => !sessionHasInteractionsScopes(session));
}
