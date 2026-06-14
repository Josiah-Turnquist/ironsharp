import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
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
 * The streak indicator, animated to flicker like a real flame. Built on the
 * core React Native Animated API (native driver) — deliberately NOT Reanimated,
 * so it carries no worklet/Babel-plugin dependency and can ship safely over OTA.
 * Three loops run at mismatched durations so the motion never looks cyclic:
 *   • the outer body stretches/squashes and sways from its base (it licks up)
 *   • the inner core flickers faster and pulses brightness (heat shimmer)
 *   • a soft halo breathes behind it
 * The count rides on top, held steady and shadowed so it stays readable.
 */
export function StreakFlame({ streak, size = 32 }: Props) {
  const stretch = useRef(new Animated.Value(1)).current; // outer scaleY
  const sway = useRef(new Animated.Value(0)).current; // -1..1 → rotation
  const core = useRef(new Animated.Value(1)).current; // inner core scaleY
  const coreOpacity = useRef(new Animated.Value(0.9)).current;
  const glow = useRef(new Animated.Value(0)).current; // 0..1 → halo opacity+scale

  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    const loop = (value: Animated.Value, frames: [number, number][]) =>
      Animated.loop(
        Animated.sequence(
          frames.map(([toValue, duration]) =>
            Animated.timing(value, { toValue, duration, easing: ease, useNativeDriver: true })
          )
        )
      );

    const anims = [
      loop(stretch, [[1.1, 230], [0.94, 190], [1.05, 250], [0.985, 210]]),
      loop(sway, [[1, 300], [-1, 340], [0.5, 280], [0, 260]]),
      loop(core, [[1.22, 130], [0.86, 110], [1.12, 150], [0.95, 120]]),
      loop(coreOpacity, [[1, 150], [0.55, 120], [0.85, 140]]),
      loop(glow, [[1, 900], [0, 1050]]),
    ];
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [core, coreOpacity, glow, stretch, sway]);

  // Stretch up from the base: scale vertically, counter-squash horizontally to
  // preserve volume, and shift up by half the growth so the base stays planted.
  const outerTranslateY = stretch.interpolate({
    inputRange: [0.94, 1.1],
    outputRange: [size * 0.03, -size * 0.05],
  });
  const outerScaleX = stretch.interpolate({ inputRange: [0.94, 1.1], outputRange: [1.03, 0.95] });
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-2.5deg", "3deg"] });

  const coreTranslateY = core.interpolate({
    inputRange: [0.86, 1.22],
    outputRange: [size * 0.05, -size * 0.08],
  });
  const coreScaleX = core.interpolate({ inputRange: [0.86, 1.22], outputRange: [1.07, 0.89] });

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.5] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });

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
          style={{
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: size,
            backgroundColor: GLOW,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />
      </View>

      {/* Outer flame body */}
      <Animated.View
        style={{
          transform: [
            { translateY: outerTranslateY },
            { scaleX: outerScaleX },
            { scaleY: stretch },
            { rotate },
          ],
        }}
      >
        <Flame size={size} color={OUTER} fill={OUTER} strokeWidth={1.5} />
      </Animated.View>

      {/* Hot inner core, nudged into the lower body */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <Animated.View
          style={{
            marginTop: size * 0.2,
            opacity: coreOpacity,
            transform: [{ translateY: coreTranslateY }, { scaleX: coreScaleX }, { scaleY: core }],
          }}
        >
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
