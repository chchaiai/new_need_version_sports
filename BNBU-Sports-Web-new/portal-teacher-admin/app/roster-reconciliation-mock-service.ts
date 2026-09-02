import { validateRosterImport } from "./roster-import";
import { createInitialMockRosterSnapshots } from "./roster-reconciliation-mock-data";
import { deriveStats } from "./roster-reconciliation-projection";
import {
  RosterReconciliationStatus,
  RosterResolutionStatus,
  type OfficialRosterSnapshot,
  type OfficialRosterStudent,
  type PlatformCourseMember,
  type ReconciliationContext,
  type RosterApiAdapter,
  type RosterDifference,
  type RosterReconciliationBundle,
  type RosterReconciliationResult,
} from "./roster-reconciliation-types";

type MockRosterState = {
  schemaVersion: 1;
  snapshots: OfficialRosterSnapshot[];
  resultsByCourse: Record<string, RosterReconciliationResult[]>;
  lastReconciledAtByCourse: Record<string, string>;
};

const STORAGE_KEY = "bnbu-teacher-roster-reconciliation-demo-v1";
const contextsByCourse = new Map<string, ReconciliationContext>();
let memoryState: MockRosterState | null = null;

function initialState(): MockRosterState {
  return {
    schemaVersion: 1,
    snapshots: createInitialMockRosterSnapshots(),
    resultsByCourse: {},
    lastReconciledAtByCourse: {},
  };
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function readState(): MockRosterState {
  if (typeof window === "undefined") return clone(memoryState ?? initialState());
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<MockRosterState>;
    if (
      parsed.schemaVersion !== 1 ||
      !Array.isArray(parsed.snapshots) ||
      !parsed.resultsByCourse ||
      !parsed.lastReconciledAtByCourse
    ) {
      return initialState();
    }
    return parsed as MockRosterState;
  } catch {
    return clone(memoryState ?? initialState());
  }
}

function persistState(state: MockRosterState): void {
  memoryState = clone(state);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error("MOCK_STORAGE_UNAVAILABLE");
  }
}

export function clearMockRosterReconciliationCache(): void {
  contextsByCourse.clear();
  memoryState = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The next read falls back to the in-memory synthetic state.
  }
}

async function waitForPreview(delay = 90): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
}

function currentRoster(
  state: MockRosterState,
  courseId: string,
): OfficialRosterSnapshot | null {
  return (
    state.snapshots.find(
      (snapshot) =>
        snapshot.version.courseId === courseId && snapshot.version.isCurrent,
    ) ?? null
  );
}

