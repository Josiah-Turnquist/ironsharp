import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useProfile } from "@/lib/queries";
import { ApiClient } from "@/lib/api";

export default function EditProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const profile = useProfile();
  const [name, setName] = useState("");
  const [church, setChurch] = useState("");

  // Prefill once the profile loads.
  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.displayName ?? "");
    setChurch(profile.data.churchName ?? "");
  }, [profile.data]);

  const original = {
    name: profile.data?.displayName ?? "",
    church: profile.data?.churchName ?? "",
  };
  const trimmedName = name.trim();
  const trimmedChurch = church.trim();
  const changed =
    trimmedName !== original.name || trimmedChurch !== (original.church ?? "");

  const save = useMutation({
    mutationFn: () =>
      ApiClient.updateProfile({
        displayName: trimmedName,
        // Send explicit null when blank so the field can be cleared.
        churchName: trimmedChurch || null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile"] });
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert("Couldn’t save profile", err.message || "Please try again.");
    },
  });

  return (
    <Screen edges={["top"]}>
      <Header title="Edit Profile" subtitle="Your info" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="mx-auto w-full max-w-lg gap-4 px-6 py-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Display Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Input
            label="Home Church (optional)"
            placeholder="e.g. Grace Community Church"
            value={church}
            onChangeText={setChurch}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <View className="mt-2">
            <Button
              title="Save"
              disabled={!trimmedName || !changed}
              loading={save.isPending}
              onPress={() => save.mutate()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
