import { ProjectStatus, Role } from "@/lib/enums";

/**
 * The automated FAST-generation pipeline acts on a project without an end-user
 * principal. It is not an auth role (never granted to a user row) — it is a
 * domain actor, so it lives here rather than in `Role`.
 */
export const SYSTEM_ACTOR = "SYSTEM" as const;
export type ProjectActor = Role | typeof SYSTEM_ACTOR;

export interface ProjectTransition {
  from: readonly ProjectStatus[];
  to: ProjectStatus;
  by: ProjectActor;
}

/**
 * Single source of truth for project status transitions.
 *
 * - ADMIN submit moves PENDING or REVISIONS -> COMPLETED
 * - SYSTEM (FAST generation) also moves PENDING or REVISIONS -> COMPLETED once
 *   the AI model has been stored and linked
 * - BRAND approve moves COMPLETED -> PUBLISHED
 * - BRAND revision request moves COMPLETED or PUBLISHED -> REVISIONS
 *
 * NOTE: REVISIONS is not re-entrant via brandSendForRevisions in the current
 * code — a project already in REVISIONS must be re-submitted (-> COMPLETED)
 * before the brand can request more revisions.
 */
export const PROJECT_TRANSITIONS: readonly ProjectTransition[] = [
  { from: [ProjectStatus.PENDING, ProjectStatus.REVISIONS], to: ProjectStatus.COMPLETED, by: Role.ADMIN },
  { from: [ProjectStatus.PENDING, ProjectStatus.REVISIONS], to: ProjectStatus.COMPLETED, by: SYSTEM_ACTOR },
  { from: [ProjectStatus.COMPLETED], to: ProjectStatus.PUBLISHED, by: Role.BRAND },
  { from: [ProjectStatus.COMPLETED, ProjectStatus.PUBLISHED], to: ProjectStatus.REVISIONS, by: Role.BRAND },
];

export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  by: ProjectActor,
): boolean {
  return PROJECT_TRANSITIONS.some(
    (t) => t.to === to && t.by === by && t.from.includes(from),
  );
}

export function allowedNextStatuses(from: ProjectStatus, by: ProjectActor): ProjectStatus[] {
  return PROJECT_TRANSITIONS.filter((t) => t.by === by && t.from.includes(from)).map((t) => t.to);
}

export function describeTransition(from: ProjectStatus, to: ProjectStatus, by: ProjectActor): ProjectTransition | undefined {
  return PROJECT_TRANSITIONS.find(
    (t) => t.to === to && t.by === by && t.from.includes(from),
  );
}
