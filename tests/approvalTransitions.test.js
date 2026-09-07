import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionApproval,
  isReviewableApproval,
} from '../src/features/queue/approvalTransitions.js';
import { hasCreativesQaAccess, hasGuestAccess } from '../src/lib/clientRoles.js';

test('changes_requested can move to approved, pending, or stay on changes_requested', () => {
  assert.equal(canTransitionApproval('changes_requested', 'approved'), true);
  assert.equal(canTransitionApproval('changes_requested', 'pending'), true);
  assert.equal(canTransitionApproval('changes_requested', 'changes_requested'), true);
  assert.equal(canTransitionApproval('changes_requested', 'draft'), false);
});

test('pending can still approve or request changes, but not stay pending', () => {
  assert.equal(canTransitionApproval('pending', 'approved'), true);
  assert.equal(canTransitionApproval('pending', 'changes_requested'), true);
  assert.equal(canTransitionApproval('pending', 'pending'), false);
  assert.equal(canTransitionApproval('pending', 'draft'), false);
});

test('isReviewableApproval covers pending and changes requested only', () => {
  assert.equal(isReviewableApproval('pending'), true);
  assert.equal(isReviewableApproval('changes_requested'), true);
  assert.equal(isReviewableApproval('approved'), false);
  assert.equal(isReviewableApproval('draft'), false);
});

const guestMembership = {
  isClientOnly: true,
  clientMemberships: [{ clientId: 'c1', role: 'guest' }],
};

const qaMembership = {
  isClientOnly: true,
  clientMemberships: [{ clientId: 'c1', role: 'creatives_qa' }],
};

const orgMembership = {
  isClientOnly: false,
  clientMemberships: [],
};

test('guest membership cannot review', () => {
  assert.equal(hasCreativesQaAccess(guestMembership), false);
  assert.equal(hasGuestAccess(guestMembership), true);
});

test('creatives QA membership can review', () => {
  assert.equal(hasCreativesQaAccess(qaMembership), true);
  assert.equal(hasGuestAccess(qaMembership), false);
});

test('org team members are not client reviewers', () => {
  assert.equal(hasCreativesQaAccess(orgMembership), false);
  assert.equal(hasGuestAccess(orgMembership), false);
});
