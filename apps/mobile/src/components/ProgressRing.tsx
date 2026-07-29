import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useThemeColor } from "@/components/useThemeColor";

/**
 * A progress ring — the arc runs around the CIRCUMFERENCE rather than filling a
 * wedge, so it reads as a track being walked rather than a share of a pie.
 *
 * Drawn as a stroked circle whose dash gap is pulled back by the fraction done,
 * rotated a quarter turn so it starts at twelve o'clock.
 */
export function ProgressRing({
  percent,
  size = 68,
  stroke = 6,
}: {
  /** 0–100. Values outside are clamped rather than drawn past the circle. */
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const primary = useThemeColor("primary");
  const track = useThemeColor("muted");

  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={primary}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            // Rounded ends keep a barely-started ring visible as a mark rather
            // than vanishing to nothing.
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>

      {/* Type scales with the ring so the number reads as the centerpiece at a
          large size and still fits at a small one. */}
      <Text
        style={{ fontSize: Math.round(size * 0.23), lineHeight: Math.round(size * 0.27) }}
        className="font-serif font-bold text-foreground"
      >
        {Math.round(clamped)}%
      </Text>
    </View>
  );
}
