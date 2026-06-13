import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { authClient } from "@/lib/auth-client";

/**
 * Deep-link target for the password-reset email.
 *
 * `forgot-password.tsx` calls requestPasswordReset with redirectTo
 * "ironsharp://reset-password", so Neon Auth's email links here with the
 * one-time `token` as a query param. We collect a new password and finish the
 * reset. Without this screen the email link had nowhere to land.
 */
export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[]; error?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const linkInvalid = !token || !!error;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", "Please re-enter your new password.");
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (resetError) {
        Alert.alert(
          "Couldn't reset password",
          resetError.message ?? "Your reset link may have expired. Request a new one."
        );
        return;
      }
      Alert.alert("Password updated", "You can now log in with your new password.");
      router.replace("/(auth)/login");
    } catch (err) {
      Alert.alert(
        "Couldn't reset password",
        err instanceof Error ? err.message : "Your reset link may have expired. Request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen center className="px-8">
      <Text className="mb-2 font-serif text-3xl font-bold text-foreground">New Password</Text>

      {linkInvalid ? (
        <>
          <Text className="mb-8 max-w-xs text-center text-sm text-muted-foreground">
            This reset link is invalid or has expired. Request a fresh one and try again.
          </Text>
          <Link href="/(auth)/forgot-password" className="text-sm text-primary">
            Request a new link
          </Link>
        </>
      ) : (
        <>
          <Text className="mb-8 max-w-xs text-center text-sm text-muted-foreground">
            Choose a new password for your account.
          </Text>
          <View className="w-full max-w-sm gap-4">
            <Input
              label="New Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              autoCapitalize="none"
            />
            <Input
              label="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="password-new"
              autoCapitalize="none"
            />
            <Button title="Update Password" loading={loading} onPress={handleReset} />
          </View>
          <Link href="/(auth)/login" className="mt-6 text-sm text-primary">
            Back to log in
          </Link>
        </>
      )}
    </Screen>
  );
}
