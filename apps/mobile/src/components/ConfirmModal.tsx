import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useThemeColor } from "@/components/useThemeColor";

/**
 * A themed confirmation dialog. For high-stakes, irreversible actions pass
 * `confirmPhrase` (e.g. the resource's name) — the confirm button stays
 * disabled until the user types it, so an action can't be triggered by a
 * single mis-tap.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  confirmPhrase,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmPhrase?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const bg = useThemeColor("background");
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const primary = useThemeColor("primary");
  const destructiveColor = useThemeColor("destructive");
  const accent = destructive ? destructiveColor : primary;

  const [typed, setTyped] = useState("");
  // Reset the typed phrase whenever the dialog is dismissed/reopened so a prior
  // confirmation can't carry over to the next target.
  useEffect(() => {
    if (!visible) setTyped("");
  }, [visible]);

  const phraseOk =
    !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.trim().toLowerCase();
  const canConfirm = phraseOk && !busy;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: bg, borderRadius: 16, padding: 22 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: fg, marginBottom: 8 }}>
            {title}
          </Text>
          <Text
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 14,
              color: muted,
              lineHeight: 21,
              marginBottom: confirmPhrase ? 16 : 22,
            }}
          >
            {message}
          </Text>

          {confirmPhrase ? (
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, marginBottom: 6 }}>
                Type <Text style={{ fontFamily: "DMSans_700Bold", color: fg }}>{confirmPhrase}</Text> to confirm.
              </Text>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={confirmPhrase}
                placeholderTextColor={muted}
                style={{
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  color: fg,
                  backgroundColor: card,
                  fontFamily: "DMSans_400Regular",
                  fontSize: 15,
                }}
              />
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
              style={{
                flex: 1,
                height: 46,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: fg, fontFamily: "DMSans_500Medium", fontSize: 15 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={!canConfirm}
              accessibilityRole="button"
              style={{
                flex: 1,
                height: 46,
                borderRadius: 12,
                backgroundColor: accent,
                alignItems: "center",
                justifyContent: "center",
                opacity: canConfirm ? 1 : 0.5,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 }}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
