"use client";

import { useCallback, useEffect, useRef } from "react";
import { ADMIN_PERMISSIONS, ADMIN_ROUTE_PERMISSION } from "./admin-domain";
import { adminCopy } from "./admin-i18n";
import { AdminAudit } from "./admin-audit";
import { AdminCourses } from "./admin-courses";
import { AdminHelp } from "./admin-help";
import { AdminOverview } from "./admin-overview";
import { AdminRules } from "./admin-rules";
import { AdminSemesters } from "./admin-semesters";
import { AdminStoreProvider, useAdminStore } from "./admin-store";
import { AdminSupport } from "./admin-support";
import { AdminSystem } from "./admin-system";
import { AdminSubadmins } from "./admin-subadmins";
import { AdminUsers } from "./admin-users";
import { AdminLoadError, AdminLoading } from "./admin-components";
import {
  getCurrentSemesterProjection,
  getSystemModeProjection,
} from "./admin-service";
import {
  TabPageTransition,
  type TabTransitionDirection,
} from "./teacher-tab-page-transition";
import { semesterDisplayName } from "./semester-presentation";
import type { AdminLocale, AdminRoute, AdminState } from "./admin-types";
import type { WorkspaceMode } from "./portal-app";

const adminRoutes: AdminRoute[] = [
  "overview",
  "courses",
  "semesters",
  "accounts",
  "support",
  "rules",
  "system",
  "help",
  "audit",
  "subadmins",
];

function AdminPage({
  active,
  locale,
  mode,
  onNavigate,
}: {
  active: AdminRoute;
  locale: AdminLocale;
  mode: WorkspaceMode;
  onNavigate: (route: AdminRoute) => void;
}) {
  const { state, loading, loadError, refresh } = useAdminStore();
  if (loading) return <AdminLoading locale={locale} />;
  if (loadError)
    return (
      <AdminLoadError
        locale={locale}
        message={loadError}
        retry={() => void refresh()}
      />
    );
  if (!state)
    return (
      <AdminLoadError
        locale={locale}
        message={adminCopy(locale, "load_error")}
        retry={() => void refresh()}
      />
    );
  if (!ADMIN_PERMISSIONS.has(ADMIN_ROUTE_PERMISSION[active])) {
    return (
      <div className="admin-empty-state is-error" role="alert">
        <span>!</span>
        <h2>{adminCopy(locale, "permission_denied")}</h2>
      </div>
    );
  }
  if (active === "courses") return <AdminCourses locale={locale} mode={mode} />;
  if (active === "semesters") return <AdminSemesters locale={locale} />;
  if (active === "accounts") return <AdminUsers locale={locale} />;
  if (active === "support")
    return <AdminSupport locale={locale} />;
  if (active === "rules")
    return <AdminRules locale={locale} />;
  if (active === "system") return <AdminSystem locale={locale} />;
  if (active === "help")
    return <AdminHelp locale={locale} />;
  if (active === "audit") return <AdminAudit locale={locale} />;
  if (active === "subadmins") return <AdminSubadmins locale={locale} mode={mode} />;
  return (
    <AdminOverview
      locale={locale}
      mode={mode}
      onNavigate={onNavigate}
    />
  );
}

export function AdminWorkspace({
  active,
  direction,
  locale,
  mode,
  showToast,
  onNavigate,
  onContextChange,
}: {
  active: string;
  direction: TabTransitionDirection;
  locale: AdminLocale;
  mode: WorkspaceMode;
  showToast: (message: string) => void;
  onNavigate: (route: AdminRoute) => void;
  onContextChange?: (context: {
    semesterName: string;
    notificationCount: number;
    systemMode: AdminState["systemMode"]["mode"];
  }) => void;
}) {
  const route = adminRoutes.includes(active as AdminRoute)
    ? (active as AdminRoute)
    : "overview";
  const backendContextRef = useRef<{
    semesterName?: string;
    systemMode?: AdminState["systemMode"]["mode"];
  }>({});
  const latestNotificationCountRef = useRef(0);

  const publishBackendContext = useCallback(() => {
    onContextChange?.({
      semesterName:
        backendContextRef.current.semesterName ??
        adminCopy(locale, "no_current_semester"),
      notificationCount: latestNotificationCountRef.current,
      systemMode: backendContextRef.current.systemMode ?? "NORMAL",
    });
  }, [locale, onContextChange]);

  useEffect(() => {
    if (mode === "demo") return;
    let cancelled = false;
    void Promise.allSettled([
      getCurrentSemesterProjection(),
      getSystemModeProjection(),
    ]).then(([semester, systemMode]) => {
      if (cancelled) return;
      if (semester.status === "fulfilled")
        backendContextRef.current.semesterName = semesterDisplayName(semester.value);
      if (systemMode.status === "fulfilled")
        backendContextRef.current.systemMode = systemMode.value.mode;
      publishBackendContext();
    });
    return () => {
      cancelled = true;
    };
  }, [mode, publishBackendContext]);

  const handleStateChange = useCallback(
    (state: AdminState) => {
      latestNotificationCountRef.current = state.notifications.length;
      if (mode === "demo") {
        backendContextRef.current.semesterName = semesterDisplayName(
          state.semesters.find((semester) => semester.status === "current"),
          adminCopy(locale, "no_current_semester"),
        );
        backendContextRef.current.systemMode = state.systemMode.mode;
      }
      publishBackendContext();
    },
    [locale, mode, publishBackendContext],
  );
  return (
    <div className="admin-i18n-boundary">
      <AdminStoreProvider
        mode={mode}
        locale={locale}
        showToast={showToast}
        onStateChange={handleStateChange}
      >
        <TabPageTransition
          activeKey={route}
          direction={direction}
          renderPage={(pageKey) => (
            <div className="teacher-page-layout admin-page-layout admin-business-page">
              <AdminPage
                active={pageKey as AdminRoute}
                locale={locale}
                mode={mode}
                onNavigate={onNavigate}
              />
            </div>
          )}
        />
      </AdminStoreProvider>
    </div>
  );
}
