import { ScrollView, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useProfile } from "@/lib/queries";
import { useThemeColor } from "@/components/useThemeColor";
import {
  TIER_DISPLAY,
  TIER_ORDER,
  TIER_LIMITS,
  planUnlocksRemaining,
  type MembershipTier,
} from "@/lib/tiers";

export default function MembershipScreen() {
  const profile = useProfile();
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const bg = useThemeColor("background");

  const currentTier = (profile.data?.membershipTier ?? "free") as MembershipTier;
  const planUnlocksCount = profile.data?.planUnlocksCount ?? 0;
  const planUnlocksWindowStart = profile.data?.planUnlocksWindowStart ?? null;

  return (
    <Screen edges={["top"]}>
      <Header title="Membership" subtitle="Your plan" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg gap-4 px-4 py-4 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan usage card */}
        <CurrentUsageCard
          tier={currentTier}
          planUnlocksCount={planUnlocksCount}
          planUnlocksWindowStart={planUnlocksWindowStart}
          bg={bg}
          border={border}
          fg={fg}
          muted={muted}
        />

        <Text className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
          All Plans
        </Text>

        {/* Tier comparison cards */}
        {TIER_ORDER.map((tier) => {
          const display = TIER_DISPLAY[tier];
          const isActive = tier === currentTier;

          return (
            <View
              key={tier}
              style={{
                backgroundColor: isActive ? display.accentColor + "18" : card,
                borderColor: isActive ? display.accentColor : border,
                borderWidth: isActive ? 2 : 1,
                borderRadius: 16,
                padding: 18,
                gap: 12,
              }}
            >
              {/* Header row */}
              <View className="flex-row items-start justify-between">
                <View style={{ gap: 2 }}>
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="font-serif text-xl font-bold"
                      style={{ color: isActive ? display.accentColor : fg }}
                    >
                      {display.name}
                    </Text>
                    {isActive && (
                      <View
                        style={{
                          backgroundColor: display.accentColor,
                          borderRadius: 99,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text className="text-[10px] font-sans-semibold uppercase tracking-wider text-white">
                          Current
                        </Text>
                      </View>
                    )}
                  </View>

                  {display.monthlyPrice ? (
                    <Text className="text-sm text-muted-foreground">
                      {display.monthlyPrice}/mo{" "}
                      <Text className="text-xs">or {display.annualTotal}</Text>
                    </Text>
                  ) : (
                    <Text className="text-sm text-muted-foreground">Always free</Text>
                  )}
                </View>

                {!isActive && display.monthlyPrice && (
                  <View
                    style={{
                      backgroundColor: border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: muted, fontSize: 13 }}>Coming soon</Text>
                  </View>
                )}
              </View>

              {/* Feature list */}
              <View style={{ gap: 7 }}>
                {display.features.map((feature, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: isActive
                          ? display.accentColor
                          : display.accentColor + "40",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </View>
                    <Text
                      className="flex-1 text-sm leading-5"
                      style={{ color: isActive ? fg : muted }}
                    >
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Text className="mt-2 text-center text-xs text-muted-foreground px-4">
          Upgrades and billing coming soon. Your plan is managed here.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function CurrentUsageCard({
  tier,
  planUnlocksCount,
  planUnlocksWindowStart,
  bg,
  border,
  fg,
  muted,
}: {
  tier: MembershipTier;
  planUnlocksCount: number;
  planUnlocksWindowStart: string | null;
  bg: string;
  border: string;
  fg: string;
  muted: string;
}) {
  const display = TIER_DISPLAY[tier];
  const limits = TIER_LIMITS[tier];
  const unlockLimit = limits.planUnlocksPerMonth;
  const unlocksLeft = planUnlocksRemaining(tier, planUnlocksCount, planUnlocksWindowStart);

  return (
    <View
      style={{
        backgroundColor: display.accentColor + "15",
        borderColor: display.accentColor + "60",
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
        gap: 14,
      }}
    >
      <View>
        <Text className="text-xs uppercase tracking-wider" style={{ color: display.accentColor }}>
          {display.name} Plan
        </Text>
        {display.monthlyPrice ? (
          <Text className="mt-0.5 text-sm text-muted-foreground">
            {display.monthlyPrice}/mo · {display.annualTotal}
          </Text>
        ) : (
          <Text className="mt-0.5 text-sm text-muted-foreground">Always free</Text>
        )}
      </View>

      {/* Plan unlocks meter */}
      {unlockLimit !== Infinity ? (
        <View style={{ gap: 6 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: fg }}>
              Plan unlocks this month
            </Text>
            <Text className="text-sm font-sans-semibold" style={{ color: fg }}>
              {unlockLimit - unlocksLeft} / {unlockLimit}
            </Text>
          </View>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: display.accentColor + "30",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${((unlockLimit - unlocksLeft) / unlockLimit) * 100}%`,
                backgroundColor: display.accentColor,
                borderRadius: 3,
              }}
            />
          </View>
          {unlocksLeft === 0 && (
            <Text className="text-xs" style={{ color: muted }}>
              Resets in 30 days from your first unlock this window.
            </Text>
          )}
        </View>
      ) : (
        <Text className="text-sm" style={{ color: muted }}>
          Unlimited plan unlocks
        </Text>
      )}

      {/* AI tokens meter */}
      {limits.aiTokensPerMonth > 0 ? (
        <Text className="text-sm" style={{ color: muted }}>
          {limits.aiTokensPerMonth} AI generation token{limits.aiTokensPerMonth > 1 ? "s" : ""}/month
        </Text>
      ) : (
        <Text className="text-sm" style={{ color: muted }}>
          No AI generation (upgrade to unlock)
        </Text>
      )}
    </View>
  );
}
