import { Hono } from "hono";
import { and, count, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  groups,
  groupMembers,
  profiles,
  devotionalPlans,
  devotionalDays,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { TIER_LIMITS, TIER_NAMES, type MembershipTier } from "../lib/tiers.js";

export const groupsRoute = new Hono<AppEnv>();
groupsRoute.use("*", requireAuth);

// GET /api/groups — all groups the user belongs to, ordered by display_order
groupsRoute.get("/", async (c) => {
  const userId = c.var.user.id;

  const memberships = await db
    .select({ group: groups, membership: groupMembers, plan: devotionalPlans })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .leftJoin(devotionalPlans, eq(groups.currentPlanId, devotionalPlans.id))
    .where(eq(groupMembers.userId, userId))
    .orderBy(groupMembers.displayOrder);

  const result = await Promise.all(
    memberships.map(async ({ group, membership, plan }) => {
      const [members, dayRow] = await Promise.all([
        db
          .select({ m: groupMembers, p: profiles })
          .from(groupMembers)
          .leftJoin(profiles, eq(groupMembers.userId, profiles.userId))
          .where(eq(groupMembers.groupId, group.id)),
        plan && group.currentDay
          ? db
              .select({ chapter: devotionalDays.chapter })
              .from(devotionalDays)
              .where(
                and(
                  eq(devotionalDays.planId, group.currentPlanId!),
                  eq(devotionalDays.dayNumber, group.currentDay)
                )
              )
              .limit(1)
          : Promise.resolve([]),
      ]);

      return {
        id: group.id,
        name: group.name,
        groupType: group.groupType,
        inviteCode: group.inviteCode,
        currentDay: group.currentDay,
        streakCount: group.streakCount,
        displayOrder: membership.displayOrder,
        plan: plan
          ? {
              id: plan.id,
              title: plan.title,
              chapter: (dayRow as { chapter: string }[])[0]?.chapter ?? null,
              totalDays: plan.totalDays,
            }
          : null,
        members: members.map(({ m, p }) => ({
          id: m.id,
          userId: m.userId,
          memberRole: m.memberRole,
          doneToday: m.doneToday,
          streakCount: m.streakCount,
          displayName: p?.displayName ?? "Member",
          avatarUrl: p?.avatarUrl ?? null,
        })),
      };
    })
  );

  return c.json({ groups: result });
});

// POST /api/groups — create a new group
groupsRoute.post("/", async (c) => {
  const userId = c.var.user.id;
  const body = await c.req.json().catch(() => ({}));
  const { name, groupType } = body as { name?: string; groupType?: string };

  if (!name?.trim() || !groupType) {
    return c.json({ error: "name and groupType are required" }, 400);
  }
  if (!["one-on-one", "family", "small-group"].includes(groupType)) {
    return c.json({ error: "Invalid groupType" }, 400);
  }

  // Next display_order for this user
  const [maxRow] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${groupMembers.displayOrder}), -1)` })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  // Short, readable invite code
  const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const [group] = await db
    .insert(groups)
    .values({ name: name.trim(), groupType, inviteCode, createdBy: userId })
    .returning();

  if (!group) return c.json({ error: "Failed to create group" }, 500);

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId,
    memberRole: "leader",
    displayOrder: nextOrder,
  });

  return c.json({ group }, 201);
});

// POST /api/groups/join — join a group by invite code
groupsRoute.post("/join", async (c) => {
  const userId = c.var.user.id;
  const { inviteCode } = await c.req.json().catch(() => ({ inviteCode: undefined }));
  if (!inviteCode) return c.json({ error: "inviteCode is required" }, 400);

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, String(inviteCode).toUpperCase().trim()))
    .limit(1);
  if (!group) return c.json({ error: "Invalid invite code" }, 404);

  const [existing] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)))
    .limit(1);
  if (existing) return c.json({ error: "Already a member of this group" }, 409);

  // Enforce creator's tier group size limit
  const [creatorProfile] = await db
    .select({ membershipTier: profiles.membershipTier })
    .from(profiles)
    .where(eq(profiles.userId, group.createdBy))
    .limit(1);

  const creatorTier = (creatorProfile?.membershipTier ?? "free") as MembershipTier;
  const maxSize = TIER_LIMITS[creatorTier].maxGroupSize;

  if (maxSize !== Infinity) {
    const [sizeRow] = await db
      .select({ count: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));
    const currentSize = sizeRow?.count ?? 0;

    if (currentSize >= maxSize) {
      return c.json(
        {
          error: `This group is full. The group creator's ${TIER_NAMES[creatorTier]} plan supports up to ${maxSize} members.`,
        },
        403
      );
    }
  }

  const [maxRow] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${groupMembers.displayOrder}), -1)` })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId,
    memberRole: "member",
    displayOrder: nextOrder,
  });

  return c.json({ group: { id: group.id, name: group.name } }, 201);
});

// PATCH /api/groups/reorder — persist drag-reorder. Body: { order: [{groupId, displayOrder}] }
groupsRoute.patch("/reorder", async (c) => {
  const userId = c.var.user.id;
  const body = await c.req.json().catch(() => ({}));
  const { order } = body as {
    order?: { groupId: string; displayOrder: number }[];
  };

  if (!Array.isArray(order) || order.length === 0) {
    return c.json({ error: "order array required" }, 400);
  }

  await Promise.all(
    order.map(({ groupId, displayOrder }) =>
      db
        .update(groupMembers)
        .set({ displayOrder })
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
          )
        )
    )
  );

  return c.json({ ok: true });
});

// PATCH /api/groups/:id — update group name (any member)
groupsRoute.patch("/:id", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const { name } = await c.req.json().catch(() => ({}));
  if (!name?.trim()) return c.json({ error: "name is required" }, 400);

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member" }, 403);

  const [group] = await db
    .update(groups)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(groups.id, groupId))
    .returning();

  return c.json({ group });
});

// POST /api/groups/:id/members — add a user by userId (any member can invite)
groupsRoute.post("/:id/members", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const { userId: targetUserId } = await c.req.json().catch(() => ({}));
  if (!targetUserId) return c.json({ error: "userId is required" }, 400);

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member" }, 403);

  // Enforce creator's tier group size limit
  const [group] = await db
    .select({ createdBy: groups.createdBy })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (group) {
    const [creatorProfile] = await db
      .select({ membershipTier: profiles.membershipTier })
      .from(profiles)
      .where(eq(profiles.userId, group.createdBy))
      .limit(1);

    const creatorTier = (creatorProfile?.membershipTier ?? "free") as MembershipTier;
    const maxSize = TIER_LIMITS[creatorTier].maxGroupSize;

    if (maxSize !== Infinity) {
      const [sizeRow] = await db
        .select({ count: count() })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));
      const currentSize = sizeRow?.count ?? 0;

      if (currentSize >= maxSize) {
        return c.json(
          {
            error: `This group is full. The ${TIER_NAMES[creatorTier]} plan supports up to ${maxSize} members. Upgrade to add more.`,
          },
          403
        );
      }
    }
  }

  const [maxRow] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${groupMembers.displayOrder}), -1)` })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  await db
    .insert(groupMembers)
    .values({ groupId, userId: targetUserId, memberRole: "member", displayOrder: nextOrder })
    .onConflictDoNothing();

  return c.json({ ok: true }, 201);
});

