import { useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, Check, CheckCircle2, HeartHandshake, LogOut, Settings, Trash2, Users, X } from "lucide-react-native";
import { Avatar } from "@/components/Avatar";
import { Screen } from "@/components/Screen";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ErrorState } from "@/components/ErrorState";
import { BottomSheet } from "@/components/BottomSheet";
import { DiscipleChip } from "@/components/DiscipleChip";
import { useToast } from "@/components/Toast";
import { InviteCodeRow, MemberSearch } from "@/components/GroupInvite";
import { useThemeColor } from "@/components/useThemeColor";
import { withAlpha } from "@/theme/themes";
import { useGroups, useDiscipleships, useProfile, useDay } from "@/lib/queries";
import { useLocalDoneToday } from "@/lib/useLocalDoneToday";
import { getDailyVerse } from "@/lib/doneVerse";
import { GROUP_TYPE_CONFIG, groupReadingHref, isCalendarPaced, showsIndividualStatus } from "@/lib/groupTypes";
import { effectiveTier, isDisciplerTier } from "@/lib/tiers";
import { ApiClient, ApiError, type Group, type GroupMember, type DiscipleshipRelationship } from "@/lib/api";

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}
      className="text-muted-foreground">
      {label}
    </Text>
  );
}

/**
 * A crack in the door — the day's theme and the opening of its setup, fading
 * out above the button. Deliberately not the whole reading: if the group page
 * shows everything, "Open Devotional" stops being the way in.
 *
 * The passage reference is already on the card's day line, so this shows only
 * the writing.
 */
function DevotionalPeek({
  planId,
  dayNumber,
  card,
  muted,
  calendarPaced,
}: {
  planId: string;
  dayNumber: number;
  card: string;
  muted: string;
  calendarPaced: boolean;
}) {
  const day = useDay(planId, dayNumber);

  const theme = day.data?.theme;
  const context = day.data?.passageContext;
  if (!theme && !context) return null;

  return (
    <View className="gap-1.5">
      {/* Calendar-paced groups move on the clock, so a member can be behind —
          name whose day this is. In convoy groups everyone is on it by
          definition and the label would only add noise. */}
      {calendarPaced ? (
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          Where the group is today
        </Text>
      ) : null}
      {theme ? (
        <Text className="font-serif-italic text-sm text-muted-foreground">{theme}</Text>
      ) : null}
      {context ? (
        <View style={{ height: 60, overflow: "hidden" }}>
          <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 20, color: muted }}>
            {context}
          </Text>
          {/* Fades to the card's own colour at zero alpha — fading to
              "transparent" renders as a grey wash on Android. */}
          <LinearGradient
            colors={[withAlpha(card, 0), card]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26 }}
            pointerEvents="none"
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * What the card shows once YOU have read today. A peek exists to pull you into
 * the reading — dangling one at someone who's already finished is an invitation
 * to do a thing they just did. This closes the loop instead, echoing the
 * reader's done screen so finishing feels the same wherever you see it.
 */
function FinishedToday({ accent }: { accent: string }) {
  const verse = getDailyVerse();
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <CheckCircle2 size={18} color={accent} />
        <Text className="font-serif text-base font-bold text-foreground">
          Done. Come back tomorrow.
        </Text>
      </View>
      <View className="rounded-xl bg-card-deep px-4 py-3.5">
        <Text className="mb-1.5 text-center font-serif-italic text-sm leading-relaxed text-foreground">
          &ldquo;{verse.text}&rdquo;
        </Text>
        <Text className="text-center text-xs font-sans-medium text-muted-foreground">
          {verse.ref}
        </Text>
      </View>
    </View>
  );
}

/** Past this many faces, scanning for a name stops working — offer search. */
const SEARCH_THRESHOLD = 8;
/**
 * Group progress as one bar, for groups too big or too public to show who
 * specifically is behind. Deliberately edge-to-edge: it's the whole room's
 * number, not one card's, and full width says that without a caption.
 */
