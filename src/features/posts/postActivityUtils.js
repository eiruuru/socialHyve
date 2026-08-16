const HIDDEN_CLIENT_ACTIONS = new Set(['assignee', 'review_link']);

export function formatActivityDetail(entry) {
  const text = entry.detail || entry.action || '';
  return text.replace(/_/g, ' ');
}

export function filterClientActivity(entries) {
  return (entries || []).filter((entry) => {
    if (HIDDEN_CLIENT_ACTIONS.has(entry.action)) return false;
    if (entry.action === 'comment' && entry.detail === 'Added internal comment') return false;
    return true;
  });
}
