const ALLOWED_TRANSITIONS = {
  draft: ['pending'],
  pending: ['approved', 'changes_requested'],
  changes_requested: ['pending', 'approved', 'changes_requested'],
  approved: ['pending'],
};

export function canTransitionApproval(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isReviewableApproval(approval) {
  return approval === 'pending' || approval === 'changes_requested';
}
