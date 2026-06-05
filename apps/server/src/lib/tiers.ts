export type MembershipTier = "free" | "connect" | "sharpen" | "family";

export interface TierLimits {
  planUnlocksPerMonth: number; // Infinity = unlimited
  aiTokensPerMonth: number;
  commuteMode: boolean;
  maxGroupSize: number;    // groups the user can CREATE (Infinity = unlimited)
  sharingCircle: number;   // max shared-plan members including self (Infinity = unlimited)
  outsideGroupsMax: number;
  outsideGroupMaxSize: number;
}

export const TIER_LIMITS: Record<MembershipTier, TierLimits> = {
  free: {
    planUnlocksPerMonth: 3,
    aiTokensPerMonth: 0,
    commuteMode: false,
    maxGroupSize: 3,
    sharingCircle: 3,
    outsideGroupsMax: 1,
    outsideGroupMaxSize: Infinity,
  },
  connect: {
    planUnlocksPerMonth: 5,
    aiTokensPerMonth: 1,
    commuteMode: true,
    maxGroupSize: 5,
    sharingCircle: 5,
    outsideGroupsMax: 1,
    outsideGroupMaxSize: 8,
  },
  sharpen: {
    planUnlocksPerMonth: Infinity,
    aiTokensPerMonth: 2,
    commuteMode: true,
    maxGroupSize: Infinity,
    sharingCircle: Infinity,
    outsideGroupsMax: Infinity,
    outsideGroupMaxSize: Infinity,
  },
  family: {
    planUnlocksPerMonth: Infinity,
    aiTokensPerMonth: 2,
    commuteMode: true,
    maxGroupSize: Infinity,
    sharingCircle: Infinity,
    outsideGroupsMax: Infinity,
    outsideGroupMaxSize: Infinity,
  },
};

export const UPGRADE_PATH: Record<MembershipTier, MembershipTier | null> = {
  free: "connect",
  connect: "sharpen",
  sharpen: "family",
  family: null,
};

export const TIER_NAMES: Record<MembershipTier, string> = {
  free: "Free",
  connect: "Connect",
  sharpen: "Sharpen",
  family: "Family",
};

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
