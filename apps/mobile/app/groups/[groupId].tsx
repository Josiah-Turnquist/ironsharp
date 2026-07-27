import { useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Circle, HeartHandshake, LogOut, Pencil, Trash2, X } from "lucide-react-native";
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
import { useGroups, useDiscipleships, useProfile } from "@/lib/queries";
import { GROUP_TYPE_CONFIG, groupReadingHref } from "@/lib/groupTypes";
import { effectiveTier, isDisciplerTier } from "@/lib/tiers";
import { ApiClient, ApiError, type Group, type DiscipleshipRelationship } from "@/lib/api";

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}
      className="text-muted-foreground">
      {label}
    </Text>
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

  const openEdit = () => {
    setEditName(group.name);
    setEditOpen(true);
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
            accessibilityLabel="Edit group"
            className="h-9 w-9 items-center justify-center rounded-full active:bg-muted/40"
          >
            <Pencil size={18} color={muted} />
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
                <Text className="text-sm text-muted-foreground">
                  {doneCount} of {group.members.length} read today
                </Text>
              </View>
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

        {/* ── Members ───────────────────────────────────────────────────────── */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <SectionLabel label="Members" />
            <SectionLabel label="Completed" />
          </View>
          {group.members.length === 0 ? (
            <Text className="text-sm text-muted-foreground">No members yet.</Text>
          ) : (
            group.members.map((member) => (
              <View key={member.id} className="flex-row items-center justify-between">
                <Text className="flex-1 text-base text-foreground">{member.displayName}</Text>
                <View className="flex-row items-center gap-3">
                  {member.doneToday
                    ? <CheckCircle2 size={18} color={config.color} />
                    : <Circle size={18} color={muted} />}
                  {isCreator && member.userId !== profile.data?.userId ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => handleRemoveMember(member.userId, member.displayName)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${member.displayName} from group`}
                    >
                      <X size={14} color={muted} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
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

        {/* ── Ending or leaving ─────────────────────────────────────────────── */}
        {/* Held back until we know who's looking. Creator is derived from the
            profile, so rendering early offers the creator "Leave group" — and
            the server honours a creator leaving, which strands the group. */}
        <View className="flex-row">
          {!profile.data ? null : isCreator ? (
            <Pressable
              onPress={() => setConfirmEnd(true)}
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
              onPress={handleLeave}
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

      {/* ── Edit sheet ──────────────────────────────────────────────────────── */}
      <BottomSheet visible={editOpen} onClose={() => !saving && setEditOpen(false)}>
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="font-serif text-xl font-bold text-foreground">Edit Group</Text>
          <Pressable
            onPress={() => setEditOpen(false)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={muted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
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

          <MemberSearch
            groupId={group.id}
            existingUserIds={new Set(group.members.map((m) => m.userId))}
            accent={config.color}
            muted={muted} border={border} card={card} bg={bg} fg={fg}
            onAdded={() => qc.invalidateQueries({ queryKey: ["groups"] })}
          />
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
