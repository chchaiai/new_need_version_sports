import {
  ApiError,
  currentApiRequestMode,
  request,
  requestFormData,
  requestWithMeta,
} from "./api-client";
import type { components } from "./openapi.generated";
import { parseRosterFile, validateRosterImport } from "./roster-import";
import {
  clearMockRosterReconciliationCache,
  rosterMockService,
} from "./roster-reconciliation-mock-service";
import {
  ROSTER_API_PATHS,
  deriveStats,
  mapAlignmentResult,
  mapRosterEntry,
  mapRosterVersion,
} from "./roster-reconciliation-projection";
import {
  RosterResolutionStatus,
  type ImportOfficialRosterInput,
  type OfficialRosterSnapshot,
  type ParsedRosterFile,
  type ReconciliationContext,
  type RosterApiAdapter,
  type RosterFieldMapping,
  type RosterReconciliationBundle,
  type ValidatedRosterImport,
} from "./roster-reconciliation-types";

type ApiRosterImport = components["schemas"]["OfficialRosterImport"];
type ApiRosterEntry = components["schemas"]["OfficialRosterEntry"];
type ApiAlignmentResult = components["schemas"]["RosterAlignmentResult"];
type ApiAlignmentRun = components["schemas"]["AlignmentRun"];

export {
  ROSTER_API_PATHS,
  deriveStats,
  mapAlignmentResult,
  mapRosterEntry,
  mapRosterVersion,
} from "./roster-reconciliation-projection";

const contextsByCourse = new Map<string, ReconciliationContext>();
const lastAlignmentAtByCourse = new Map<string, string>();
let rosterCacheEpoch = 0;

/** Prevents one signed-in staff account's roster context leaking to another. */
export function clearRosterReconciliationCache(): void {
  rosterCacheEpoch += 1;
  contextsByCourse.clear();
  lastAlignmentAtByCourse.clear();
  clearMockRosterReconciliationCache();
}

async function listAll<T>(
  path: string,
  parameters: Record<string, string> = {},
): Promise<T[]> {
  const output: T[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ ...parameters, limit: "100" });
    if (cursor) query.set("cursor", cursor);
    const response = await requestWithMeta<T[]>(`${path}?${query.toString()}`);
    output.push(...response.data);
    const pagination = response.meta.pagination;
    cursor = pagination?.hasMore ? pagination.nextCursor : null;
  } while (cursor);
  return output;
}

async function loadCurrentRosterImport(
  classSectionId: string,
): Promise<ApiRosterImport | null> {
  try {
    return await request<ApiRosterImport>(
      ROSTER_API_PATHS.currentRoster(classSectionId),
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.code === "ROSTER_IMPORT_NOT_FOUND"
    )
      return null;
    throw error;
  }
}

