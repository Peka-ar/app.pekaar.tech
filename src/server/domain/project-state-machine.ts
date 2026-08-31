import { ProjectStatus, Role } from "@/lib/enums";

export interface ProjectTransition {
  from: readonly ProjectStatus[];
  to: ProjectStatus;
  by: Role;
}

/**
 * Single source of truth for project status transitions.
 *
 * Matches the current production behavior:
 * - ADMIN submit moves PENDING or REVISIONS -> COMPLETED
 * - BRAND approve moves COMPLETED -> PUBLISHED
 * - BRAND revision request moves COMPLETED or PUBLISHED -> REVISIONS
 *
 * NOTE: REVISIONS is not re-entrant via brandSendForRevisions in the current
 * code — a project already in REVISIONS must be re-submitted (-> COMPLETED)
 * before the brand can request more revisions.
 */
export const PROJECT_TRANSITIONS: readonly ProjectTransition[] = [
  { from: [ProjectStatus.PENDING, ProjectStatus.REVISIONS], to: ProjectStatus.COMPLETED, by: Role.ADMIN },
  { from: [ProjectStatus.COMPLETED], to: ProjectStatus.PUBLISHED, by: Role.BRAND },
  { from: [ProjectStatus.COMPLETED, ProjectStatus.PUBLISHED], to: ProjectStatus.REVISIONS, by: Role.BRAND },
];

export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  by: Role,
): boolean {
  return PROJECT_TRANSITIONS.some(
    (t) => t.to === to && t.by === by && t.from.includes(from),
  );
}

export function allowedNextStatuses(from: ProjectStatus, by: Role): ProjectStatus[] {
  return PROJECT_TRANSITIONS.filter((t) => t.by === by && t.from.includes(from)).map((t) => t.to);
}

export function describeTransition(from: ProjectStatus, to: ProjectStatus, by: Role): ProjectTransition | undefined {
  return PROJECT_TRANSITIONS.find(
    (t) => t.to === to && t.by === by && t.from.includes(from),
  );
}
