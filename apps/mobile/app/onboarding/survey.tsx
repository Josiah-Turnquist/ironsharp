import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useThemeColor } from "@/components/useThemeColor";
import { useOnboarding } from "./_layout";

const AGE_OPTIONS = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"];
const EDU_OPTIONS = [
  "Still in high school",
  "In college or trade school",
  "College graduate",
  "Postgraduate degree",
  "I took a different path",
];
const FAITH_OPTIONS = [
  "Just getting started — I’m new to Christianity",
  "Growing — I believe and I’m trying to go deeper",
  "Established — I’ve walked with God for years",
  "Returning — I’m coming back after some time away",
  "Exploring — I’m open but not sure what I believe yet",
];
const GOAL_OPTIONS = [
  "Help me be consistent in my time with God",
  "I want real accountability, not just a plan",
  "Become who God is calling me to be",
  "Faith in my home, not just on Sundays",
  "Pour into someone else’s life",
  "Get back on track with God",
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border-2 px-4 py-2 ${
        active ? "border-primary bg-primary/10" : "border-border bg-card"
      }`}
    >
      <Text
        className={`text-sm ${
          active ? "font-sans-semibold text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ListOption({
  label,
  active,
  onPress,
  multi,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  const checkColor = useThemeColor("primary-foreground");
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-xl border-2 p-3 ${
        active ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <View
        className={`h-6 w-6 items-center justify-center ${
          multi ? "rounded-md" : "rounded-full"
        } ${active ? "bg-primary" : "border-2 border-border bg-card"}`}
      >
        {active ? <Check size={14} color={checkColor} strokeWidth={3} /> : null}
      </View>
      <Text className="flex-1 text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}

function Section({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      <Text className="mb-2 px-1 font-sans-semibold text-sm text-foreground">
        {title}
        {required ? null : (
          <Text className="text-muted-foreground"> (optional)</Text>
        )}
      </Text>
      {children}
    </View>
  );
}

export default function OnboardingSurveyScreen() {
  const router = useRouter();
  const { survey, setSurvey } = useOnboarding();

  const toggleGoal = (g: string) => {
    setSurvey({
      goals: survey.goals.includes(g)
        ? survey.goals.filter((x) => x !== g)
        : [...survey.goals, g],
    });
  };

  // Survey is best-effort; only the meaningful pieces unlock the button.
  const canContinue =
    !!survey.ageRange && !!survey.faithJourney && survey.goals.length > 0;

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 pb-32 pt-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="font-serif text-3xl font-bold text-foreground">
          A bit about you
        </Text>
        <Text className="mb-8 mt-2 text-sm text-muted-foreground">
          Helps us point you to plans and people that fit. Skip anything that
          doesn’t feel right.
        </Text>

        <Section title="Age range" required>
          <View className="flex-row flex-wrap gap-2">
            {AGE_OPTIONS.map((opt) => (
              <Chip
                key={opt}
                label={opt}
                active={survey.ageRange === opt}
                onPress={() => setSurvey({ ageRange: opt })}
              />
            ))}
          </View>
        </Section>

        <Section title="State">
          <Input
            placeholder="e.g. California"
            value={survey.state}
            onChangeText={(v) => setSurvey({ state: v })}
            autoCapitalize="words"
          />
        </Section>

        <Section title="Education">
          <View className="gap-2">
            {EDU_OPTIONS.map((opt) => (
              <ListOption
                key={opt}
                label={opt}
                active={survey.education === opt}
                onPress={() => setSurvey({ education: opt })}
              />
            ))}
          </View>
        </Section>

        <Section title="Do you have a home church?">
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="Yes"
              active={survey.hasChurch === true}
              onPress={() => setSurvey({ hasChurch: true })}
            />
            <Chip
              label="No"
              active={survey.hasChurch === false}
              onPress={() => setSurvey({ hasChurch: false })}
            />
          </View>
        </Section>

        <Section title="How would you rate your devotional life right now? (1–5)">
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip
                key={n}
                label={String(n)}
                active={survey.devotionalRating === n}
                onPress={() => setSurvey({ devotionalRating: n })}
              />
            ))}
          </View>
        </Section>

        <Section title="Where would you say you are on your faith journey?" required>
          <View className="gap-2">
            {FAITH_OPTIONS.map((opt) => (
              <ListOption
                key={opt}
                label={opt}
                active={survey.faithJourney === opt}
                onPress={() => setSurvey({ faithJourney: opt })}
              />
            ))}
          </View>
        </Section>

        <Section title="What are you hoping IronSharp helps you with? (pick any)" required>
          <View className="gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <ListOption
                key={opt}
                label={opt}
                active={survey.goals.includes(opt)}
                onPress={() => toggleGoal(opt)}
                multi
              />
            ))}
          </View>
        </Section>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
        <Button
          title="Continue"
          disabled={!canContinue}
          onPress={() => router.push("/onboarding/plan")}
        />
      </View>
    </Screen>
  );
}
