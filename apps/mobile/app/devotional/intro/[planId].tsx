import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { useThemeColor } from "@/components/useThemeColor";
import { usePlan } from "@/lib/queries";

/**
 * The front door to a read-through plan: the book's introduction on its own
 * screen, with one way forward. Reached only when the plan is first started —
 * every later entry point opens the reading directly, where the same text is
 * available collapsed for a reread. Themed plans have no howToUse and never
 * route here.
 */
export default function ReadThroughIntro() {
  const { planId: planIdParam, groupId: groupIdParam } = useLocalSearchParams<{
    planId: string;
    groupId?: string;
  }>();
  const planId = String(planIdParam);
  const groupId = groupIdParam ?? null;
  const router = useRouter();

  const primary = useThemeColor("primary");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");

  const plan = usePlan(planId);

  // replace, not push: the intro is a threshold, so backing out of day 1 should
  // leave the plan rather than land here again.
  const openDayOne = () =>
    router.replace(`/devotional/${planId}${groupId ? `?groupId=${groupId}` : ""}`);

  if (plan.isLoading) {
    return (
      <Screen center>
        <ActivityIndicator color={primary} />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title={plan.data?.title ?? "Read through"} subtitle="Before you begin" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 4,
          paddingBottom: 24,
          maxWidth: 512,
          width: "100%",
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {plan.data?.howToUse ? (
          <Text
            className="font-serif-regular"
            style={{ color: fg, fontSize: 16, lineHeight: 29 }}
          >
            {plan.data.howToUse}
          </Text>
        ) : (
          <Text className="font-serif-italic text-center text-sm" style={{ color: muted }}>
            Read it straight through, one passage a day.
          </Text>
        )}

        <Text
          style={{ color: muted, fontSize: 13, lineHeight: 20, marginTop: 20, fontStyle: "italic" }}
        >
          Each day is the passage and two questions. There are no notes and no
          commentary. The thinking is yours to do.
        </Text>

        {/* The reading screen carries the same disclosure, but this is its own
            screen and the introduction above is the only thing on it, so the
            line has to be here too. Worded for this page: no Scripture is
            displayed here, so the exclusion the reader sees elsewhere
            ("everything but the Scripture") would be pointing at nothing. */}
        {plan.data?.howToUse ? (
          <Text
            style={{ textAlign: "center", fontSize: 11, lineHeight: 16, color: muted, marginTop: 28 }}
          >
            This introduction is AI-generated.
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
        <Button title="Open day 1" onPress={openDayOne} />
      </View>
    </Screen>
  );
}