function bundleFor(
  state: MockRosterState,
  courseId: string,
): RosterReconciliationBundle {
  const context = contextsByCourse.get(courseId);
  const roster = currentRoster(state, courseId);
  const results = state.resultsByCourse[courseId] ?? [];
  const members = context?.platformMembers ?? [];
  return {
    currentRoster: roster ? clone(roster) : null,
    versions: state.snapshots
      .filter((snapshot) => snapshot.version.courseId === courseId)
      .map((snapshot) => clone(snapshot.version))
      .sort((left, right) => right.versionNumber - left.versionNumber),
    results: clone(results),
    stats: deriveStats(
      roster,
      results,
      members,
      courseId,
      state.lastReconciledAtByCourse[courseId],
    ),
    platformUpdatedAt: context ? new Date().toISOString() : undefined,
  };
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function identityDifferences(
  official: OfficialRosterStudent,
  member: PlatformCourseMember,
): RosterDifference[] {
  const differences: RosterDifference[] = [];
  if (normalize(official.name) !== normalize(member.name)) {
    differences.push({
      field: "FULL_NAME",
      officialValue: official.name,
      platformValue: member.name,
    });
  }
  if (
    official.gender &&
    member.gender &&
    normalize(official.gender) !== normalize(member.gender)
  ) {
    differences.push({
      field: "GENDER",
      officialValue: official.gender,
      platformValue: member.gender,
    });
  }
  if (
    official.grade &&
    member.grade &&
    normalize(official.grade) !== normalize(member.grade)
  ) {
    differences.push({
      field: "GRADE_YEAR",
      officialValue: official.grade,
      platformValue: member.grade,
    });
  }
  return differences;
}

function resultReason(status: RosterReconciliationStatus): string {
  const reasons: Record<RosterReconciliationStatus, string> = {
    MATCHED: "Mock 核对结果：官方名单与平台成员一致。",
    MISSING_IN_PLATFORM: "Mock 核对结果：官方名单中存在，但平台中尚未加入。",
    EXTRA_IN_PLATFORM: "Mock 核对结果：平台中已加入，但不在本课程官方名单内。",
    WRONG_COURSE: "Mock 核对结果：学号一致，但当前加入了另一门课程。",
    IDENTITY_CONFLICT: "Mock 核对结果：学号一致，但姓名、性别或年级存在差异。",
    DUPLICATED: "Mock 核对结果：同一学号存在多条平台成员记录。",
  };
  return reasons[status];
}

function stableResultId(
  courseId: string,
  official: OfficialRosterStudent | undefined,
  member: PlatformCourseMember | undefined,
  status: RosterReconciliationStatus,
): string {
  return `demo-alignment:${courseId}:${official?.id ?? "none"}:${member?.id ?? "none"}:${status}`;
}

function makeResult(
  courseId: string,
  official: OfficialRosterStudent | undefined,
  member: PlatformCourseMember | undefined,
  status: RosterReconciliationStatus,
  differences: RosterDifference[],
  previous: Map<string, RosterReconciliationResult>,
  updatedAt: string,
): RosterReconciliationResult {
  const id = stableResultId(courseId, official, member, status);
  const prior = previous.get(id);
  return {
    id,
    courseId,
    officialStudent: official,
    platformMember: member,
    status,
    differences,
    reason: resultReason(status),
    resolutionStatus: prior?.resolutionStatus ?? RosterResolutionStatus.PENDING,
    teacherNote: prior?.teacherNote,
    updatedAt,
    version: (prior?.version ?? 0) + 1,
    lastResolutionAction: prior?.lastResolutionAction,
  };
}

/**
 * Synthetic-only matching heuristic for the local teacher preview. The real
 * workspace continues to consume authoritative Backend alignment results.
 */
export function reconcileMockRosters(
  roster: OfficialRosterSnapshot,
  context: ReconciliationContext,
  previousResults: RosterReconciliationResult[] = [],
  updatedAt = new Date().toISOString(),
): RosterReconciliationResult[] {
  const previous = new Map(previousResults.map((result) => [result.id, result]));
  const results: RosterReconciliationResult[] = [];
  const usedMemberIds = new Set<string>();

  for (const official of roster.students) {
    const matches = context.platformMembers.filter(
      (member) => member.studentNumber === official.studentNumber,
    );
    if (matches.length === 0) {
      results.push(
        makeResult(
          context.course.id,
          official,
          undefined,
          RosterReconciliationStatus.MISSING_IN_PLATFORM,
          [],
          previous,
          updatedAt,
        ),
      );
      continue;
    }
    if (matches.length > 1) {
      matches.forEach((member) => usedMemberIds.add(member.id));
      results.push(
        makeResult(
          context.course.id,
          official,
          matches[0],
          RosterReconciliationStatus.DUPLICATED,
          [],
          previous,
          updatedAt,
        ),
      );
      continue;
    }

    const member = matches[0];
    usedMemberIds.add(member.id);
    if (member.courseId !== context.course.id) {
      results.push(
        makeResult(
          context.course.id,
          official,
          member,
          RosterReconciliationStatus.WRONG_COURSE,
          [
            {
              field: "CLASS_SECTION",
              officialValue: context.course.name,
              platformValue:
                context.courses.find((course) => course.id === member.courseId)
                  ?.name ?? member.courseId,
            },
          ],
          previous,
          updatedAt,
        ),
      );
      continue;
    }

    const differences = identityDifferences(official, member);
    results.push(
      makeResult(
        context.course.id,
        official,
        member,
        differences.length > 0
          ? RosterReconciliationStatus.IDENTITY_CONFLICT
          : RosterReconciliationStatus.MATCHED,
        differences,
        previous,
        updatedAt,
      ),
    );
  }

  for (const member of context.platformMembers) {
    if (member.courseId !== context.course.id || usedMemberIds.has(member.id))
      continue;
    results.push(
      makeResult(
        context.course.id,
        undefined,
        member,
        RosterReconciliationStatus.EXTRA_IN_PLATFORM,
        [],
        previous,
        updatedAt,
      ),
    );
  }

  return results;
}

export const rosterMockService: RosterApiAdapter = {
  async getBundle(courseId, context) {
    if (context) contextsByCourse.set(courseId, clone(context));
    await waitForPreview();
    return bundleFor(readState(), courseId);
  },

  async getOfficialRoster(courseId) {
    await waitForPreview();
    return clone(currentRoster(readState(), courseId));
  },

  async getVersions(courseId) {
    await waitForPreview();
    return bundleFor(readState(), courseId).versions;
  },

  async getStats(courseId) {
    await waitForPreview();
    return bundleFor(readState(), courseId).stats;
  },

  async getResults(courseId) {
    await waitForPreview();
    return bundleFor(readState(), courseId).results;
  },

  async importOfficialRoster(input) {
    await waitForPreview(140);
    const validation = validateRosterImport(input.parsed, input.mapping);
    if (validation.validRows === 0) throw new Error("ROSTER_IMPORT_FAILED");

    const state = readState();
    const existing = state.snapshots.filter(
      (snapshot) => snapshot.version.courseId === input.course.id,
    );
    existing.forEach((snapshot) => {
      snapshot.version.isCurrent = false;
    });
    const nextVersion =
      Math.max(0, ...existing.map((snapshot) => snapshot.version.versionNumber)) +
      1;
    const importedAt = new Date().toISOString();
    const duplicatedRows = new Set(
      validation.errors
        .filter((error) => error.code === "DUPLICATE_STUDENT_NUMBER")
        .map((error) => error.rowNumber),
    ).size;
    state.snapshots.push({
      version: {
        id: `demo-roster-${input.course.id}-v${nextVersion}`,
        courseId: input.course.id,
        versionNumber: nextVersion,
        importedAt,
        totalRows: validation.totalRows,
        validRows: validation.validRows,
        invalidRows: validation.invalidRows,
        duplicatedRows,
        isCurrent: true,
        source: "FILE",
        status: "VALIDATED",
        version: 1,
      },
      students: validation.students.map((student, index) => ({
        ...student,
        id: `demo-official-${input.course.id}-v${nextVersion}-${index + 1}`,
        courseId: input.course.id,
        courseName: input.course.name,
        courseCode: input.course.code,
        teachingClassCode: input.course.teachingClassCode,
      })),
    });
    state.resultsByCourse[input.course.id] = [];
    delete state.lastReconciledAtByCourse[input.course.id];
    persistState(state);

    const context = contextsByCourse.get(input.course.id);
    return context
      ? rosterMockService.reconcile(context)
      : bundleFor(state, input.course.id);
  },

  async reconcile(context) {
    await waitForPreview(180);
    contextsByCourse.set(context.course.id, clone(context));
    const state = readState();
    const roster = currentRoster(state, context.course.id);
    if (!roster) throw new Error("NO_OFFICIAL_ROSTER");
    const updatedAt = new Date().toISOString();
    state.resultsByCourse[context.course.id] = reconcileMockRosters(
      roster,
      context,
      state.resultsByCourse[context.course.id] ?? [],
      updatedAt,
    );
    state.lastReconciledAtByCourse[context.course.id] = updatedAt;
    persistState(state);
    return bundleFor(state, context.course.id);
  },

  async updateResolution(courseId, resultIds, resolutionStatus, reason) {
    await waitForPreview();
    const normalizedReason = reason.trim();
    if (!normalizedReason) throw new Error("UNSUPPORTED_RESOLUTION");
    if (
      resolutionStatus !== RosterResolutionStatus.CONFIRMED &&
      resolutionStatus !== RosterResolutionStatus.PENDING
    ) {
      throw new Error("UNSUPPORTED_RESOLUTION");
    }
    const state = readState();
    const ids = new Set(resultIds);
    state.resultsByCourse[courseId] = (
      state.resultsByCourse[courseId] ?? []
    ).map((result) =>
      ids.has(result.id)
        ? {
            ...result,
            resolutionStatus,
            teacherNote: normalizedReason,
            updatedAt: new Date().toISOString(),
            version: result.version + 1,
            lastResolutionAction:
              resolutionStatus === RosterResolutionStatus.CONFIRMED
                ? "CONFIRM"
                : "REOPEN",
          }
        : result,
    );
    persistState(state);
    return bundleFor(state, courseId);
  },
};
