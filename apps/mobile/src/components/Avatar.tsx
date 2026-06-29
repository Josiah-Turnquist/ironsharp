import { Image, Text, View } from "react-native";
import { withAlpha } from "@/theme/themes";

/** A circular avatar — the user's photo, or their initial on a tinted disc. */
export function Avatar({
  name,
  url,
  accent,
  size = 40,
}: {
  name: string;
  url?: string | null;
  accent: string;
  size?: number;
}) {
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: withAlpha(accent, 0.15),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: "DMSans_700Bold", fontSize: size * 0.4, color: accent }}>
        {name[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}
