import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HeartHandshake,
  Link,
  MoreVertical,
  Plus,
  Sun,
  X,
} from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/ErrorState";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { Button } from "@/components/Button";
import { BottomSheet } from "@/components/BottomSheet";
import { DiscipleChip } from "@/components/DiscipleChip";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/Avatar";
import { useGroups, useDiscipleships, useActiveDevotional } from "@/lib/queries";
import { GROUP_TYPE_CONFIG } from "@/lib/groupTypes";
import {
  ApiClient,
  ApiError,
  type DiscipleshipRelationship,
} from "@/lib/api";


// ─── Section helpers (ported from the former Devotionals tab) ─────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="mb-3 text-sm uppercase tracking-wider text-muted-foreground">
      {label}
    </Text>
  );
}

function Divider() {
  const border = useThemeColor("border");
  return <View style={{ height: 1, backgroundColor: border, marginVertical: 24 }} />;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

// Bottom-sheet modal shared by the edit / join flows. Lifts above the
// keyboard (so inputs aren't hidden), and tapping the dimmed backdrop closes it
// while taps inside the sheet are absorbed by the inner Pressable.
// ─── Discipleship (one-on-one) ────────────────────────────────────────────────

// One-time privacy notice the disciple must accept before the relationship goes
// active and the discipler can see their responses.
function PrivacyNoticeModal({
  visible,
  disciplerName,
  busy,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  disciplerName: string;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const fg = useThemeColor("foreground");
  const muted = useThemeColor("muted-foreground");
  const primary = useThemeColor("primary");
  return (
    <BottomSheet visible={visible} onClose={onDecline}>
      <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: fg, marginBottom: 12 }}>
        A discipleship invite
      </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 15, color: fg, lineHeight: 22, marginBottom: 12 }}>
            {disciplerName} would like to walk with you as your discipler.
          </Text>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, lineHeight: 21, marginBottom: 24 }}>
            If you accept, they'll be able to see your devotional responses for this
            group as you submit them — except any field you mark private, which stays
            private. They may also send you a daily question and write to you in a
            private mailbox. You can decline now, and either of you can end this later.
          </Text>
          <Pressable
            onPress={onAccept}
            disabled={busy}
            style={{ opacity: busy ? 0.5 : 1, backgroundColor: primary, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 }}
          >
            <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 }}>
              {busy ? "Accepting…" : "Accept"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            disabled={busy}
            style={{ height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 14 }}>Decline</Text>
          </Pressable>
    </BottomSheet>
  );
}

