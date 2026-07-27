import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { withAlpha } from "@/theme/themes";

/**
 * Small tinted action chip used by the discipleship surfaces — the hub on the
 * Groups tab and the per-group invite on a group's page.
 */
export function DiscipleChip({
  icon: Icon,
  label,
  color,
  badge,
  onPress,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  color: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: color, borderRadius: 8, backgroundColor: withAlpha(color, 0.12) }}
      className="flex-row items-center gap-1.5 px-3 py-2"
    >
      <Icon size={13} color={color} />
      <Text style={{ color, fontFamily: "DMSans_500Medium", fontSize: 12 }}>{label}</Text>
      {badge && badge > 0 ? (
        <View style={{ minWidth: 16, height: 16, borderRadius: 8, backgroundColor: color, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 10 }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
