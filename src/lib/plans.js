import { WAITLIST_EMAIL } from '@/lib/siteConfig';

export const PLAN_IDS = {
  STARTER: 'starter',
  PRO: 'pro',
};

export const SUBSCRIPTION_STATUS = {
  NONE: 'none',
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
};

/** Display prices — must match Creem product prices in the dashboard. */
export const PLANS = {
  [PLAN_IDS.STARTER]: {
    id: PLAN_IDS.STARTER,
    name: 'Starter',
    priceLabel: '€29',
    interval: 'month',
    description: 'Schedule and approve posts for your clients with manual media uploads.',
    features: [
      'Approval queue & content calendar',
      'Facebook & Instagram publishing',
      'Workspace Meta pool & Social Links',
      'Manual media upload',
      'AI Caption assistant',
      'Interactions inbox',
    ],
    limitations: [
      'No team members (owner only)',
      'No client member invites',
      'No Canva import',
    ],
  },
  [PLAN_IDS.PRO]: {
    id: PLAN_IDS.PRO,
    name: 'Pro',
    priceLabel: '€79',
    interval: 'month',
    description: 'Everything in Starter, plus team collaboration and Canva import.',
    features: [
      'Everything in Starter',
      'Team invites & roles',
      'Client member invites (Creatives QA & Guest)',
      'Canva design import',
    ],
    limitations: [],
    highlighted: true,
  },
};

export const SUPPORT_EMAIL = WAITLIST_EMAIL;

export function isActiveSubscription(status) {
  return status === SUBSCRIPTION_STATUS.ACTIVE || status === SUBSCRIPTION_STATUS.TRIALING;
}

export function isProPlan(plan, status) {
  return plan === PLAN_IDS.PRO && isActiveSubscription(status);
}

export function canUseTeamFeatures(plan, status) {
  return isProPlan(plan, status);
}

export function canUseClientMembers(plan, status) {
  return isProPlan(plan, status);
}

export function canUseCanva(plan, status) {
  return isProPlan(plan, status);
}

export function getPlanLabel(plan) {
  if (plan === PLAN_IDS.PRO) return PLANS[PLAN_IDS.PRO].name;
  if (plan === PLAN_IDS.STARTER) return PLANS[PLAN_IDS.STARTER].name;
  return 'No plan';
}