// Top-level discipleship hub: lists every relationship (pending + active) with
// its entry points, so active discipleships aren't buried inside an expanded
// group card. Accepting or declining an invite happens right here too.
function DiscipleshipHub({
  relationships,
  onStartOneOnOne,
  accent,
}: {
  relationships: DiscipleshipRelationship[];
  onStartOneOnOne: () => void;
  accent: string;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");
  const [reviewRel, setReviewRel] = useState<DiscipleshipRelationship | null>(null);
  const [busy, setBusy] = useState(false);

  // "ended" relationships shouldn't clutter the hub.
  const live = relationships.filter((r) => r.status !== "ended");

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["discipleship"] }),
      qc.invalidateQueries({ queryKey: ["groups"] }),
    ]);

  const handleAccept = async () => {
    if (!reviewRel) return;
    setBusy(true);
    try {
      await ApiClient.acceptDiscipleship(reviewRel.id);
      await refresh();
      setReviewRel(null);
    } catch (err) {
      Alert.alert("Couldn't accept", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!reviewRel) return;
    setBusy(true);
    try {
      await ApiClient.declineDiscipleship(reviewRel.id);
      await refresh();
      setReviewRel(null);
    } catch (err) {
      Alert.alert("Couldn't decline", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Discipler cancels a pending invite they sent.
  const handleCancelInvite = (rel: DiscipleshipRelationship) => {
    Alert.alert("Cancel invite", `Cancel your discipleship invite to ${rel.counterpart.displayName}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel invite",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiClient.declineDiscipleship(rel.id);
            await refresh();
          } catch (err) {
            Alert.alert("Couldn't cancel", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View>
      <SectionLabel label="Discipleship" />
      {live.length === 0 ? (
        <View style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 16 }}>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, lineHeight: 21, marginBottom: 14 }}>
            Walk with one person, one-on-one — see each other's responses, send a daily question, and
            message privately. Start by creating a one-on-one group together.
          </Text>
          <Button title="Start a one-on-one" variant="outline" onPress={onStartOneOnOne} />
        </View>
      ) : (
        live.map((rel) => {
          const isDiscipler = rel.role === "discipler";

          // Pending: not yet a live relationship — review/accept or wait here.
          if (rel.status === "pending") {
            return (
              <View
                key={rel.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 12, marginBottom: 8 }}
              >
                <Avatar name={rel.counterpart.displayName} url={rel.counterpart.avatarUrl} accent={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 15, color: fg }} numberOfLines={1}>
                    {rel.counterpart.displayName}
                  </Text>
                  <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted }}>
                    {isDiscipler ? "Invite pending" : "Invited you to disciple"}
                  </Text>
                </View>
                {isDiscipler ? (
                  <Pressable
                    onPress={() => handleCancelInvite(rel)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel invite"
                    style={{ paddingHorizontal: 6, paddingVertical: 6 }}
                  >
                    <Text style={{ fontFamily: "DMSans_500Medium", fontSize: 13, color: muted }}>Cancel</Text>
                  </Pressable>
                ) : (
                  <DiscipleChip icon={HeartHandshake} label="Review" color={accent} onPress={() => setReviewRel(rel)} />
                )}
              </View>
            );
          }

          // Active: the whole card opens the one relationship screen.
          return (
            <Pressable
              key={rel.id}
              onPress={() => router.push(`/discipleship/${rel.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open discipleship with ${rel.counterpart.displayName}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card, padding: 12, marginBottom: 8 }}
            >
              <Avatar name={rel.counterpart.displayName} url={rel.counterpart.avatarUrl} accent={accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 15, color: fg }} numberOfLines={1}>
                  {rel.counterpart.displayName}
                </Text>
                <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 12, color: muted }}>
                  {isDiscipler ? "You're discipling them" : "Your discipler"}
                </Text>
              </View>
              {rel.unreadCount > 0 ? (
                <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 11 }}>{rel.unreadCount}</Text>
                </View>
              ) : null}
              <ChevronRight size={18} color={muted} />
            </Pressable>
          );
        })
      )}

      <PrivacyNoticeModal
        visible={!!reviewRel}
        disciplerName={reviewRel?.counterpart.displayName ?? "Someone"}
        busy={busy}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const groups = useGroups();
  const discipleships = useDiscipleships();
  const { data: activeDevo } = useActiveDevotional();
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const fg = useThemeColor("foreground");

  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["progress", "active"] }),
      qc.invalidateQueries({ queryKey: ["groups"] }),
    ]);
    setRefreshing(false);
  };

  // Join by code
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Entry point for starting discipleship from the hub: opens the unified
  // create flow pre-set to a one-on-one group.
  const startOneOnOne = () => router.push("/plans/new?type=one-on-one");

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const { group } = await ApiClient.joinGroupByCode(joinCode.trim());
      await qc.invalidateQueries({ queryKey: ["groups"] });
      setShowJoin(false);
      setJoinCode("");
      toast.show(`Joined ${group.name}`);
    } catch (err) {
      Alert.alert(
        "Could not join",
        err instanceof ApiError && err.status === 404
          ? "That code doesn't match any group. Double-check and try again."
          : err instanceof ApiError && err.status === 409
            ? "You're already in this group."
            : "Something went wrong. Please try again."
      );
    } finally {
      setJoining(false);
    }
  };

  const groupList = groups.data ?? [];

  return (
    <Screen edges={["top"]}>
        <ScrollView
          ref={scrollRef}
          contentContainerClassName="mx-auto w-full max-w-lg px-6 py-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />
          }
        >
          <ScreenHeader
            eyebrow="Read together"
            title="Plans"
            right={
              <Pressable
                onPress={() => setMenuOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="More options"
                className="h-9 w-9 items-center justify-center rounded-full active:bg-muted/40"
              >
                <MoreVertical size={22} color={fg} />
              </Pressable>
            }
          />

          {/* ── My Plan (personal) — the tab is named Plans; personal plans live
                 here too, and the library stays reachable while one is active. */}
          <SectionLabel label="My Plan" />
          {activeDevo ? (
            <>
              <Pressable
                onPress={() => router.push(`/devotional/${activeDevo.planId}`)}
                accessibilityRole="button"
                accessibilityLabel={`Continue ${activeDevo.planTitle}`}
                style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card }}
                className="px-4 py-4"
              >
                <View className="flex-row items-center gap-2">
                  <Sun size={16} color={primary} />
                  <Text className="flex-1 font-serif text-lg font-bold text-foreground" numberOfLines={2}>
                    {activeDevo.planTitle}
                  </Text>
                </View>
                <Text className="mt-1 text-sm text-muted-foreground">
                  Day {activeDevo.currentDay} of {activeDevo.totalDays}
                  {activeDevo.chapter ? ` · ${activeDevo.chapter}` : ""}
                </Text>
                <View className="mt-2 flex-row items-center gap-2">
                  {activeDevo.doneToday ? (
                    <>
                      <CheckCircle2 size={16} color={primary} />
                      <Text style={{ color: muted }} className="text-sm font-sans-medium">Done for today</Text>
                    </>
                  ) : (
                    <>
                      <BookOpen size={16} color={primary} />
                      <Text style={{ color: primary }} className="text-sm font-sans-medium">Continue Reading →</Text>
                    </>
                  )}
                </View>
              </Pressable>
              <Pressable
                onPress={() => router.push("/plans")}
                accessibilityRole="button"
                className="mt-2 self-start py-1"
              >
                <Text style={{ color: primary }} className="text-sm font-semibold">Browse the plan library →</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => router.push("/plans")}
              accessibilityRole="button"
              accessibilityLabel="Browse the plan library"
              style={{ borderWidth: 1, borderColor: withAlpha(primary, 0.5), borderStyle: "dashed", borderRadius: 12 }}
              className="items-center px-4 py-5"
            >
              <Text style={{ color: primary }} className="font-sans-semibold text-base">Start a personal plan</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">Browse the library or create your own</Text>
            </Pressable>
          )}

          <Divider />

          {/* ── Discipleship ───────────────────────────────────────────────────── */}
          <DiscipleshipHub
            relationships={discipleships.data ?? []}
            onStartOneOnOne={startOneOnOne}
            accent={primary}
          />

          <Divider />

          {/* ── Groups ─────────────────────────────────────────────────────────── */}
          <SectionLabel label="Groups" />

          {groups.isLoading ? (
            <ActivityIndicator color={primary} />
          ) : groups.isError ? (
            <ErrorState
              message="We couldn't load your groups. Check your connection and try again."
              onRetry={() => groups.refetch()}
            />
          ) : groupList.length === 0 ? (
            <View className="items-center px-4 py-6">
              <Text className="mb-1 font-serif text-xl font-bold text-foreground">No groups yet</Text>
              <Text className="mb-6 text-center text-sm text-muted-foreground">
                Walk through the Word with others — start a group or join one.
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => router.push("/plans/new")}
                  className="h-11 items-center justify-center rounded-xl bg-primary px-6"
                >
                  <Text className="text-sm font-semibold text-primary-foreground">New Plan/Group</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowJoin(true)}
                  style={{ borderWidth: 1, borderColor: border }}
                  className="h-11 items-center justify-center rounded-xl px-6"
                >
                  <Text style={{ color: fg }} className="text-sm font-semibold">Join with Code</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
          <View style={{ gap: 8 }}>
            {groupList.map((group) => {
            const config = GROUP_TYPE_CONFIG[group.groupType] ?? { label: group.groupType, color: primary };
            const doneCount = group.members.filter((m) => m.doneToday).length;

            return (
              <View
                key={group.id}
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: border,
                  backgroundColor: card,
                }}
              >
                {/* The whole card is the door to the group's page, where the
                    members, the reading, and the settings now live. */}
                <Pressable
                  onPress={() => router.push(`/groups/${group.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${group.name}`}
                  className="flex-row items-center gap-3 px-3 py-5 active:bg-muted/20"
                >
                  {/* Type indicator — thin bar in the group's type color */}
                  <View style={{ width: 3, height: 40, borderRadius: 2, backgroundColor: config.color }} />

                  <View className="flex-1">
                    <Text className="font-serif text-lg font-bold text-foreground">
                      {group.name}
                    </Text>
                    <Text className="mt-0.5 text-sm text-muted-foreground">
                      {/* Type is conveyed by the bar's color; lead with progress instead */}
                      {group.plan ? `Day ${group.currentDay} of ${group.plan.totalDays}` : "No plan yet"}
                      {group.plan?.chapter ? ` · ${group.plan.chapter}` : ""}
                      {` · ${doneCount}/${group.members.length} today`}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={muted} />
                </Pressable>
              </View>
            );
            })}
          </View>

          {/* Footer actions */}
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <Pressable
              onPress={() => router.push("/plans/new")}
              className="flex-row items-center gap-1.5 py-3"
            >
              <Plus size={15} color={primary} />
              <Text style={{ color: primary }} className="text-sm font-semibold">New Plan/Group</Text>
            </Pressable>
            <Text style={{ color: border }}>·</Text>
            <Pressable
              onPress={() => setShowJoin(true)}
              className="flex-row items-center gap-1.5 py-3"
            >
              <Link size={15} color={primary} />
              <Text style={{ color: primary }} className="text-sm font-semibold">Join with code</Text>
            </Pressable>
          </View>
            </>
          )}
        </ScrollView>

      {/* ── Join by code sheet ─────────────────────────────────────────────── */}
      <BottomSheet visible={showJoin} onClose={() => !joining && setShowJoin(false)}>
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-serif text-xl font-bold text-foreground">Join a Group</Text>
              <Pressable
                onPress={() => setShowJoin(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={muted} />
              </Pressable>
            </View>

            <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 14, color: muted, marginBottom: 16 }}>
              Enter the invite code shared with you.
            </Text>

            <TextInput
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="e.g. AB12CD"
              placeholderTextColor={muted}
              autoCapitalize="characters"
              style={{
                borderWidth: 1, borderColor: border, borderRadius: 10,
                padding: 14, color: fg, backgroundColor: card,
                marginBottom: 20, fontSize: 22, fontFamily: "DMSans_700Bold",
                // Space out the typed code for readability, but keep the empty
                // placeholder at normal spacing (letterSpacing also spreads the
                // placeholder, which made "e.g. AB12CD" look broken).
                letterSpacing: joinCode ? 4 : 0, textAlign: "center",
              }}
            />

            <Button
              title="Join Group"
              onPress={handleJoin}
              disabled={!joinCode.trim()}
              loading={joining}
            />
      </BottomSheet>

      {/* ── Overflow (⋮) menu ──────────────────────────────────────────────── */}
      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-serif text-xl font-bold text-foreground">Menu</Text>
          <Pressable
            onPress={() => setMenuOpen(false)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={muted} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setMenuOpen(false);
            router.push("/plans/past-groups");
          }}
          className="flex-row items-center gap-3 rounded-xl px-1 py-4 active:bg-muted/40"
        >
          <Archive size={20} color={primary} />
          <Text className="flex-1 text-base text-foreground">Past groups</Text>
          <ChevronRight size={18} color={muted} />
        </Pressable>
        <Pressable
          onPress={() => {
            setMenuOpen(false);
            router.push("/plans/completed");
          }}
          className="flex-row items-center gap-3 rounded-xl px-1 py-4 active:bg-muted/40"
        >
          <CheckCircle2 size={20} color={primary} />
          <Text className="flex-1 text-base text-foreground">Completed plans</Text>
          <ChevronRight size={18} color={muted} />
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}
