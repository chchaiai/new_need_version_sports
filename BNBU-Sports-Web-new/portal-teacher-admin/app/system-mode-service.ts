import { ADMIN_STORAGE_EVENT, ADMIN_STORAGE_KEY } from "./admin-domain";
import { createInitialAdminState } from "./admin-mock-data";
import { ApiError, request } from "./api-client";
import type { SystemMode } from "./admin-types";

export type PortalSystemModeStatus = {
  mode: SystemMode;
  policyVersion: number | null;
  updatedAt: string | null;
  checked: boolean;
};

type SystemModeContract = {
  mode?: string;
  policyVersion?: number;
  updatedAt?: string;
};

export const SYSTEM_MODE_POLL_MS = 15_000;
export { ADMIN_STORAGE_EVENT };

export function normalizeSystemModeProjection(
  projection: SystemModeContract | null | undefined,
): PortalSystemModeStatus {
  const mode = String(projection?.mode ?? "").trim().toUpperCase();
  return {
    // Fail closed for missing, retired, and unknown Contract values.
    mode: mode === "NORMAL" ? "NORMAL" : "MAINTENANCE",
    policyVersion: Number.isInteger(projection?.policyVersion)
      ? Number(projection?.policyVersion)
      : null,
    updatedAt:
      typeof projection?.updatedAt === "string" ? projection.updatedAt : null,
    checked: true,
  };
}

export function blockedSystemModeStatus(): PortalSystemModeStatus {
  return {
    mode: "MAINTENANCE",
    policyVersion: null,
    updatedAt: null,
    checked: true,
  };
}

export async function getPublicSystemModeStatus(): Promise<PortalSystemModeStatus> {
  try {
    return normalizeSystemModeProjection(
      await request<SystemModeContract>("/system-mode", { auth: false }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "SYSTEM_MAINTENANCE") {
      return blockedSystemModeStatus();
    }
    throw error;
  }
}

export function readPreviewSystemModeStatus(): PortalSystemModeStatus {
  const fallback = createInitialAdminState();
  if (typeof window === "undefined") {
    return normalizeSystemModeProjection({
      mode: fallback.systemMode.mode,
      policyVersion: fallback.revision || 1,
      updatedAt: fallback.systemMode.changedAt,
    });
  }
  const search = new URLSearchParams(window.location.search);
  const override = (search.get("systemMode") ?? search.get("sysmode"))
    ?.trim()
    .toUpperCase();
  if (override === "NORMAL" || override === "MAINTENANCE") {
    return normalizeSystemModeProjection({ mode: override });
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) throw new Error("preview state is absent");
    const parsed = JSON.parse(raw) as {
      revision?: number;
      systemMode?: { mode?: string; changedAt?: string };
    };
    return normalizeSystemModeProjection({
      mode: parsed.systemMode?.mode,
      policyVersion: parsed.revision,
      updatedAt: parsed.systemMode?.changedAt,
    });
  } catch {
    return normalizeSystemModeProjection({
      mode: fallback.systemMode.mode,
      policyVersion: fallback.revision || 1,
      updatedAt: fallback.systemMode.changedAt,
    });
  }
}