async function loadBundle(
  classSectionId: string,
  context?: ReconciliationContext,
): Promise<RosterReconciliationBundle> {
  if (context) contextsByCourse.set(classSectionId, context);
  const resolvedContext = context ?? contextsByCourse.get(classSectionId);
  const [currentImport, versionsRaw] = await Promise.all([
    loadCurrentRosterImport(classSectionId),
    listAll<ApiRosterImport>(ROSTER_API_PATHS.rosterVersions(classSectionId), {
      sort: "-versionNumber",
    }),
  ]);
  const versions = versionsRaw.map(mapRosterVersion);
  if (!currentImport) {
    return {
      currentRoster: null,
      versions,
      results: [],
      stats: deriveStats(
        null,
        [],
        resolvedContext?.platformMembers ?? [],
        classSectionId,
      ),
    };
  }

  const [entriesRaw, resultsRaw] = await Promise.all([
    listAll<ApiRosterEntry>(ROSTER_API_PATHS.rosterEntries(currentImport.id), {
      sort: "sourceRowNumber",
    }),
    listAll<ApiAlignmentResult>(ROSTER_API_PATHS.alignmentResults, {
      classSectionId,
      rosterImportId: currentImport.id,
      currentOnly: "true",
      sort: "-createdAt",
    }),
  ]);
  const students = entriesRaw.map((entry) =>
    mapRosterEntry(entry, resolvedContext?.course),
  );
  const currentRoster: OfficialRosterSnapshot = {
    version: mapRosterVersion(currentImport),
    students,
  };
  const entriesById = new Map(students.map((student) => [student.id, student]));
  const members = resolvedContext?.platformMembers ?? [];
  const results = resultsRaw.map((result) =>
    mapAlignmentResult(result, entriesById, members),
  );
  return {
    currentRoster,
    versions,
    results,
    stats: deriveStats(
      currentRoster,
      results,
      members,
      classSectionId,
      lastAlignmentAtByCourse.get(classSectionId),
    ),
  };
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function normalizedCsv(parsed: ParsedRosterFile): Blob {
  const rows = [
    parsed.headers,
    ...parsed.rows.map((row) =>
      parsed.headers.map((header) => row[header] ?? ""),
    ),
  ];
  const body = `\uFEFF${rows
    .map((row) => row.map((value) => csvCell(value)).join(","))
    .join("\r\n")}`;
  return new Blob([body], { type: "text/csv;charset=utf-8" });
}

export class RosterServiceError extends Error {
  readonly code:
    | "NO_OFFICIAL_ROSTER"
    | "ROSTER_IMPORT_FAILED"
    | "UNSUPPORTED_RESOLUTION";

  constructor(
    code:
      | "NO_OFFICIAL_ROSTER"
      | "ROSTER_IMPORT_FAILED"
      | "UNSUPPORTED_RESOLUTION",
  ) {
    super(code);
    this.name = "RosterServiceError";
    this.code = code;
  }
}

export const rosterApiService: RosterApiAdapter = {
  getBundle: loadBundle,

  async getOfficialRoster(courseId) {
    return (await loadBundle(courseId)).currentRoster;
  },

  async getVersions(courseId) {
    return (await loadBundle(courseId)).versions;
  },

  async getStats(courseId) {
    return (await loadBundle(courseId)).stats;
  },

  async getResults(courseId) {
    return (await loadBundle(courseId)).results;
  },

  async importOfficialRoster(input: ImportOfficialRosterInput) {
    const validation = validateRosterImport(input.parsed, input.mapping);
    if (validation.validRows === 0)
      throw new RosterServiceError("ROSTER_IMPORT_FAILED");
    const form = new FormData();
    form.append("source", "FILE");
    form.append("fileFormat", "CSV");
    form.append(
      "fieldMappingSnapshot",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(input.mapping).map(([key, value]) => [
            key,
            value?.trim() || null,
          ]),
        ),
      ),
    );
    const csvName = `${input.parsed.fileName.replace(/\.[^.]+$/, "") || "official-roster"}.csv`;
    form.append("file", normalizedCsv(input.parsed), csvName);
    const imported = await requestFormData<ApiRosterImport>(
      ROSTER_API_PATHS.uploadRoster(input.course.id),
      form,
      { method: "POST" },
    );
    if (imported.status !== "VALIDATED" || !imported.isCurrent)
      throw new RosterServiceError("ROSTER_IMPORT_FAILED");
    return loadBundle(input.course.id);
  },

  async reconcile(context: ReconciliationContext) {
    const operationEpoch = rosterCacheEpoch;
    contextsByCourse.set(context.course.id, context);
    const current = await loadCurrentRosterImport(context.course.id);
    if (!current) throw new RosterServiceError("NO_OFFICIAL_ROSTER");
    const run = await request<ApiAlignmentRun>(ROSTER_API_PATHS.align(current.id), {
      method: "POST",
      body: { expectedRosterImportVersion: current.version },
    });
    if (operationEpoch === rosterCacheEpoch) {
      lastAlignmentAtByCourse.set(
        context.course.id,
        run.completedAt ?? run.startedAt,
      );
    }
    return loadBundle(
      context.course.id,
      operationEpoch === rosterCacheEpoch ? context : undefined,
    );
  },

  async updateResolution(courseId, resultIds, resolutionStatus, reason) {
    const normalizedReason = reason.trim();
    if (!normalizedReason)
      throw new RosterServiceError("UNSUPPORTED_RESOLUTION");
    if (
      resolutionStatus !== RosterResolutionStatus.CONFIRMED &&
      resolutionStatus !== RosterResolutionStatus.PENDING
    )
      throw new RosterServiceError("UNSUPPORTED_RESOLUTION");
    const current = await loadBundle(courseId);
    for (const resultId of resultIds) {
      const result = current.results.find((item) => item.id === resultId);
      if (!result) continue;
      const path =
        resolutionStatus === RosterResolutionStatus.CONFIRMED
          ? ROSTER_API_PATHS.confirm(resultId)
          : ROSTER_API_PATHS.reopen(resultId);
      await request<ApiAlignmentResult>(path, {
        method: "POST",
        body: { reason: normalizedReason, expectedVersion: result.version },
      });
    }
    return loadBundle(courseId);
  },
};

function activeRosterService(): RosterApiAdapter {
  return currentApiRequestMode() === "demo"
    ? rosterMockService
    : rosterApiService;
}

/**
 * Mode-aware facade: the explicit local preview uses synthetic session data,
 * while authenticated workspaces continue to call the authoritative API.
 */
export const rosterReconciliationService: RosterApiAdapter = {
  getBundle: (courseId, context) =>
    activeRosterService().getBundle(courseId, context),
  getOfficialRoster: (courseId) =>
    activeRosterService().getOfficialRoster(courseId),
  getVersions: (courseId) => activeRosterService().getVersions(courseId),
  getStats: (courseId) => activeRosterService().getStats(courseId),
  getResults: (courseId) => activeRosterService().getResults(courseId),
  importOfficialRoster: (input) =>
    activeRosterService().importOfficialRoster(input),
  reconcile: (context) => activeRosterService().reconcile(context),
  updateResolution: (courseId, resultIds, resolutionStatus, reason) =>
    activeRosterService().updateResolution(
      courseId,
      resultIds,
      resolutionStatus,
      reason,
    ),
};

export async function parseOfficialRosterFile(
  file: File,
): Promise<ParsedRosterFile> {
  return parseRosterFile(file);
}

export function validateOfficialRosterFile(
  parsed: ParsedRosterFile,
  mapping: RosterFieldMapping,
): ValidatedRosterImport {
  return validateRosterImport(parsed, mapping);
}
