import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Share, Text, TextInput, View } from "react-native";
import { Link, UserPlus } from "lucide-react-native";
import { withAlpha } from "@/theme/themes";
import { useToast } from "@/components/Toast";
import { ApiClient, ApiError, type UserSearchResult } from "@/lib/api";

/** The group's invite code with a system-share affordance. */
export function InviteCodeRow({
  inviteCode,
  accent,
  muted,
  border,
  card,
}: {
  inviteCode: string;
  accent: string;
  muted: string;
  border: string;
  card: string;
}) {
  const shareCode = () =>
    Share.share({
      message: `Join my IronSharp group — enter code ${inviteCode} in the app.`,
    });

  return (
    <View>
      <Text
        style={{
          fontFamily: "DMSans_700Bold",
          fontSize: 12,
          color: muted,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Invite Code
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: card,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 10,
        }}
      >
        <Text
          selectable
          style={{
            flex: 1,
            fontFamily: "DMSans_700Bold",
            fontSize: 22,
            letterSpacing: 4,
            color: accent,
          }}
        >
          {inviteCode}
        </Text>
        <Pressable
          onPress={shareCode}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Share invite code"
        >
          <Link size={18} color={muted} />
        </Pressable>
      </View>
      <Text
        style={{
          fontFamily: "DMSans_400Regular",
          fontSize: 12,
          color: muted,
          marginTop: 6,
        }}
      >
        Share this code or tap the link icon to send it.
      </Text>
    </View>
  );
}

/** Debounced user search to add people to a group. */
export function MemberSearch({
  groupId,
  existingUserIds,
  accent,
  muted,
  border,
  card,
  bg,
  fg,
  onAdded,
}: {
  groupId: string;
  existingUserIds: Set<string>;
  accent: string;
  muted: string;
  border: string;
  card: string;
  bg: string;
  fg: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const toast = useToast();

  const term = query.trim();

  // Deliberately NOT keyed on existingUserIds. The group refetches in the
  // background and hands down a freshly built Set each time, which restarts the
  // countdown below — on a group that refreshes faster than the delay, the
  // search never fires at all. Who is already a member is a filter on what came
  // back, so it belongs in render rather than in here.
  useEffect(() => {
    if (term.length < 2) { setResults([]); setFailed(false); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      setFailed(false);
      try {
        const { users } = await ApiClient.searchUsers(term);
        if (!cancelled) setResults(users);
      } catch {
        // Failing to an empty list reads as "nobody by that name", which sends
        // someone hunting for a person who is right there. Say so instead.
        if (!cancelled) { setResults([]); setFailed(true); }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [term]);

  const matches = results.filter((u) => !existingUserIds.has(u.userId));
  const empty = term.length >= 2 && !searching && !failed && matches.length === 0;

  const handleAdd = async (userId: string) => {
    const name = results.find((u) => u.userId === userId)?.displayName ?? "them";
    setAdding(userId);
    try {
      await ApiClient.addGroupMember(groupId, userId);
      setResults((prev) => prev.filter((u) => u.userId !== userId));
      onAdded();
      toast.show(`Added ${name}`);
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "Could not add member.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <View>
      <Text
        style={{
          fontFamily: "DMSans_700Bold",
          fontSize: 12,
          color: muted,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Add People
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name…"
        placeholderTextColor={muted}
        style={{
          borderWidth: 1,
          borderColor: border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: fg,
          backgroundColor: bg,
          fontSize: 14,
          fontFamily: "DMSans_400Regular",
          marginBottom: 8,
        }}
      />
      {/* One dropdown anchored under the field, rather than a stack of loose
          cards — and it always says something, so a search that found nothing
          and a search that failed never look like a dead control. */}
      {searching || failed || empty || matches.length > 0 ? (
      <View
        style={{
          borderWidth: 1,
          borderColor: border,
          borderRadius: 10,
          backgroundColor: card,
          overflow: "hidden",
        }}
      >
      {searching ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }}>
          <ActivityIndicator size="small" color={accent} />
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted }}>
            Searching…
          </Text>
        </View>
      ) : failed ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, padding: 12 }}>
          Couldn&apos;t search just now. Check your connection and try again.
        </Text>
      ) : empty ? (
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, padding: 12 }}>
          No one by that name.
        </Text>
      ) : (
      matches.map((user, i) => (
        <View
          key={user.userId}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            gap: 10,
            // Hairlines between rows, never above the first — the panel's own
            // border already draws that edge.
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: border,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: withAlpha(accent, 0.13),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={{ width: 32, height: 32 }} />
            ) : (
              <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 13, color: accent }}>
                {user.displayName[0]?.toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={{ flex: 1, fontFamily: "DMSans_400Regular", fontSize: 14, color: fg }}>
            {user.displayName}
          </Text>
          <Pressable
            onPress={() => handleAdd(user.userId)}
            disabled={adding === user.userId}
            style={{ opacity: adding === user.userId ? 0.5 : 1 }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${user.displayName} to group`}
          >
            {adding === user.userId ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <UserPlus size={18} color={accent} />
            )}
          </Pressable>
        </View>
      ))
      )}
      </View>
      ) : null}
    </View>
  );
}