function GroupProgress({
  done,
  total,
  accent,
  track,
}: {
  done: number;
  total: number;
  accent: string;
  track: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    // Cancels the scroll view's horizontal padding so the bar reaches both edges.
    <View style={{ marginHorizontal: -16 }} className="gap-2">
      <Text className="px-4 text-sm text-muted-foreground">
        {done} of {total} read today
      </Text>
      <View
        style={{ height: 10, backgroundColor: track }}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: done }}
        accessibilityLabel={`${done} of ${total} members have read today`}
      >
        <View style={{ width: `${pct}%`, height: 10, backgroundColor: accent }} />
      </View>
    </View>
  );
}
const TILE = 64;
const FACE = 52;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/**
 * The roster as faces rather than rows. Today's reading shows on the face
 * itself — full colour with a check when done, dimmed when not — so the
 * section stays one glance wide no matter how many people are in the group.
 *
 * Unfinished members sort FIRST: the live question is "who hasn't read yet",
 * so the answer shouldn't be hidden among the people who already have. For the
 * same reason the not-done dim is gentle — fading them hard would fade out the
 * very thing you're looking for.
 */
function MemberGrid({
  members,
  accent,
  muted,
  bg,
  border,
  fg,
  groupId,
  myUserId,
  nudgeEnabled,
  showStatus,
}: {
  members: GroupMember[];
  accent: string;
  muted: string;
  bg: string;
  border: string;
  fg: string;
  groupId: string;
  myUserId: string | undefined;
  nudgeEnabled: boolean;
  /** False in big/public groups — the bar above speaks for everyone instead. */
  showStatus: boolean;
}) {
  const [query, setQuery] = useState("");
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);
  const toast = useToast();

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? members.filter((m) => m.displayName.toLowerCase().includes(needle))
    : members;
  // Unfinished-first only where status is shown. Sorting by who's behind singles
  // people out by POSITION — you don't need a dimmed face to read the front of
  // the line — so in big/public groups the server's order stands.
  const visible = showStatus
    ? [...filtered].sort((a, b) => Number(a.doneToday) - Number(b.doneToday))
    : filtered;

  const canNudge = (m: GroupMember) =>
    nudgeEnabled && !m.doneToday && m.userId !== myUserId && !nudged.has(m.userId);

  const handleNudge = (member: GroupMember) => {
    Alert.alert(
      `Nudge ${firstName(member.displayName)}?`,
      "They'll know it's from you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setSending(member.userId);
            try {
              const res = await ApiClient.nudgeMember(groupId, member.userId);
              // Marked either way: a nudge swallowed by someone else's cooldown
              // still means "this person has been reminded", and re-tapping
              // would only produce the same quiet non-result.
              setNudged((prev) => new Set(prev).add(member.userId));
              // Covers both quiet outcomes — a live cooldown and a group that
              // just had someone finish. Either way they've been pinged
              // recently, which is all the sender needs to know.
              toast.show(
                res.delivered
                  ? `Nudged ${firstName(member.displayName)}`
                  : `${firstName(member.displayName)} was pinged recently`
              );
            } catch (err) {
              Alert.alert(
                "Couldn't nudge",
                err instanceof ApiError ? err.message : "Please try again."
              );
            } finally {
              setSending(null);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {members.length > SEARCH_THRESHOLD ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search members…"
          placeholderTextColor={muted}
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 9,
            color: fg,
            backgroundColor: bg,
            fontSize: 14,
            fontFamily: "DMSans_400Regular",
          }}
        />
      ) : null}

      {visible.length === 0 ? (
        <Text className="text-sm text-muted-foreground">
          {members.length === 0 ? "No members yet." : "No one by that name."}
        </Text>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 16 }}>
          {visible.map((member) => (
            <Pressable
              key={member.id}
              style={{ width: TILE, opacity: sending === member.userId ? 0.5 : 1 }}
              className="items-center"
              disabled={!canNudge(member)}
              onPress={() => handleNudge(member)}
              accessibilityRole={canNudge(member) ? "button" : undefined}
              accessible
              accessibilityLabel={
                showStatus
                  ? `${member.displayName} — ${member.doneToday ? "read today" : "not read yet"}`
                  : member.displayName
              }
              accessibilityHint={canNudge(member) ? "Double tap to nudge them" : undefined}
            >
              <View style={{ width: FACE, height: FACE }}>
                <View style={{ opacity: !showStatus || member.doneToday ? 1 : 0.55 }}>
                  <Avatar name={member.displayName} url={member.avatarUrl} accent={accent} size={FACE} />
                </View>
                {showStatus && member.doneToday ? (
                  // Ringed in the page background so the badge stays legible
                  // where it overlaps a photo.
                  <View
                    style={{
                      position: "absolute",
                      bottom: -1,
                      right: -1,
                      width: 19,
                      height: 19,
                      borderRadius: 10,
                      backgroundColor: accent,
                      borderWidth: 2,
                      borderColor: bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={10} color="#fff" strokeWidth={3.5} />
                  </View>
                ) : nudged.has(member.userId) ? (
                  // Same corner as the check, in muted rather than the accent —
                  // "reminded" is a lesser state than "read", and shouldn't
                  // read as an achievement.
                  <View
                    style={{
                      position: "absolute",
                      bottom: -1,
                      right: -1,
                      width: 19,
                      height: 19,
                      borderRadius: 10,
                      backgroundColor: bg,
                      borderWidth: 1,
                      borderColor: border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Bell size={10} color={muted} />
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={{ width: TILE, textAlign: "center" }}
                className="mt-1.5 text-xs text-muted-foreground"
              >
                {firstName(member.displayName)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

// Per-group discipleship: the *invite* lives here, because this is where you
// pick the person. Once a relationship exists it's managed from the hub at the
// top of the Groups tab.
function DiscipleshipSection({
  group,
  rel,
  myUserId,
  accent,
  canDisciple,
}: {
  group: Group;
  rel: DiscipleshipRelationship | undefined;
  myUserId: string | undefined;
  accent: string;
  canDisciple: boolean;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const muted = useThemeColor("muted-foreground");

  const other = group.members.find((m) => m.userId !== myUserId);

  const handleInvite = () => {
    if (!other) return;
    if (!canDisciple) {
      Alert.alert(
        "Sharpen required",
        "Discipler tools are available on the Sharpen plan and above.",
        [
          { text: "Not now", style: "cancel" },
          { text: "See plans", onPress: () => router.push("/settings/membership") },
        ]
      );
      return;
    }
    Alert.alert(
      "Start discipleship",
      `Invite ${other.displayName} as your disciple? They'll be asked to accept first.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send invite",
          onPress: async () => {
            try {
              await ApiClient.inviteDisciple(group.id, other.userId);
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["discipleship"] }),
                qc.invalidateQueries({ queryKey: ["groups"] }),
              ]);
              toast.show("Invite sent");
            } catch (err) {
              Alert.alert("Couldn't invite", err instanceof ApiError ? err.message : "Please try again.");
            }
          },
        },
      ]
    );
  };

  let body: ReactNode;
  if (!rel) {
    body = other ? (
      <>
        <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, lineHeight: 19 }}>
          Walk one-on-one — you'll see {other.displayName}'s responses as they submit, can send a daily
          question, and message privately.
        </Text>
        <View className="flex-row">
          <DiscipleChip icon={HeartHandshake} label="Start discipleship" color={accent} onPress={handleInvite} />
        </View>
      </>
    ) : (
      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, fontStyle: "italic" }}>
        Add the other person to this group to start discipleship.
      </Text>
    );
  } else {
    body = (
      <Text style={{ fontFamily: "DMSans_400Regular", fontSize: 13, color: muted, fontStyle: "italic" }}>
        {rel.status === "pending"
          ? "Invite pending — manage it in Discipleship on the Plans tab."
          : "Active — open responses, saved items, and the mailbox from Discipleship on the Plans tab."}
      </Text>
    );
  }

  return (
    <View className="gap-2">
      <SectionLabel label="Discipleship" />
      {body}
    </View>
  );
}

export default function GroupPage() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();

  const groups = useGroups();
  const discipleships = useDiscipleships();
  const profile = useProfile();

  const primary = useThemeColor("primary");
  const muted = useThemeColor("muted-foreground");
  const border = useThemeColor("border");
  const card = useThemeColor("card");
  const bg = useThemeColor("background");
  const fg = useThemeColor("foreground");
  const destructive = useThemeColor("destructive");
  const destructiveBorder = useThemeColor("destructive", 0.25);
  const destructiveBg = useThemeColor("destructive", 0.06);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  const group = (groups.data ?? []).find((g) => g.id === groupId);

  // Called before the early returns below so hook order stays stable across
  // loading / error / missing-group renders. Pairs with the server's doneToday:
  // this one flips the instant you finish, without waiting for a refetch.
  const localDone = useLocalDoneToday(group?.plan?.id, group?.id, group?.currentDay);

  if (groups.isLoading) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={primary} />
        </View>
      </Screen>
    );
  }

  // A failed fetch is not a missing group — saying "gone" when the phone is
  // simply offline reads as data loss, so the two get different screens.
  if (groups.isError) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Header title="Group" />
        <ErrorState
          message="We couldn't load this group. Check your connection and try again."
          onRetry={() => groups.refetch()}
        />
      </Screen>
    );
  }

  // Covers a group you just left or ended, and a stale link.
  if (!group) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Header title="Group" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-muted-foreground">
            This group isn't available anymore.
          </Text>
        </View>
      </Screen>
    );
  }

  const config = GROUP_TYPE_CONFIG[group.groupType] ?? { label: group.groupType, color: primary };
  const doneCount = group.members.filter((m) => m.doneToday).length;
  const isCreator = group.createdBy === profile.data?.userId;
  const canDisciple = isDisciplerTier(effectiveTier(profile.data));
  const rel = (discipleships.data ?? []).find((r) => r.groupId === group.id);
  // In a big or public group, per-person state gives way to a single bar — see
  // showsIndividualStatus. Nudging rides on the same line: if we won't say who
  // is behind, we certainly won't let anyone poke them about it.
  const individualStatus = showsIndividualStatus(group.groupType, group.members.length);
  const iAmDone =
    localDone || !!group.members.find((m) => m.userId === profile.data?.userId)?.doneToday;
  // No plan means there's nothing to be nudged about yet.
  const nudgeEnabled = !!group.plan && individualStatus;

  const openEdit = () => {
    setEditName(group.name);
    setEditOpen(true);
  };

  // Ending and leaving live inside the manage sheet, but both raise a second
  // dialog on top of it. Stacking one modal over another mid-slide strands the
  // backdrop on iOS, so the sheet gets its exit animation before the dialog.
  const closeSheetThen = (fn: () => void) => {
    setEditOpen(false);
    setTimeout(fn, 260);
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await ApiClient.updateGroup(group.id, editName.trim());
      await qc.invalidateQueries({ queryKey: ["groups"] });
      setEditOpen(false);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (targetUserId: string, name: string) => {
    Alert.alert("Remove member", `Remove ${name} from this group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiClient.removeGroupMember(group.id, targetUserId);
            await qc.invalidateQueries({ queryKey: ["groups"] });
          } catch (err) {
            Alert.alert("Couldn't remove member", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  // A member (not the creator) leaving — distinct from the creator's "End".
  const handleLeave = () => {
    const myId = profile.data?.userId;
    if (!myId) return;
    Alert.alert("Leave group?", `You'll leave "${group.name}". Your past entries stay with the group.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await ApiClient.removeGroupMember(group.id, myId);
            await qc.invalidateQueries({ queryKey: ["groups"] });
            toast.show(`Left ${group.name}`);
            router.back();
          } catch (err) {
            Alert.alert("Couldn't leave", err instanceof ApiError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  const handleEnd = async () => {
    setEnding(true);
    try {
      await ApiClient.deleteGroup(group.id);
      await qc.invalidateQueries({ queryKey: ["groups"] });
      setConfirmEnd(false);
      router.back();
    } catch (err) {
      Alert.alert("Couldn't end group", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setEnding(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Header
        title={group.name}
        subtitle={config.label}
        rightAction={
          <Pressable
            onPress={openEdit}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Manage group"
            className="h-9 w-9 items-center justify-center rounded-full active:bg-muted/40"
          >
            <Settings size={18} color={muted} />
          </Pressable>
        }
      />

      <ScrollView contentContainerClassName="px-4 pb-10 gap-7" showsVerticalScrollIndicator={false}>
        {/* ── What the group is reading ─────────────────────────────────────── */}
        <View
          style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: card }}
          className="gap-3 p-4"
        >
          {group.plan ? (
            <>
              <View className="gap-1">
                <Text className="font-serif text-lg font-bold text-foreground">{group.plan.title}</Text>
                <Text className="text-sm text-muted-foreground">
                  Day {group.currentDay} of {group.plan.totalDays}
                  {group.plan.chapter ? ` · ${group.plan.chapter}` : ""}
                </Text>
                {/* In big/public groups the full-width bar below carries this
                    number, so the card doesn't print it a second time. */}
                {individualStatus ? (
                  <Text className="text-sm text-muted-foreground">
                    {doneCount} of {group.members.length} read today
                  </Text>
                ) : null}
              </View>

              {iAmDone ? (
                <>
                  <FinishedToday accent={config.color} />
                  {/* Finished, so the way in is no longer "do today's reading".
                      Both are equal width — neither is the obvious next move,
                      because there isn't one. "Back to Plans" is deliberately
                      absent: the header arrow and the tab bar both already do
                      it, so it would only repeat the chrome. */}
                  {/* Side by side, so labels are trimmed to fit half the card —
                      the full sentences would wrap and leave the pair uneven.
                      The icons carry the meaning the words gave up. */}
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() =>
                        router.push(`/devotional/${group.plan!.id}?groupId=${group.id}&reread=1`)
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Re-read today's passage"
                      style={{ flex: 1, borderWidth: 1, borderColor: config.color, borderRadius: 8, backgroundColor: withAlpha(config.color, 0.12) }}
                      className="flex-row items-center justify-center gap-2 px-3 py-3"
                    >
                      <BookOpen size={16} color={config.color} />
                      <Text
                        numberOfLines={1}
                        style={{ color: config.color, fontFamily: "DMSans_500Medium", fontSize: 14 }}
                      >
                        Re-read
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/devotional/history/${group.plan!.id}?groupId=${group.id}&view=group`
                        )
                      }
                      accessibilityRole="button"
                      accessibilityLabel="See the group's responses"
                      style={{ flex: 1, borderWidth: 1, borderColor: border, borderRadius: 8 }}
                      className="flex-row items-center justify-center gap-2 px-3 py-3 active:bg-muted/20"
                    >
                      <Users size={16} color={muted} />
                      <Text
                        numberOfLines={1}
                        style={{ color: muted, fontFamily: "DMSans_500Medium", fontSize: 14 }}
                      >
                        Responses
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <DevotionalPeek
                    planId={group.plan.id}
                    dayNumber={group.currentDay}
                    card={card}
                    muted={muted}
                    calendarPaced={isCalendarPaced(group.groupType)}
                  />
                  <Pressable
                    onPress={() => router.push(groupReadingHref(group) ?? "/plans")}
                    style={{ borderWidth: 1, borderColor: config.color, borderRadius: 8, backgroundColor: withAlpha(config.color, 0.12) }}
                    className="flex-row items-center justify-center gap-2 px-3 py-3"
                  >
                    <BookOpen size={16} color={config.color} />
                    <Text style={{ color: config.color, fontFamily: "DMSans_500Medium", fontSize: 14 }}>
                      Open Devotional
                    </Text>
                  </Pressable>
                </>
              )}
            </>
          ) : (
            <>
              <Text className="text-sm text-muted-foreground">No plan yet.</Text>
              <Pressable
                onPress={() =>
                  router.push(`/plans/new?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`)
                }
                style={{ borderWidth: 1, borderColor: config.color, borderRadius: 8, backgroundColor: withAlpha(config.color, 0.12) }}
                className="flex-row items-center justify-center gap-2 px-3 py-3"
              >
                <BookOpen size={16} color={config.color} />
                <Text style={{ color: config.color, fontFamily: "DMSans_500Medium", fontSize: 14 }}>
                  Choose a plan
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ── Group progress (big / public groups only) ─────────────────────── */}
        {!individualStatus && group.plan ? (
          <GroupProgress
            done={doneCount}
            total={group.members.length}
            accent={config.color}
            track={withAlpha(config.color, 0.15)}
          />
        ) : null}

        {/* ── Members ───────────────────────────────────────────────────────── */}
        {/* Removing people moved into the manage sheet — this is a glance now,
            not a control panel. */}
        <View className="gap-3">
          <View className="gap-1">
            <SectionLabel label="Members" />
            {/* Tapping a face is invisible without saying so — but only claim it
                when there's actually someone tappable. */}
            {nudgeEnabled && group.members.some((m) => !m.doneToday && m.userId !== profile.data?.userId) ? (
              <Text className="text-xs text-muted-foreground">
                Tap someone who hasn&apos;t read to nudge them.
              </Text>
            ) : null}
          </View>
          <MemberGrid
            members={group.members}
            accent={config.color}
            muted={muted} bg={bg} border={border} fg={fg}
            groupId={group.id}
            myUserId={profile.data?.userId}
            nudgeEnabled={nudgeEnabled}
            showStatus={individualStatus}
          />
        </View>

        {/* ── Discipleship (one-on-one only) ────────────────────────────────── */}
        {group.groupType === "one-on-one" && (
          <DiscipleshipSection
            group={group}
            rel={rel}
            myUserId={profile.data?.userId}
            accent={config.color}
            canDisciple={canDisciple}
          />
        )}

      </ScrollView>

      {/* ── Manage sheet ────────────────────────────────────────────────────── */}
      {/* Everything that *runs* the group lives here — the page itself only
          shows it. Keeps destructive actions off the surface you scroll past. */}
      <BottomSheet visible={editOpen} onClose={() => !saving && setEditOpen(false)}>
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="font-serif text-xl font-bold text-foreground">Manage group</Text>
          <Pressable
            onPress={() => setEditOpen(false)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={muted} />
          </Pressable>
        </View>

        {/* flexShrink keeps this inside the sheet's height cap — everything below
            the fold (Add People, End/Leave) is only reachable if this scrolls. */}
        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
          <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Group Name</Text>
          <Input value={editName} onChangeText={setEditName} style={{ marginBottom: 16 }} />
          <Button
            title="Save Name"
            onPress={handleSaveName}
            disabled={!editName.trim()}
            loading={saving}
            style={{ marginBottom: 24 }}
          />

          <View style={{ height: 1, backgroundColor: border, marginBottom: 24 }} />

          <View style={{ marginBottom: 24 }}>
            <InviteCodeRow
              inviteCode={group.inviteCode}
              accent={config.color}
              muted={muted} border={border} card={card}
            />
          </View>

          <View style={{ height: 1, backgroundColor: border, marginBottom: 24 }} />

          {/* Removal is creator-only on the server, so everyone else sees the
              roster as a plain read — no buttons that would come back 403. */}
          <View style={{ marginBottom: 24 }}>
            <Text className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              People
            </Text>
            {group.members.map((member) => (
              <View key={member.id} className="flex-row items-center gap-3 py-2">
                <Avatar
                  name={member.displayName}
                  url={member.avatarUrl}
                  accent={config.color}
                  size={32}
                />
                <Text className="flex-1 text-sm text-foreground">{member.displayName}</Text>
                {isCreator && member.userId !== profile.data?.userId ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleRemoveMember(member.userId, member.displayName)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.displayName} from group`}
                  >
                    <X size={16} color={muted} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>

          <MemberSearch
            groupId={group.id}
            existingUserIds={new Set(group.members.map((m) => m.userId))}
            accent={config.color}
            muted={muted} border={border} card={card} bg={bg} fg={fg}
            onAdded={() => qc.invalidateQueries({ queryKey: ["groups"] })}
          />

          <View style={{ height: 1, backgroundColor: border, marginVertical: 24 }} />

          {/* Held back until we know who's looking. Creator is derived from the
              profile, so rendering early offers the creator "Leave group" — and
              the server honours a creator leaving, which strands the group. */}
          <View className="flex-row">
            {!profile.data ? null : isCreator ? (
              <Pressable
                onPress={() => closeSheetThen(() => setConfirmEnd(true))}
                style={{ borderWidth: 1, borderColor: destructiveBorder, borderRadius: 8, backgroundColor: destructiveBg }}
                className="flex-row items-center gap-1.5 px-3 py-2"
              >
                <Trash2 size={14} color={destructive} />
                <Text style={{ color: destructive, fontFamily: "DMSans_500Medium", fontSize: 13 }}>
                  End group
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => closeSheetThen(handleLeave)}
                style={{ borderWidth: 1, borderColor: destructiveBorder, borderRadius: 8, backgroundColor: destructiveBg }}
                className="flex-row items-center gap-1.5 px-3 py-2"
              >
                <LogOut size={14} color={destructive} />
                <Text style={{ color: destructive, fontFamily: "DMSans_500Medium", fontSize: 13 }}>
                  Leave group
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </BottomSheet>

      {/* ── End group confirmation ──────────────────────────────────────────── */}
      <ConfirmModal
        visible={confirmEnd}
        title="End group"
        message={`This ends "${group.name}" for all ${group.members.length} member${
          group.members.length === 1 ? "" : "s"
        }. It moves to Past groups and everyone keeps their past entries.`}
        confirmLabel="End group"
        destructive
        busy={ending}
        onConfirm={handleEnd}
        onCancel={() => !ending && setConfirmEnd(false)}
      />
    </Screen>
  );
}
