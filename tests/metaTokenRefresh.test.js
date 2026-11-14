import test from 'node:test';
import assert from 'node:assert/strict';
import { decideUserTokenAction } from '../src/lib/metaTokenRefresh.js';

const NOW = Date.parse('2026-09-15T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function secondsFrom(ms) {
  return Math.floor(ms / 1000);
}

test('an invalid user token is marked for reconnect and not exchanged', () => {
  const decision = decideUserTokenAction({
    isValid: false,
    expiresAt: secondsFrom(NOW + 10 * DAY),
    issuedAt: secondsFrom(NOW - 30 * DAY),
    refreshedAt: new Date(NOW - DAY).toISOString(),
    now: NOW,
  });
  assert.deepEqual(decision, { action: 'reconnect', reason: 'invalid' });
});

test('a valid token expiring within 14 days is exchanged', () => {
  const decision = decideUserTokenAction({
    isValid: true,
    expiresAt: secondsFrom(NOW + 10 * DAY),
    issuedAt: secondsFrom(NOW - 30 * DAY),
    refreshedAt: new Date(NOW - DAY).toISOString(),
    now: NOW,
  });
  assert.deepEqual(decision, { action: 'exchange', reason: 'expires_soon' });
});

test('data access expiring within 14 days is exchanged', () => {
  const decision = decideUserTokenAction({
    isValid: true,
    expiresAt: secondsFrom(NOW + 40 * DAY),
    dataAccessExpiresAt: secondsFrom(NOW + 5 * DAY),
    issuedAt: secondsFrom(NOW - 30 * DAY),
    refreshedAt: new Date(NOW - DAY).toISOString(),
    now: NOW,
  });
  assert.deepEqual(decision, { action: 'exchange', reason: 'expires_soon' });
});

test('a fresh valid token is left alone', () => {
  const decision = decideUserTokenAction({
    isValid: true,
    expiresAt: secondsFrom(NOW + 40 * DAY),
    issuedAt: secondsFrom(NOW - 30 * DAY),
    refreshedAt: new Date(NOW - DAY).toISOString(),
    now: NOW,
  });
  assert.deepEqual(decision, { action: 'keep', reason: 'fresh' });
});

test('a valid token that has not been refreshed in 7 days is exchanged', () => {
  const decision = decideUserTokenAction({
    isValid: true,
    expiresAt: secondsFrom(NOW + 40 * DAY),
    issuedAt: secondsFrom(NOW - 30 * DAY),
    refreshedAt: new Date(NOW - 8 * DAY).toISOString(),
    now: NOW,
  });
  assert.deepEqual(decision, { action: 'exchange', reason: 'stale' });
});

test('a token younger than a day is not exchanged', () => {
  const decision = decideUserTokenAction({
    isValid: true,
    expiresAt: secondsFrom(NOW + 3 * DAY),
    issuedAt: secondsFrom(NOW - 2 * 60 * 60 * 1000),
    refreshedAt: null,
    now: NOW,
  });
  assert.deepEqual(decision, { action: 'keep', reason: 'too_young' });
});
