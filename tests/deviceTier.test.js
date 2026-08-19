import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_TIERS,
  getDefaultAppPath,
  getDeviceTier,
  isRouteAllowed,
  resolveTierAppPath,
  tierAtLeast,
} from '../src/lib/deviceTier.js';

describe('deviceTier', () => {
  it('classifies widths into tiers', () => {
    assert.equal(getDeviceTier(375), DEVICE_TIERS.MOBILE);
    assert.equal(getDeviceTier(800), DEVICE_TIERS.TABLET);
    assert.equal(getDeviceTier(1280), DEVICE_TIERS.DESKTOP);
  });

  it('returns default paths per tier', () => {
    assert.equal(getDefaultAppPath(DEVICE_TIERS.MOBILE), '/app/queue');
    assert.equal(getDefaultAppPath(DEVICE_TIERS.TABLET), '/app/calendar');
    assert.equal(getDefaultAppPath(DEVICE_TIERS.DESKTOP), '/app/calendar');
  });

  it('maps calendar paths to queue on mobile', () => {
    assert.equal(resolveTierAppPath('/app/calendar', DEVICE_TIERS.MOBILE), '/app/queue');
    assert.equal(resolveTierAppPath('/app/calendar?month=2026-08', DEVICE_TIERS.MOBILE), '/app/queue');
    assert.equal(resolveTierAppPath('/app/calendar', DEVICE_TIERS.TABLET), '/app/calendar');
    assert.equal(resolveTierAppPath('/app/queue', DEVICE_TIERS.MOBILE), '/app/queue');
  });

  it('gates routes by tier', () => {
    assert.equal(isRouteAllowed('/app/queue', DEVICE_TIERS.MOBILE), true);
    assert.equal(isRouteAllowed('/app/calendar', DEVICE_TIERS.MOBILE), false);
    assert.equal(isRouteAllowed('/app/calendar', DEVICE_TIERS.TABLET), true);
    assert.equal(isRouteAllowed('/app/posts/import', DEVICE_TIERS.MOBILE), false);
    assert.equal(isRouteAllowed('/app/posts/import', DEVICE_TIERS.TABLET), true);
    assert.equal(isRouteAllowed('/app/help', DEVICE_TIERS.TABLET), true);
    assert.equal(isRouteAllowed('/app/help', DEVICE_TIERS.DESKTOP), true);
  });

  it('compares tier rank', () => {
    assert.equal(tierAtLeast(DEVICE_TIERS.TABLET, DEVICE_TIERS.MOBILE), true);
    assert.equal(tierAtLeast(DEVICE_TIERS.MOBILE, DEVICE_TIERS.TABLET), false);
  });
});
