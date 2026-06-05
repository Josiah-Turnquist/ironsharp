import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile } from "@/lib/api";
import type { MembershipTier } from "@/lib/tiers";

const LAST_SHOWN_KEY = "@ironsharp/upgrade_prompt_last_shown";

export function useUpgradePrompt(profile: Profile | undefined) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const tier = profile.membershipTier as MembershipTier;

    // Family users never see upgrade prompts
    if (tier === "family") return;

    // Sharpen users only see the Family prompt if they're married with kids
    if (tier === "sharpen") {
      const isMarried = profile.surveyRelationshipStatus === "married" ||
                        profile.surveyRelationshipStatus === "Married";
      if (!isMarried || !profile.surveyHasKids) return;
    }

    // Never show within 24 hours of completing onboarding
    if (profile.surveyCompletedAt) {
      const hoursSinceOnboarding =
        (Date.now() - new Date(profile.surveyCompletedAt).getTime()) / 3_600_000;
      if (hoursSinceOnboarding < 24) return;
    }

    // Calculate days since account creation
    const createdAt = new Date(profile.createdAt);
    const daysSinceSignup = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000);

    // Only fire on day 15, 30, 45, 60, … (every 15 days, never on day 0)
    if (daysSinceSignup === 0 || daysSinceSignup % 15 !== 0) return;

    // Don't show more than once per day
    AsyncStorage.getItem(LAST_SHOWN_KEY).then((lastShown) => {
      const today = new Date().toDateString();
      if (lastShown === today) return;
      AsyncStorage.setItem(LAST_SHOWN_KEY, today).catch(() => {});
      setVisible(true);
    }).catch(() => {});
  }, [profile?.createdAt, profile?.membershipTier]);

  return {
    visible,
    dismiss: () => setVisible(false),
    // Call this to show the prompt reactively (limit hit, etc.)
    show: () => setVisible(true),
  };
}
