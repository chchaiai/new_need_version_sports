"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ADMIN_STORAGE_EVENT } from "./admin-domain";
import { adminErrorCopy } from "./admin-i18n";
import { toUserFacingError, type UserFacingError } from "./api-client";
import {
  adminApiErrorText,
  loadAdminState,
  reloadAdminState,
  refreshHealth,
  setAdminDataMode,
  type AdminMutationResult,
} from "./admin-service";
import {
  AdminServiceError,
  type AdminLocale,
  type AdminState,
} from "./admin-types";

type AdminStoreError = {
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
  userFacingError: UserFacingError | null;
};

type AdminStoreValue = {
  mode: "real" | "demo";
  state: AdminState | null;
  loading: boolean;
  loadError: string;
  busyKey: string | null;
  error: AdminStoreError | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  run: <T>(
    key: string,
    operation: () => Promise<AdminMutationResult<T>>,
    successMessage?: string,
  ) => Promise<T | null>;
};

const AdminStoreContext = createContext<AdminStoreValue | null>(null);

function createRealAdminState(): AdminState {
  const checkedAt = new Date(0).toISOString();
  return {
    schemaVersion: 2,
    revision: 0,
    currentAdminId: "",
    semesters: [],
    users: [],
    recoveryRequests: [],
    enduranceRules: [],
    systemMode: {
      mode: "NORMAL",
      reason: "",
      changedAt: checkedAt,
      changedBy: "Backend",
    },
    maintenanceAnnouncements: [],
    helpArticles: [],
    auditLogs: [],
    tickets: [],
    gradeCorrections: [],
    notifications: [],
    health: {
      apiStatus: "DOWN",
      apiLatencyMs: null,
      databaseStatus: "DOWN",
      databaseLatencyMs: null,
      notificationQueueStatus: "DOWN",
      notificationBacklog: 0,
      objectStorageStatus: "DOWN",
      objectStorageLatencyMs: null,
      mediaStorageStatus: "DOWN",
      mediaStorageLatencyMs: null,
      checkedAt,
      requestId: null,
      status: "DOWN",
    },
  };
}

function loadFailureMessage(locale: AdminLocale, failure: unknown) {
  if (failure instanceof AdminServiceError)
    return adminErrorCopy(locale, failure.message);
  return adminApiErrorText(failure, locale);
}

export function AdminStoreProvider({
  mode,
  locale,
  showToast,
  onStateChange,
  children,
}: {
  mode: "real" | "demo";
  locale: AdminLocale;
  showToast: (message: string) => void;
  onStateChange?: (state: AdminState) => void;
  children: ReactNode;
}) {
  const [state, setState] = useState<AdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<AdminStoreError | null>(null);
  const stateRef = useRef<AdminState | null>(null);

  const commitState = useCallback(
    (nextState: AdminState) => {
      stateRef.current = nextState;
      setState(nextState);
      onStateChange?.(nextState);
    },
    [onStateChange],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      if (mode === "demo") {
        commitState(await loadAdminState());
      } else {
        const health = await refreshHealth();
        const current = stateRef.current;
        if (current) commitState({ ...current, health });
      }
    } catch (loadFailure) {
      setLoadError(loadFailureMessage(locale, loadFailure));
    } finally {
      setLoading(false);
    }
  }, [commitState, locale, mode]);

  useEffect(() => {
    setAdminDataMode(mode);
    let cancelled = false;
    const load =
      mode === "demo"
        ? loadAdminState()
        : refreshHealth().then((health) => ({
            ...createRealAdminState(),
            health,
          }));
    load
      .then((nextState) => {
        if (cancelled) return;
        commitState(nextState);
        setLoading(false);
      })
      .catch((loadFailure: unknown) => {
        if (cancelled) return;
        setLoadError(loadFailureMessage(locale, loadFailure));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [commitState, locale, mode]);

  useEffect(() => {
    if (mode !== "demo") return;
    const sync = async (event: Event) => {
      const revision =
        event instanceof CustomEvent
          ? Number(event.detail?.revision)
          : Number.POSITIVE_INFINITY;
      if (
        Number.isFinite(revision) &&
        revision <= (stateRef.current?.revision ?? 0)
      )
        return;
      try {
        commitState(await reloadAdminState());
      } catch {
        // The originating operation already reports storage errors to the user.
      }
    };
    window.addEventListener(ADMIN_STORAGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ADMIN_STORAGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [commitState, mode]);

  const run = useCallback(
    async <T,>(
      key: string,
      operation: () => Promise<AdminMutationResult<T>>,
      successMessage?: string,
    ) => {
      if (busyKey) return null;
      setBusyKey(key);
      setError(null);
      try {
        const result = await operation();
        commitState(result.state);
        if (successMessage) showToast(successMessage);
        return result.value;
      } catch (failure) {
        if (failure instanceof AdminServiceError) {
          const nextError = {
            code: failure.message,
            message: adminErrorCopy(locale, failure.message),
            fieldErrors: failure.fieldErrors,
            userFacingError: null,
          };
          setError(nextError);
          showToast(nextError.message);
        } else {
          const userFacingError = toUserFacingError(failure, locale);
          const fieldErrors = Object.fromEntries(
            userFacingError.fieldErrors.map((item) => [item.field, item.message]),
          );
          setError({
            code: userFacingError.code,
            message: userFacingError.message,
            fieldErrors,
            userFacingError,
          });
          showToast([
            userFacingError.message,
            userFacingError.requestId
              ? `${locale === "en" ? "Diagnostic reference" : "诊断编号"}：${userFacingError.requestId}`
              : null,
          ].filter(Boolean).join(" "));
        }
        return null;
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, commitState, locale, showToast],
  );

  const value = useMemo<AdminStoreValue>(
    () => ({
      mode,
      state,
      loading,
      loadError,
      busyKey,
      error,
      clearError: () => setError(null),
      refresh,
      run,
    }),
    [busyKey, error, loadError, loading, mode, refresh, run, state],
  );

  return (
    <AdminStoreContext.Provider value={value}>
      {children}
    </AdminStoreContext.Provider>
  );
}

export function useAdminStore() {
  const value = useContext(AdminStoreContext);
  if (!value)
    throw new Error("useAdminStore must be used inside AdminStoreProvider");
  return value;
}
