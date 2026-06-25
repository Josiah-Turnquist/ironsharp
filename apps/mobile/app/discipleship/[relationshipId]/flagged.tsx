import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { useFlaggedResponses } from "@/lib/queries";
import { ApiClient, type QuestionType, type FlaggedResponse } from "@/lib/api";

const TYPE_LABEL: Record<QuestionType, string> = {
  q1: "Reflect",
  q2: "Act",
  q3: "Question",
  praise: "Prayer & Praise",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function FlaggedNotesScreen() {
  const { relationshipId } = useLocalSearchParams<{ relationshipId: string }>();
  const id = String(relationshipId);
  const qc = useQueryClient();
  const flags = useFlaggedResponses(id);
  const [unflagging, setUnflagging] = useState<string | null>(null);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");

  const unflag = async (f: FlaggedResponse) => {
    const key = `${f.responseId}-${f.questionType}`;
    setUnflagging(key);
    try {
      await ApiClient.unflagResponse(id, f.responseId, f.questionType);
      await qc.invalidateQueries({ queryKey: ["discipleship", id, "flags"] });
      await qc.invalidateQueries({ queryKey: ["discipleship", id, "responses"] });
    } catch {
      /* leave it flagged; the list will reflect the true state on next load */
    } finally {
      setUnflagging(null);
    }
  };

  return (
    <Screen edges={["top"]}>
      <Header title="Flagged Notes" subtitle="Discipleship" />
      {flags.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      ) : flags.isError ? (
        <ErrorState message="We couldn't load flagged notes." onRetry={() => flags.refetch()} />
      ) : (flags.data ?? []).length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center" }}>
            Nothing flagged yet. Flag a response to keep it here for later.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4" showsVerticalScrollIndicator={false}>
          {(flags.data ?? []).map((f) => {
            const key = `${f.responseId}-${f.questionType}`;
            return (
              <View key={key} style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 14, marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, color: muted, flex: 1 }}>
                    {formatDate(f.submittedAt)} · {TYPE_LABEL[f.questionType]}
                    {f.chapter ? ` · ${f.chapter}` : ""}
                  </Text>
                  <Pressable
                    onPress={() => unflag(f)}
                    disabled={unflagging === key}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Remove flag"
                    style={{ opacity: unflagging === key ? 0.4 : 1 }}
                  >
                    <Flag size={16} color={primary} fill={primary} />
                  </Pressable>
                </View>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: fg, lineHeight: 22 }}>
                  {f.text ?? "—"}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
