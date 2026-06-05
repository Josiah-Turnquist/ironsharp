import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "./api";
import { useSession } from "./session";

/** Whether we have an authenticated session right now. */
export function useAuthed() {
  const { user, isPending } = useSession();
  return { authed: !!user, user, isPending };
}

export function useProfile() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => ApiClient.getProfile().then((r) => r.profile),
    enabled: authed,
  });
}

export function usePlans() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => ApiClient.getPlans(),
    enabled: authed,
  });
}

export function usePlansByCategory(category: string) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["plans", "category", category],
    queryFn: () => ApiClient.getPlansByCategory(category).then((r) => r.plans),
    enabled: authed && !!category,
  });
}

export function useActiveDevotional() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["progress", "active"],
    queryFn: () => ApiClient.getActiveDevotional().then((r) => r.active),
    enabled: authed,
  });
}

export function useProgress() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["progress"],
    queryFn: () => ApiClient.getProgress().then((r) => r.progress),
    enabled: authed,
  });
}

export function usePlan(planId: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["plan", planId],
    queryFn: () => ApiClient.getPlan(planId!).then((r) => r.plan),
    enabled: authed && !!planId,
  });
}

export function useDays(planId: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["plan", planId, "days"],
    queryFn: () => ApiClient.getDays(planId!).then((r) => r.days),
    enabled: authed && !!planId,
  });
}

export function useGenerateTokens() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["generate", "tokens"],
    queryFn: () => ApiClient.getGenerateTokens(),
    enabled: authed,
  });
}

export function useGroups() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => ApiClient.getGroups().then((r) => r.groups),
    enabled: authed,
  });
}

export function useGroupDayResponses(planId: string, dayNumber: number, enabled: boolean) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["group-day-responses", planId, dayNumber],
    queryFn: () => ApiClient.getGroupDayResponses(planId, dayNumber).then((r) => r.responses),
    enabled: authed && enabled && !!planId && dayNumber > 0,
    staleTime: 60_000,
  });
}