// DELETE /api/groups/:id/members/:userId — remove a member (creator only, or self-leave)
groupsRoute.delete("/:id/members/:targetUserId", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const targetUserId = c.req.param("targetUserId");

  const [group] = await db
    .select({ createdBy: groups.createdBy })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return c.json({ error: "Group not found" }, 404);

  const isSelf = targetUserId === userId;
  const isCreator = group.createdBy === userId;
  if (!isSelf && !isCreator) return c.json({ error: "Not authorized" }, 403);

  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));

  return c.json({ ok: true });
});

// PATCH /api/groups/:id/plan — assign a plan to a group (must be a member)
groupsRoute.patch("/:id/plan", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const { planId } = await c.req.json().catch(() => ({ planId: undefined }));
  if (!planId) return c.json({ error: "planId is required" }, 400);

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member of this group" }, 403);

  // Group limit: 3 active group devotionals at a time.
  const [activeGroups] = await db
    .select({ count: count() })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(and(eq(groupMembers.userId, userId), isNotNull(groups.currentPlanId)));

  if ((activeGroups?.count ?? 0) >= 3) {
    return c.json(
      { error: "You're already in three active group devotionals. Go deeper with the people you are already committed to before adding more." },
      403
    );
  }

  await db
    .update(groups)
    .set({ currentPlanId: planId, currentDay: 1, updatedAt: new Date() })
    .where(eq(groups.id, groupId));

  await db
    .update(groupMembers)
    .set({ doneToday: false })
    .where(eq(groupMembers.groupId, groupId));

  return c.json({ ok: true });
});

// PATCH /api/groups/:id/day — mark the calling user done; advance group day when everyone's finished
groupsRoute.patch("/:id/day", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { nextDay, completed } = body as { nextDay?: number; completed?: boolean };

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member" }, 403);

  await db
    .update(groupMembers)
    .set({ doneToday: true })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

  const allMembers = await db
    .select({ doneToday: groupMembers.doneToday, userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const allDone = allMembers.every((m) => m.doneToday || m.userId === userId);

  if (allDone) {
    if (completed) {
      await db
        .update(groups)
        .set({ currentPlanId: null, currentDay: 1, updatedAt: new Date() })
        .where(eq(groups.id, groupId));
    } else if (nextDay !== undefined) {
      await db
        .update(groups)
        .set({ currentDay: nextDay, updatedAt: new Date() })
        .where(eq(groups.id, groupId));
    }
    await db
      .update(groupMembers)
      .set({ doneToday: false })
      .where(eq(groupMembers.groupId, groupId));
  }

  return c.json({ ok: true, allDone });
});

// DELETE /api/groups/:id — creator deletes the group; member leaves it
groupsRoute.delete("/:id", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return c.json({ error: "Not found" }, 404);

  if (group.createdBy === userId) {
    await db.delete(groups).where(eq(groups.id, groupId));
  } else {
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      );
  }

  return c.json({ ok: true });
});
