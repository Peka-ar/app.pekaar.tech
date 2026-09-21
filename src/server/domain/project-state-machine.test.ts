import { describe, expect, it } from "vitest";
import {
  PROJECT_TRANSITIONS,
  canTransition,
  allowedNextStatuses,
  describeTransition,
  SYSTEM_ACTOR,
} from "./project-state-machine";
import { ProjectStatus, Role } from "@/lib/enums";

describe("project-state-machine", () => {
  it("declares the canonical transitions", () => {
    expect(PROJECT_TRANSITIONS).toHaveLength(4);
    expect(
      PROJECT_TRANSITIONS.some((t) => t.from.includes(ProjectStatus.PENDING) && t.to === ProjectStatus.COMPLETED && t.by === Role.ADMIN),
    ).toBe(true);
    expect(
      PROJECT_TRANSITIONS.some((t) => t.from.includes(ProjectStatus.REVISIONS) && t.to === ProjectStatus.COMPLETED && t.by === Role.ADMIN),
    ).toBe(true);
    expect(
      PROJECT_TRANSITIONS.some((t) => t.from.includes(ProjectStatus.COMPLETED) && t.to === ProjectStatus.PUBLISHED && t.by === Role.BRAND),
    ).toBe(true);
    expect(
      PROJECT_TRANSITIONS.some((t) => t.from.includes(ProjectStatus.COMPLETED) && t.to === ProjectStatus.REVISIONS && t.by === Role.BRAND),
    ).toBe(true);
    expect(
      PROJECT_TRANSITIONS.some((t) => t.from.includes(ProjectStatus.PUBLISHED) && t.to === ProjectStatus.REVISIONS && t.by === Role.BRAND),
    ).toBe(true);
  });

  it("allows brand to send a published project back to revisions", () => {
    expect(canTransition(ProjectStatus.PUBLISHED, ProjectStatus.REVISIONS, Role.BRAND)).toBe(true);
  });

  it("lets the SYSTEM actor complete a project from PENDING or REVISIONS", () => {
    expect(canTransition(ProjectStatus.PENDING, ProjectStatus.COMPLETED, SYSTEM_ACTOR)).toBe(true);
    expect(canTransition(ProjectStatus.REVISIONS, ProjectStatus.COMPLETED, SYSTEM_ACTOR)).toBe(true);
  });

  it("does not let the SYSTEM actor publish or request revisions", () => {
    expect(canTransition(ProjectStatus.COMPLETED, ProjectStatus.PUBLISHED, SYSTEM_ACTOR)).toBe(false);
    expect(canTransition(ProjectStatus.COMPLETED, ProjectStatus.REVISIONS, SYSTEM_ACTOR)).toBe(false);
  });

  it("does not allow admin to publish directly", () => {
    expect(canTransition(ProjectStatus.COMPLETED, ProjectStatus.PUBLISHED, Role.ADMIN)).toBe(false);
  });

  it("does not allow brand to publish from PENDING", () => {
    expect(canTransition(ProjectStatus.PENDING, ProjectStatus.PUBLISHED, Role.BRAND)).toBe(false);
  });

  it("REVISIONS is not re-entrant via brandSendForRevisions", () => {
    expect(canTransition(ProjectStatus.REVISIONS, ProjectStatus.REVISIONS, Role.BRAND)).toBe(false);
  });

  it("does not allow arbitrary transitions", () => {
    expect(canTransition(ProjectStatus.PUBLISHED, ProjectStatus.COMPLETED, Role.ADMIN)).toBe(false);
    expect(canTransition(ProjectStatus.PENDING, ProjectStatus.REVISIONS, Role.BRAND)).toBe(false);
  });

  it("allowedNextStatuses reflects role-gated options", () => {
    expect(allowedNextStatuses(ProjectStatus.COMPLETED, Role.BRAND).sort()).toEqual(
      [ProjectStatus.PUBLISHED, ProjectStatus.REVISIONS].sort(),
    );
    expect(allowedNextStatuses(ProjectStatus.COMPLETED, Role.ADMIN)).toEqual([]);
    expect(allowedNextStatuses(ProjectStatus.REVISIONS, Role.ADMIN)).toEqual([ProjectStatus.COMPLETED]);
  });

  it("describeTransition returns the matching rule", () => {
    const t = describeTransition(ProjectStatus.PENDING, ProjectStatus.COMPLETED, Role.ADMIN);
    expect(t).toBeDefined();
    expect(t!.by).toBe(Role.ADMIN);
  });
});
