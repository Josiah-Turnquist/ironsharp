import { View, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";

export default function CommunityDevotional() {
  const muted = useThemeColor("muted-foreground");

  return (
    <Screen edges={["top"]}>
      <Header title="Community" subtitle="IronSharp" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <Text className="mb-3 text-center font-serif text-3xl font-bold text-foreground">
          Coming soon.
        </Text>
        <Text style={{ color: muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center", lineHeight: 24 }}>
          The IronSharp community devotional is on its way — one reading, everyone in it together.
        </Text>
      </View>
    </Screen>
  );
}
