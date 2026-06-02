import { useEffect, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Info } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { useThemeColor } from "@/components/useThemeColor";

const STORAGE_KEY = "notification-prefs";

type Prefs = {
  morningReminder: boolean;
  partnerDone: boolean;
  dailyNudge: boolean;
  groupComplete: boolean;
};

const DEFAULTS: Prefs = {
  morningReminder: true,
  partnerDone: true,
  dailyNudge: true,
  groupComplete: true,
};

const ROWS: Array<{ key: keyof Prefs; label: string; hint: string }> = [
  {
    key: "morningReminder",
    label: "Morning reminder",
    hint: "A gentle nudge to do your devotional first thing.",
  },
  {
    key: "partnerDone",
    label: "Partner finished",
    hint: "Get notified when your accountability partner completes their day.",
  },
  {
    key: "dailyNudge",
    label: "Daily nudge",
    hint: "An afternoon nudge if you haven’t finished yet.",
  },
  {
    key: "groupComplete",
    label: "Group complete",
    hint: "Pinged when everyone in your group has submitted.",
  },
];

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<Prefs>;
            setPrefs({ ...DEFAULTS, ...parsed });
          } catch {
            // ignore malformed payload
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const toggle = (key: keyof Prefs) => (value: boolean) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <Screen edges={["top"]}>
      <Header title="Notifications" subtitle="What we ping you about" />
      <ScrollView
        contentContainerClassName="mx-auto w-full max-w-lg px-6 py-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row items-start gap-2 rounded-xl border border-border bg-muted/40 p-3">
          <Info size={16} color={muted} />
          <Text className="flex-1 text-xs leading-snug text-muted-foreground">
            Push notifications aren’t wired up yet — your choices here will
            apply automatically once they are.
          </Text>
        </View>

        <View className="overflow-hidden rounded-xl border border-border bg-card">
          {ROWS.map((row, i) => (
            <View
              key={row.key}
              className={`flex-row items-center gap-3 p-4 ${
                i < ROWS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <View className="flex-1">
                <Text className="font-sans-medium text-base text-foreground">
                  {row.label}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {row.hint}
                </Text>
              </View>
              <Switch
                value={prefs[row.key]}
                onValueChange={toggle(row.key)}
                disabled={!loaded}
                trackColor={{ true: primary, false: "#9994" }}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
