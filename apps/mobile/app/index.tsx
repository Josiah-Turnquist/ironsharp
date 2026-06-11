import { ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { Screen } from "@/components/Screen";
import { useAuthed, useProfile } from "@/lib/queries";
import { useThemeColor } from "@/components/useThemeColor";

/**
 * Entry gate (mirrors the old web ProtectedRoute + AppLayout):
 *  - no session            → auth flow
 *  - session, no survey    → onboarding
 *  - session + survey done → main app
 */
export default function Index() {
  const { authed, isPending } = useAuthed();
  const profile = useProfile();
  const spinner = useThemeColor("primary");

  if (isPending || (authed && profile.isLoading)) {
    return (
      <Screen center>
        <ActivityIndicator color={spinner} />
      </Screen>
    );
  }

  if (!authed) return <Redirect href="/(auth)/welcome" />;

  // If the profile fetch failed (server unreachable), don't send to onboarding —
  // keep showing the spinner until it resolves or the user reloads.
  if (profile.isError) {
    return (
      <Screen center>
        <ActivityIndicator color={spinner} />
      </Screen>
    );
  }

  const onboarded = !!profile.data?.surveyCompletedAt;
  return <Redirect href={onboarded ? "/(tabs)/home" : "/onboarding/role"} />;
}
