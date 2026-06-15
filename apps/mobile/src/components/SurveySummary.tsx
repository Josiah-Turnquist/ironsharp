import { Text, View } from "react-native";
import type { Profile } from "@/lib/api";

/**
 * Read-only recap of the onboarding survey, shown on Profile so the answers the
 * user gave aren't write-only. Renders only the fields they actually filled in;
 * returns null if there's nothing to show. Stored values are already
 * display-ready labels (see app/onboarding/survey.tsx option lists).
 */
export function SurveySummary({ p }: { p: Profile }) {
  const location = [p.surveyCity, p.surveyState].filter(Boolean).join(", ");
  const church = p.surveyChurchName
    ? p.surveyChurchName
    : p.surveyHasChurch === true
      ? "Attends a church"
      : p.surveyHasChurch === false
        ? "Not currently"
        : null;
  const kids = p.surveyHasKids === true ? "Yes" : p.surveyHasKids === false ? "No" : null;

  const raw: [string, string | null][] = [
    ["Age", p.surveyAgeRange],
    ["Gender", p.surveyGender],
    ["Location", location || null],
    ["Education", p.surveyEducation],
    ["Church", church],
    ["Relationship", p.surveyRelationshipStatus],
    ["Kids", kids],
    ["Faith journey", p.surveyFaithJourney],
  ];
  const rows = raw.filter((r): r is [string, string] => !!r[1]);
  const goals = p.surveyGoals ?? [];

  if (rows.length === 0 && goals.length === 0) return null;

  return (
    <View className="mt-6">
      <Text className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">About You</Text>
      <View className="overflow-hidden rounded-xl border border-border bg-card">
        {rows.map(([label, value], i) => (
          <View
            key={label}
            className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
          >
            <Text className="text-sm text-muted-foreground">{label}</Text>
            <Text className="flex-1 text-right text-sm font-sans-medium text-foreground" numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
        {goals.length > 0 ? (
          <View className={`px-4 py-3 ${rows.length > 0 ? "border-t border-border" : ""}`}>
            <Text className="mb-2 text-sm text-muted-foreground">Goals</Text>
            <View className="flex-row flex-wrap gap-2">
              {goals.map((g) => (
                <View key={g} className="rounded-full bg-muted px-3 py-1">
                  <Text className="text-xs font-sans-medium text-muted-foreground">{g}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
