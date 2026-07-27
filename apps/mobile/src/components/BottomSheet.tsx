import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/components/useThemeColor";

/**
 * Extra background painted BELOW the sheet's resting edge. The modal container stops
 * short of the physical screen bottom, leaving a band of backdrop showing beneath the
 * sheet. Bleeding the background down — and pulling the layout back up by the same
 * amount — covers that band and the home indicator without moving any content.
 */
const BLEED = 64;

/** Callers set `padding`; the bottom gap is derived so it clears the home indicator. */
const DEFAULT_CONTENT: ViewStyle = { padding: 24, maxHeight: "90%" };

/**
 * A bottom sheet whose dimmed backdrop FADES in while the sheet SLIDES up from the
 * bottom. RN's built-in animationType="slide" slides the backdrop along with the
 * sheet, which reads wrong — this animates them independently. Tapping the backdrop
 * (or Android back) calls onClose; the component stays mounted through the exit
 * animation so the sheet slides back down instead of vanishing.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  contentStyle,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const bg = useThemeColor("background");
  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(visible);
  const backdrop = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current; // 0 = resting, 1 = offscreen
  const screenH = Dimensions.get("window").height;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(slide, { toValue: 1, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [0, screenH] });

  // A caller's own paddingBottom (or its uniform padding) is the resting gap; the home
  // indicator allowance is added on top so the last row never sits under the bar.
  const content = StyleSheet.flatten<ViewStyle>(contentStyle ?? DEFAULT_CONTENT) ?? {};
  const basePad =
    typeof content.paddingBottom === "number"
      ? content.paddingBottom
      : typeof content.padding === "number"
        ? content.padding
        : 0;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", opacity: backdrop }}>
          <Pressable style={{ flex: 1, justifyContent: "flex-end" }} onPress={onClose}>
            <Animated.View style={{ transform: [{ translateY }] }}>
              <Pressable
                onPress={() => {}}
                style={{
                  backgroundColor: bg,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingBottom: BLEED,
                  marginBottom: -BLEED,
                }}
              >
                <View style={[content, { paddingBottom: basePad + insets.bottom }]}>
                  {children}
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
