import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Flame } from "lucide-react-native";

type Props = {
  streak: number;
  size?: number;
};

// Fire palette — warm regardless of theme primary, since a flame should read
// as a flame. Outer body is orange, the hot core is yellow, the halo amber.
const OUTER = "#F97316"; // orange-500
const CORE = "#FACC15"; // yellow-400
const GLOW = "#FB923C"; // orange-400

/**
 * The streak indicator, animated to flicker like a real flame. Three loops run
 * on the UI thread at deliberately mismatched durations so the motion never
 * settles into an obvious cycle:
 *   • the outer flame stretches/squashes and sways from its base (it licks up)
 *   • the inner core flickers faster and pulses brightness (heat shimmer)
 *   • a soft halo breathes behind it
 * The count rides on top, held steady and shadowed so it stays readable.
 */
export function StreakFlame({ streak, size = 32 }: Props) {
  const stretch = useSharedValue(1); // outer scaleY
  const sway = useSharedValue(0); // outer rotation (deg)
  const coreScale = useSharedValue(1); // inner core scaleY
  const coreOpacity = useSharedValue(0.9);
  const glowOpacity = useSharedValue(0.3);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);

    // Outer body: irregular vertical lick, restarting each loop (directional).
    stretch.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 230, easing: ease }),
        withTiming(0.94, { duration: 190, easing: ease }),
        withTiming(1.05, { duration: 250, easing: ease }),
        withTiming(0.985, { duration: 210, easing: ease })
      ),
      -1,
      false
    );

    // Gentle side-to-side sway, ping-ponged.
    sway.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 300, easing: ease }),
        withTiming(-2.5, { duration: 340, easing: ease }),
        withTiming(1.5, { duration: 280, easing: ease })
      ),
      -1,
      true
    );

    // Hot core: faster, twitchier flicker.
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 130, easing: ease }),
        withTiming(0.86, { duration: 110, easing: ease }),
        withTiming(1.12, { duration: 150, easing: ease }),
        withTiming(0.95, { duration: 120, easing: ease })
      ),
      -1,
      false
    );
    coreOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.55, { duration: 120 }),
        withTiming(0.85, { duration: 140 })
      ),
      -1,
      true
    );

    // Halo breathing — slow, out of phase with everything else.
    glowOpacity.value = withRepeat(withTiming(0.5, { duration: 850, easing: ease }), -1, true);
    glowScale.value = withRepeat(withTiming(1.25, { duration: 1050, easing: ease }), -1, true);
  }, [coreOpacity, coreScale, glowOpacity, glowScale, stretch, sway]);

  // Stretch up from the base: scale vertically, counter-squash horizontally to
  // preserve volume, and shift up by half the growth so the base stays planted.
  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -(stretch.value - 1) * size * 0.5 },
      { scaleX: 1 + (1 - stretch.value) * 0.5 },
      { scaleY: stretch.value },
      { rotate: `${sway.value}deg` },
    ],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
    transform: [
      { translateY: -(coreScale.value - 1) * size * 0.35 },
      { scaleX: 1 + (1 - coreScale.value) * 0.5 },
      { scaleY: coreScale.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const coreSize = size * 0.62;
  const fontSize = streak > 99 ? size * 0.25 : streak > 9 ? size * 0.31 : size * 0.375;

  return (
    <View
      accessible
      accessibilityLabel={`${streak} day streak`}
      style={{ width: size, height: size + 4, alignItems: "center", justifyContent: "center" }}
    >
      {/* Warm halo */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View
          style={[
            {
              width: size * 0.82,
              height: size * 0.82,
              borderRadius: size,
              backgroundColor: GLOW,
            },
            glowStyle,
          ]}
        />
      </View>

      {/* Outer flame body */}
      <Animated.View style={outerStyle}>
        <Flame size={size} color={OUTER} fill={OUTER} strokeWidth={1.5} />
      </Animated.View>

      {/* Hot inner core, nudged into the lower body */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View style={[{ marginTop: size * 0.2 }, coreStyle]}>
          <Flame size={coreSize} color={CORE} fill={CORE} strokeWidth={0} />
        </Animated.View>
      </View>

      {/* Streak count */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "flex-end", paddingBottom: size * 0.13 }]}
      >
        <Text
          style={{
            fontFamily: "DMSans_700Bold",
            fontSize,
            color: "#fff",
            textShadowColor: "rgba(67,20,7,0.95)",
            textShadowOffset: { width: 0, height: 0.5 },
            textShadowRadius: 2.5,
          }}
        >
          {streak}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
