import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  groups,
  groupMembers,
  profiles,
  devotionalPlans,
  devotionalDays,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

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
