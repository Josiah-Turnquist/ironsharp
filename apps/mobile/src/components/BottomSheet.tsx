import { type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable } from "react-native";
import { useThemeColor } from "@/components/useThemeColor";

// Bottom-sheet modal shared across flows that need a slide-up sheet. Lifts
// above the keyboard (so inputs aren't hidden), and tapping the dimmed
// backdrop closes it while taps inside the sheet are absorbed by the inner
// Pressable.
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const bg = useThemeColor("background");
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={onClose}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: bg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 40,
              maxHeight: "90%",
            }}
          >
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
