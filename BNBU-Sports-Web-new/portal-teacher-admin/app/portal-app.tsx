"use client";

/* eslint-disable react-hooks/refs -- transient drag data is intentionally kept outside React rendering. */

import {
  ArrowLeft,
  BookOpen,
  CalendarRange,
  CircleAlert,
  CircleHelp,
  CloudOff,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  LayoutDashboard,
  Mail,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TicketCheck,
  UserCog,
  Users,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { flushSync } from "react-dom";
import { AdminWorkspace } from "./admin-workspace";
import { ADMIN_STORAGE_KEY } from "./admin-domain";
import { AppSelect } from "./app-select";
import {
  clearApiSession,
  completeAccountRecovery,
  currentApiRequestMode,
  currentApiSessionEpoch,
  getMe,
  hasApiSession,
  logoutApi,
  passwordLogin,
  requestAccountRecovery,
  setApiRequestMode,
  subscribeSystemMaintenance,
  toUserFacingError,
  userFacingFieldError,
  type CurrentUserData,
  type UserFacingError,
} from "./api-client";
import { adminCopy, adminLabel } from "./admin-i18n";
import { ErrorPanel, localUserFacingError } from "./error-panel";
import { FormField } from "./form-field";
import { LanguageToggle, LocalizedContent, type Locale } from "./language";
import {
  TAB_PAGE_TRANSITION_EXIT_FALLBACK_MS,
  type TabTransitionDirection,
} from "./teacher-tab-page-transition";
import { PageHeader } from "./teacher-ui";
import { TeacherWorkspace } from "./teacher-workspace";
import { clearRosterReconciliationCache } from "./roster-reconciliation-api-service";
import { clearStudentProfileCache } from "./use-student-profile";
import type { AdminRoute, SystemMode } from "./admin-types";
import {
  ADMIN_STORAGE_EVENT,
  SYSTEM_MODE_POLL_MS,
  blockedSystemModeStatus,
  getPublicSystemModeStatus,
  readPreviewSystemModeStatus,
  type PortalSystemModeStatus,
} from "./system-mode-service";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_MAX_WIDTH,
  useResizableSidebar,
  type SidebarRole,
} from "./use-resizable-sidebar";

type Role = SidebarRole;
export type WorkspaceMode = "real" | "demo";
type Theme = "light" | "dark" | "system";
type Tone = "blue" | "green" | "orange" | "red" | "gray" | "review";
type RecoveryStep = "identify" | "reset" | "assistance" | "complete";
type SessionRestorePhase = "checking" | "restoring" | "retryable" | "idle";

export type WorkspaceUser = {
  id: string;
  version: number;
  role: Role;
  name: string;
  account: string;
  department: string;
  email: string;
};

const demoUsers: Record<Role, WorkspaceUser> = {
  teacher: {
    id: "local-review-teacher",
    version: 1,
    role: "teacher",
    name: "测试教师",
    account: "LOCAL-REVIEW-TEACHER",
    department: "本地审查数据",
    email: "teacher.review@bnbu.invalid",
  },
  admin: {
    id: "local-review-admin",
    version: 1,
    role: "admin",
    name: "测试管理员",
    account: "LOCAL-REVIEW-ADMIN",
    department: "本地审查数据",
    email: "admin.review@bnbu.invalid",
  },
};

function workspaceUserFromCurrent(
  current: CurrentUserData,
): WorkspaceUser | null {
  if (current.user.role === "TEACHER" && current.teacherProfile) {
    return {
      id: current.user.id,
      version: current.user.version,
      role: "teacher",
      name: current.teacherProfile.fullName,
      account: current.teacherProfile.employeeNumber,
      department:
        current.teacherProfile.departmentName ??
        current.teacherProfile.collegeName ??
        "—",
      email: current.user.primaryEmailMasked ?? current.user.primaryEmail ?? "",
    };
  }
  if (current.user.role === "ADMIN" && current.adminProfile) {
    return {
      id: current.user.id,
      version: current.user.version,
      role: "admin",
      name: current.adminProfile.fullName,
      account: current.adminProfile.employeeNumber,
      department: current.adminProfile.departmentName ?? "—",
      email: current.user.primaryEmailMasked ?? current.user.primaryEmail ?? "",
    };
  }
  return null;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => unknown;
};

const IS_LOCAL_REVIEW_ENTRY = process.env.NODE_ENV === "development";

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const teacherNav: NavItem[] = [
  { id: "courses", label: "课程管理", icon: BookOpen },
  { id: "roster", label: "学生管理", icon: Users },
  { id: "checkins", label: "打卡审核", icon: ClipboardCheck },
  { id: "grades", label: "内部成绩册", icon: GraduationCap },
  { id: "exemptions", label: "免测与认证", icon: ShieldCheck },
];

const adminNav: NavItem[] = [
  { id: "overview", label: "系统概览", icon: LayoutDashboard },
  { id: "courses", label: "课程目录看板", icon: BookOpen },
  { id: "semesters", label: "学期管理", icon: CalendarRange },
  { id: "accounts", label: "用户与账号", icon: UserCog },
  { id: "subadmins", label: "分管理员设置", icon: KeyRound },
  { id: "support", label: "学生问题反馈", icon: TicketCheck },
  { id: "rules", label: "全局规则", icon: SlidersHorizontal },
  { id: "system", label: "系统模式", icon: Settings },
  { id: "help", label: "帮助中心", icon: CircleHelp },
  { id: "audit", label: "审计日志", icon: ScrollText },
];

const adminRouteIds = new Set<AdminRoute>(
  adminNav.map((item) => item.id as AdminRoute),
);

function adminRouteFromHash(hash: string): AdminRoute | null {
  const match = hash.match(/^#admin\/([^?]+)/);
  const candidate = match?.[1] as AdminRoute | undefined;
  return candidate && adminRouteIds.has(candidate) ? candidate : null;
}

function updateAdminHash(route: AdminRoute) {
  const nextHash = `#admin/${route}`;
  if (window.location.hash === nextHash) return;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${nextHash}`,
  );
}

const pageCopy: Record<
  Role,
  Record<string, { title: string; eyebrow: string; description: string }>
> = {
  teacher: {
    courses: {
      title: "课程管理",
      eyebrow: "教学业务",
      description:
        "管理本人班级与时间窗。已发布课程的门槛由模板锁定；本页不能改公式。邀请按 5–120 分钟生成。",
    },
    roster: {
      title: "学生管理",
      eyebrow: "教学业务",
      description:
        "查看直接加入的课程成员、加入信息、学时进度与当前状态。",
    },
    checkins: {
      title: "打卡审核",
      eyebrow: "教学业务",
      description:
        "按 V8.1 展示通过 / 退回补证 / 无效。退回与判无效必须选择六类固定公开原因；通过与无效仍写入现有接口。退回补证仅作流程设计，正式协议 1.2.0 不会发送写入。",
    },
    grades: {
      title: "内部成绩册",
      eyebrow: "教学业务",
      description: "查看内部成绩投影。换算分、等级和排名不向学生披露。",
    },
    exemptions: {
      title: "免测与组织认证",
      eyebrow: "教学业务",
      description:
        "审核免测与认证。内部自定义分不向学生披露；抵扣字段仍写入现有申请接口。",
    },
  },
  admin: {
    overview: {
      title: "系统概览",
      eyebrow: "管理员工作台",
      description:
        "查看 Backend 实时健康状态与当前可用的管理数据。",
    },
    courses: {
      title: "课程目录看板",
      eyebrow: "教学运行",
      description: "只读查看当前全部课程。不代填成绩，不开放单条打卡下钻。",
    },
    semesters: {
      title: "学期管理",
      eyebrow: "全局治理",
      description: "创建、切换与归档学期。切换当前学期会影响全系统业务范围。",
    },
    accounts: {
      title: "用户与账号",
      eyebrow: "全局治理",
      description: "管理教师和学生账号、恢复申请、验证码解锁与数据删除。",
    },
    subadmins: {
      title: "分管理员设置",
      eyebrow: "权限管理",
      description:
        "设置分管理员账号、初始密码以及可使用的侧边栏标签权限。",
    },
    support: {
      title: "学生问题反馈",
      eyebrow: "反馈管理",
      description:
        "查看学生提交的问题类型和问题描述，并跟踪处理状态。",
    },
    rules: {
      title: "耐力跑换算表",
      eyebrow: "全局治理",
      description:
        "维护四套耐力跑成绩换算规则。学时目标仅由任课教师在教学班内配置。",
    },
    system: {
      title: "系统模式",
      eyebrow: "系统维护",
      description: "在正常、只读和维护模式之间切换；每次变更都写入审计日志。",
    },
    help: {
      title: "帮助中心",
      eyebrow: "内容管理",
      description: "维护面向学生的中英双语帮助内容、关键词与发布状态。",
    },
    audit: {
      title: "审计日志",
      eyebrow: "系统维护",
      description: "追踪关键操作。审计记录只读，不可修改或删除。",
    },
  },
};

const realPageDescription: Record<Role, Record<string, string>> = {
  teacher: {
    courses:
      "查看服务端教学班、成员关系、时间窗与一次性课程邀请。",
    roster:
      "查看真实课程成员、加入状态与服务端成绩进度。",
    checkins:
      "依据服务端记录追加有效或无效。退回补证仅展示流程，当前正式协议不会写入。",
    grades: "刷新内部成绩投影。换算分不向学生披露；客户端不录入或伪造分数。",
    exemptions:
      "审核服务端免测申请；内部自定义分不向学生披露。审核结论不会自动生成分数。",
  },
  admin: {
    overview:
      "查看 Backend 实时健康状态与当前可用的管理数据。",
    courses: "只读汇总当前学期全部教学班、成员关系和有效打卡数据。",
    semesters: "查看服务端当前学期；本地预览完整呈现创建、配置与切换流程。",
    accounts: "查看组织范围内的账号与角色资料；当前 API 不提供账号恢复、解锁或删除操作。",
    subadmins: "设置分管理员账号、初始密码和侧边栏权限；当前预览配置只保存在本浏览器。",
    support: "查看学生端提交的问题类型和问题描述；当前 API 不提供回复或状态变更操作。",
    rules: "维护服务端总学时成绩规则草稿，并执行双管理员审批流程。",
    system: "查看服务端系统模式；本地预览可验证完整的状态切换流程。",
    help: "查看服务端已发布的中英文帮助内容；当前客户端 API 不提供发布能力。",
    audit: "追踪服务端关键操作；审计记录只读，不可修改或删除。",
  },
};

function ThemeControl({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div className="theme-control" aria-label="主题模式">
      {(
        [
          ["light", "浅色"],
          ["dark", "深色"],
          ["system", "跟随系统"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          className={theme === value ? "selected" : ""}
          aria-pressed={theme === value}
          onClick={() => onChange(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function clearPortalAccountCaches(): void {
  clearStudentProfileCache();
  clearRosterReconciliationCache();
}

export function PortalApp() {
  const [clientReady, setClientReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(
    null,
  );
  const [mockDataVersion, setMockDataVersion] = useState(0);
  const [currentUser, setCurrentUser] = useState<WorkspaceUser | null>(null);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<UserFacingError | null>(null);
  const [sessionRestorePhase, setSessionRestorePhase] =
    useState<SessionRestorePhase>("checking");
  const [sessionRestoreError, setSessionRestoreError] =
    useState<UserFacingError | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep | null>(null);
  const [recoveryAccount, setRecoveryAccount] = useState("");
  const [recoveryRole, setRecoveryRole] = useState<"TEACHER" | "ADMIN">(
    "TEACHER",
  );
  const [recoveryId, setRecoveryId] = useState("");
  const [recoveryExpiresAt, setRecoveryExpiresAt] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirmation, setRecoveryPasswordConfirmation] =
    useState("");
  const [recoveryError, setRecoveryError] = useState<UserFacingError | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [locale, setLocale] = useState<Locale>("zh");
  const [active, setActive] = useState("overview");
  const [tabDirection, setTabDirection] =
    useState<TabTransitionDirection>("forward");
  const [tabTransitionVersion, setTabTransitionVersion] = useState(0);
  const [tabScrollTop, setTabScrollTop] = useState(0);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [maintenanceAdminEntry, setMaintenanceAdminEntry] = useState(false);
  const [systemModeStatus, setSystemModeStatus] =
    useState<PortalSystemModeStatus>(() => ({
      mode: "NORMAL",
      policyVersion: null,
      updatedAt: null,
      checked: false,
    }));
  const [adminContext, setAdminContext] = useState<{
    semesterName: string;
    notificationCount: number;
    systemMode: SystemMode;
  }>({
    semesterName: "—",
    notificationCount: 0,
    systemMode: "NORMAL",
  });
  const [teacherSemesterName, setTeacherSemesterName] = useState("—");
  const sidebarController = useResizableSidebar(role ?? "teacher");
  const preferencesRestored = useRef(false);
  const sessionRestoreAttemptRef = useRef(0);
  const themeTransitionTimeoutRef = useRef<number | null>(null);
  const workspaceScrollPositions = useRef<Record<Role, Record<string, number>>>(
    { teacher: {}, admin: {} },
  );
  const sidebarState = sidebarController.sidebar;
  const sidebarWidth = sidebarState.width;
  const isSidebarCollapsed = sidebarState.collapsed;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setClientReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const commitSystemModeStatus = useCallback(
    (status: PortalSystemModeStatus) => {
      setSystemModeStatus(status);
      if (status.mode === "NORMAL") setMaintenanceAdminEntry(false);
      if (role === "admin" && status.checked && status.mode === "MAINTENANCE") {
        setActive("system");
        setModal(null);
        updateAdminHash("system");
      }
    },
    [role],
  );

  const enterWorkspace = useCallback(
    (
      resolvedRole: Role,
      user: WorkspaceUser,
      mode: WorkspaceMode = "real",
    ) => {
      workspaceScrollPositions.current[resolvedRole] = {};
      setTabDirection("forward");
      setTabTransitionVersion(0);
      setTabScrollTop(0);
      setApiRequestMode(mode);
      setSystemModeStatus((current) => ({ ...current, checked: false }));
      setRole(resolvedRole);
      setWorkspaceMode(mode);
      setCurrentUser(user);
      setActive(resolvedRole === "teacher" ? "courses" : "overview");
      if (resolvedRole === "admin") updateAdminHash("overview");
      setLoginError(null);
      setSessionRestoreError(null);
      setSessionRestorePhase("idle");
    },
    [],
  );

  useLayoutEffect(() => {
    if (!preferencesRestored.current) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("bnbu-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!preferencesRestored.current) return;
    window.localStorage.setItem("bnbu-locale", locale);
  }, [locale]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let nextTheme: Theme = "system";
      let nextLocale: Locale = "zh";
      try {
        const storedTheme = window.localStorage.getItem("bnbu-theme");
        if (
          storedTheme === "light" ||
          storedTheme === "dark" ||
          storedTheme === "system"
        )
          nextTheme = storedTheme;
        nextLocale =
          window.localStorage.getItem("bnbu-locale") === "en" ? "en" : "zh";
      } catch {
        // Use deterministic defaults when browser preferences are unavailable.
      }
      preferencesRestored.current = true;
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
      setLocale(nextLocale);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      if (themeTransitionTimeoutRef.current !== null)
        window.clearTimeout(themeTransitionTimeoutRef.current);
    },
    [],
  );

  const handleThemeChange = (nextTheme: Theme) => {
    if (nextTheme === theme) return;
    const root = document.documentElement;
    if (themeTransitionTimeoutRef.current !== null)
      window.clearTimeout(themeTransitionTimeoutRef.current);
    const updateTheme = () =>
      flushSync(() => {
        // The root attribute must change inside the view-transition callback so the
        // browser captures the new palette before the next frame is painted.
        root.dataset.theme = nextTheme;
        setTheme(nextTheme);
      });
    const transitionDocument = document as ViewTransitionDocument;
    if (
      typeof transitionDocument.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      transitionDocument.startViewTransition(updateTheme);
      return;
    }
    root.classList.add("is-theme-transitioning");
    updateTheme();
    themeTransitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove("is-theme-transitioning");
      themeTransitionTimeoutRef.current = null;
    }, 280);
  };

  const restorePersistedSession = useCallback(async () => {
    const attempt = ++sessionRestoreAttemptRef.current;
    const requestedReviewRole = IS_LOCAL_REVIEW_ENTRY
      ? new URLSearchParams(window.location.search).get("mock")
      : null;
    if (
      role ||
      requestedReviewRole === "teacher" ||
      requestedReviewRole === "admin"
    ) {
      setSessionRestorePhase("idle");
      return;
    }

    setApiRequestMode("real");
    setSessionRestoreError(null);
    if (!hasApiSession()) {
      setSessionRestorePhase("idle");
      return;
    }

    setSessionRestorePhase("restoring");
    const expectedEpoch = currentApiSessionEpoch();
    try {
      const current = await getMe();
      if (
        sessionRestoreAttemptRef.current !== attempt ||
        currentApiRequestMode() !== "real" ||
        currentApiSessionEpoch() !== expectedEpoch ||
        !hasApiSession()
      ) {
        return;
      }
      const user = workspaceUserFromCurrent(current);
      if (!user) {
        clearApiSession();
        clearPortalAccountCaches();
        setLoginError(
          localUserFacingError(
            locale === "en"
              ? "This saved session does not belong to a teacher or administrator account."
              : "已保存的会话不属于教师或管理员账号。",
            locale,
          ),
        );
        setSessionRestorePhase("idle");
        return;
      }
      enterWorkspace(user.role, user);
    } catch (error) {
      if (
        sessionRestoreAttemptRef.current !== attempt ||
        currentApiRequestMode() !== "real"
      ) {
        return;
      }
      if (currentApiSessionEpoch() !== expectedEpoch && hasApiSession()) {
        return;
      }
      if (!hasApiSession()) {
        clearPortalAccountCaches();
        setLoginError(toUserFacingError(error, locale));
        setSessionRestorePhase("idle");
        return;
      }

      setSessionRestoreError(toUserFacingError(error, locale));
      setSessionRestorePhase("retryable");
    }
  }, [enterWorkspace, locale, role]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void restorePersistedSession();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      sessionRestoreAttemptRef.current += 1;
    };
  }, [restorePersistedSession]);

  useEffect(() => {
    if (role !== "admin") return;
    const onHashChange = () => {
      const route = adminRouteFromHash(window.location.hash);
      if (!route) {
        setToast(adminCopy(locale, "invalid_route"));
        setActive("overview");
        updateAdminHash("overview");
        return;
      }
      setActive(route);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [locale, role]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  useLayoutEffect(() => {
    if (!role) return;

    const scrollTop = tabScrollTop;
    const restoreScroll = () => {
      window.scrollTo({ top: scrollTop, behavior: "auto" });
    };
    let settledAnimationFrame: number | null = null;
    const transitionSettledTimeout = window.setTimeout(
      restoreScroll,
      TAB_PAGE_TRANSITION_EXIT_FALLBACK_MS,
    );

    restoreScroll();
    const animationFrame = window.requestAnimationFrame(() => {
      restoreScroll();
      settledAnimationFrame = window.requestAnimationFrame(restoreScroll);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (settledAnimationFrame !== null)
        window.cancelAnimationFrame(settledAnimationFrame);
      window.clearTimeout(transitionSettledTimeout);
    };
  }, [active, role, tabScrollTop]);

  const submitLogin = async () => {
    if (isSubmitting) return;
    let expectedEpoch: number | null = null;
    const trimmedAccount = account.trim();
    if (!trimmedAccount || !password.trim()) {
      setLoginError(localUserFacingError(
        locale === "en" ? "Enter both the school email and password." : "请输入学校邮箱与密码后继续。",
        locale,
        ["account", "password"],
      ));
      return;
    }
    setIsSubmitting(true);
    try {
      const session = await passwordLogin(trimmedAccount, password);
      expectedEpoch = currentApiSessionEpoch();
      const apiRole = session.user?.role;
      if (apiRole !== "TEACHER" && apiRole !== "ADMIN") {
        clearApiSession();
        setLoginError(localUserFacingError(
          locale === "en"
            ? "This account is not a teacher or administrator account."
            : "该账号不是教师或管理员，无法登录本平台。",
          locale,
        ));
        return;
      }
      const current = await getMe();
      if (
        currentApiRequestMode() !== "real" ||
        currentApiSessionEpoch() !== expectedEpoch ||
        !hasApiSession()
      ) {
        return;
      }
      const user = workspaceUserFromCurrent(current);
      if (!user || user.role !== (apiRole === "ADMIN" ? "admin" : "teacher")) {
        clearApiSession();
        setLoginError(localUserFacingError(
          locale === "en"
            ? "The account profile does not match the signed-in role. Contact an administrator."
            : "账号资料与登录角色不一致，请联系管理员。",
          locale,
        ));
        return;
      }
      enterWorkspace(user.role, user);
    } catch (error) {
      if (currentApiRequestMode() !== "real") {
        return;
      }
      if (
        expectedEpoch !== null &&
        currentApiSessionEpoch() !== expectedEpoch &&
        hasApiSession()
      ) {
        return;
      }
      setLoginError(toUserFacingError(error, locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  const enterReviewWorkspace = useCallback(
    (reviewRole: Role) => {
      sessionRestoreAttemptRef.current += 1;
      clearApiSession();
      clearPortalAccountCaches();
      setSessionRestoreError(null);
      setSessionRestorePhase("idle");
      setAccount("");
      setPassword("");
      setRecoveryStep(null);
      setMockDataVersion((version) => version + 1);
      enterWorkspace(reviewRole, demoUsers[reviewRole], "demo");
    },
    [enterWorkspace],
  );

  useEffect(() => {
    if (!IS_LOCAL_REVIEW_ENTRY || role) return;
    const requestedRole = new URLSearchParams(window.location.search).get("mock");
    if (requestedRole === "teacher" || requestedRole === "admin") {
      const frame = window.requestAnimationFrame(() =>
        enterReviewWorkspace(requestedRole),
      );
      return () => window.cancelAnimationFrame(frame);
    }
  }, [enterReviewWorkspace, role]);

  useEffect(() => {
    const requestedPreviewRole = IS_LOCAL_REVIEW_ENTRY
      ? new URLSearchParams(window.location.search).get("mock")
      : null;
    const previewMode =
      workspaceMode === "demo" ||
      (!workspaceMode && ["teacher", "admin"].includes(requestedPreviewRole ?? ""));

    if (previewMode) {
      const syncPreviewMode = () => commitSystemModeStatus(readPreviewSystemModeStatus());
      syncPreviewMode();
      window.addEventListener(ADMIN_STORAGE_EVENT, syncPreviewMode);
      window.addEventListener("storage", syncPreviewMode);
      return () => {
        window.removeEventListener(ADMIN_STORAGE_EVENT, syncPreviewMode);
        window.removeEventListener("storage", syncPreviewMode);
      };
    }

    // The unconfigured development login page is a UI preview. Real local
    // integration begins after an authenticated workspace is entered.
    if (IS_LOCAL_REVIEW_ENTRY && workspaceMode === null) {
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      try {
        const status = await getPublicSystemModeStatus();
        if (!cancelled) commitSystemModeStatus(status);
      } catch {
        if (!cancelled) commitSystemModeStatus(blockedSystemModeStatus());
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), SYSTEM_MODE_POLL_MS);
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", refreshVisible);
    const unsubscribe = subscribeSystemMaintenance(() => {
      if (!cancelled) commitSystemModeStatus(blockedSystemModeStatus());
    });
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisible);
      unsubscribe();
    };
  }, [commitSystemModeStatus, workspaceMode]);

  const resetMockWorkspace = () => {
    if (!role || workspaceMode !== "demo") return;
    clearPortalAccountCaches();
    if (role === "admin") window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    setMockDataVersion((version) => version + 1);
    setActive(role === "teacher" ? "courses" : "overview");
    if (role === "admin") updateAdminHash("overview");
    setToast(locale === "en" ? "Preview data reset." : "预览数据已复位。");
  };

  const leaveWorkspace = (clearIdentity: boolean) => {
    clearPortalAccountCaches();
    sessionRestoreAttemptRef.current += 1;
    setApiRequestMode("real");
    setSessionRestoreError(null);
    setSessionRestorePhase("idle");
    if (workspaceMode === "demo") {
      const url = new URL(window.location.href);
      url.searchParams.delete("mock");
      url.hash = "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    } else if (role === "admin") {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    setRole(null);
    setWorkspaceMode(null);
    setCurrentUser(null);
    setPassword("");
    setShowPassword(false);
    setIsSubmitting(false);
    setActive("overview");
    setTabTransitionVersion(0);
    setTabScrollTop(0);
    setModal(null);
    setMaintenanceAdminEntry(false);
    setSystemModeStatus({
      mode: "NORMAL",
      policyVersion: null,
      updatedAt: null,
      checked: IS_LOCAL_REVIEW_ENTRY,
    });
    if (clearIdentity) {
      setAccount("");
      setRecoveryAccount("");
      setRecoveryCode("");
      setRecoveryPassword("");
      setRecoveryPasswordConfirmation("");
      setRecoveryId("");
      setRecoveryExpiresAt("");
    }
  };

  const logout = () => {
    if (hasApiSession()) void logoutApi();
    leaveWorkspace(false);
  };

  const useAnotherAccount = () => {
    sessionRestoreAttemptRef.current += 1;
    clearApiSession();
    clearPortalAccountCaches();
    setSessionRestoreError(null);
    setSessionRestorePhase("idle");
  };

  const startRecovery = (
    requestedRole: "TEACHER" | "ADMIN",
    requestedAccount: string,
  ) => {
    setRecoveryAccount(requestedAccount);
    setRecoveryRole(requestedRole);
    setRecoveryId("");
    setRecoveryExpiresAt("");
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryPasswordConfirmation("");
    setRecoveryError(null);
    setRecoveryBusy(false);
    setRecoveryStep("identify");
  };

  const openRecovery = () => {
    startRecovery("TEACHER", account.trim());
  };

  const openPasswordSettingsFromWorkspace = async () => {
    const requestedRole = role === "admin" ? "ADMIN" : "TEACHER";
    const visibleEmail = currentUser?.email.trim() ?? "";
    const requestedAccount = visibleEmail.includes("*") ? "" : visibleEmail;
    startRecovery(requestedRole, requestedAccount);
  };

  const resetPasswordSettings = () => {
    setRecoveryAccount("");
    setRecoveryId("");
    setRecoveryExpiresAt("");
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryPasswordConfirmation("");
    setRecoveryError(null);
    setRecoveryBusy(false);
    setRecoveryStep(null);
  };

  const previewPasswordVerificationStep = () => {
    setRecoveryError(null);
    setRecoveryStep("reset");
  };

  const returnToPasswordIdentification = () => {
    setRecoveryId("");
    setRecoveryExpiresAt("");
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryPasswordConfirmation("");
    setRecoveryError(null);
    setRecoveryBusy(false);
    setRecoveryStep("identify");
  };

  const returnToLogin = () => {
    setRecoveryStep(null);
    setRecoveryError(null);
  };

  const sendRecoveryCode = async () => {
    if (recoveryBusy) return;
    const recoveryEmail = recoveryAccount.trim();
    if (!/^\S+@\S+\.\S+$/.test(recoveryEmail)) {
      setRecoveryError(localUserFacingError(
        locale === "en" ? "Enter the complete email address linked to the account." : "请输入账号已绑定的完整邮箱地址。",
        locale,
        ["account"],
      ));
      return;
    }
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      const accepted = await requestAccountRecovery({
        account: recoveryEmail,
        requestedRole: recoveryRole,
        locale: locale === "en" ? "en" : "zh-CN",
      });
      setRecoveryId(accepted.recoveryId);
      setRecoveryExpiresAt(accepted.expiresAt);
      setRecoveryStep("reset");
    } catch (error) {
      setRecoveryError(toUserFacingError(error, locale));
    } finally {
      setRecoveryBusy(false);
    }
  };

  const resetPassword = async () => {
    if (recoveryBusy) return;
    if (!recoveryId) {
      setRecoveryError(localUserFacingError(
        locale === "en" ? "This recovery request is no longer valid. Start again from sign-in." : "密码恢复请求已失效，请返回登录页后重新发起。",
        locale,
      ));
      return;
    }
    if (!/^\d{4,10}$/.test(recoveryCode)) {
      setRecoveryError(localUserFacingError(
        locale === "en" ? "Enter the 4–10 digit verification code from the email." : "请输入邮箱收到的 4–10 位数字验证码。",
        locale,
        ["verificationCode"],
      ));
      return;
    }
    if (recoveryPassword.length === 0) {
      setRecoveryError(localUserFacingError(
        locale === "en" ? "Enter a new personal password." : "请输入新的个人密码。",
        locale,
        ["newPassword"],
      ));
      return;
    }
    if (recoveryPassword !== recoveryPasswordConfirmation) {
      setRecoveryError(localUserFacingError(
        locale === "en" ? "The two new passwords do not match." : "两次输入的新密码不一致。",
        locale,
        ["passwordConfirmation"],
      ));
      return;
    }
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      await completeAccountRecovery({
        recoveryId,
        verificationCode: recoveryCode,
        newPassword: recoveryPassword,
      });
      setAccount(recoveryAccount.trim());
      setRecoveryStep("complete");
    } catch (error) {
      setRecoveryError(toUserFacingError(error, locale));
    } finally {
      setRecoveryBusy(false);
    }
  };

  const requestedReviewRole = IS_LOCAL_REVIEW_ENTRY && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("mock")
    : null;
  const teacherModeGate = role === "teacher" && (
    !systemModeStatus.checked || systemModeStatus.mode === "MAINTENANCE"
  );
  const preAuthModeGate = role === null && !maintenanceAdminEntry && (
    (!systemModeStatus.checked && (!IS_LOCAL_REVIEW_ENTRY || Boolean(requestedReviewRole))) ||
    (systemModeStatus.checked && systemModeStatus.mode === "MAINTENANCE")
  );

  if (!clientReady) {
    return (
      <PortalMaintenancePage
        status={{
          mode: "NORMAL",
          policyVersion: null,
          updatedAt: null,
          checked: false,
        }}
        allowAdminAccess={false}
        onAdminAccess={() => {}}
      />
    );
  }

  if (teacherModeGate || preAuthModeGate) {
    return (
      <PortalMaintenancePage
        status={systemModeStatus}
        allowAdminAccess={
          preAuthModeGate &&
          systemModeStatus.checked &&
          systemModeStatus.mode === "MAINTENANCE" &&
          !requestedReviewRole
        }
        onAdminAccess={() => setMaintenanceAdminEntry(true)}
      />
    );
  }

  if (role === null && sessionRestorePhase !== "idle") {
    return (
      <LocalizedContent locale={locale}>
        <PortalSessionRestorePage
          phase={sessionRestorePhase}
          error={sessionRestoreError}
          locale={locale}
          onRetry={() => void restorePersistedSession()}
          onUseAnotherAccount={useAnotherAccount}
        />
      </LocalizedContent>
    );
  }

  if (!role || !workspaceMode || !currentUser) {
    return (
      <LocalizedContent locale={locale}>
        <main className="login-shell">
          <header className="login-topbar">
            <LoginWordmark />
            <div className="topbar-controls">
              <LanguageToggle locale={locale} onChange={setLocale} />
              <ThemeControl theme={theme} onChange={handleThemeChange} />
            </div>
          </header>
          <section className="login-layout">
            <section
              className={`login-card ${recoveryStep ? "login-card-recovery" : ""}`}
              aria-labelledby="login-title"
            >
              <div className="login-brand">
                <span className="login-logo-surface">
                  <Image
                    className="login-logo"
                    src="/branding/sports-logo.png"
                    alt="体育课程管理平台标志"
                    width={104}
                    height={104}
                    priority
                    unoptimized
                  />
                </span>
                <p className="login-platform-name">体育课程管理平台</p>
                <p className="login-school-name">北师香港浸会大学</p>
              </div>
              {!recoveryStep ? (
                <>
                  <div className="login-card-head">
                    <h1 id="login-title">登录管理平台</h1>
                    <p>使用学校分配的教师或管理员账号登录。</p>
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitLogin();
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key !== "Enter" ||
                        event.nativeEvent.isComposing ||
                        !(event.target instanceof HTMLInputElement)
                      )
                        return;
                      event.preventDefault();
                      void submitLogin();
                    }}
                  >
                    <FormField
                      label="学校邮箱"
                      required
                      controlId="login-account"
                      error={userFacingFieldError(loginError, "account", "email")}
                    >
                      <input
                        id="login-account"
                        type="email"
                        value={account}
                        onChange={(event) => {
                          setAccount(event.target.value);
                          setLoginError(null);
                        }}
                        placeholder="请输入学校邮箱"
                        autoComplete="username"
                        aria-describedby={loginError ? "login-error" : undefined}
                        aria-invalid={Boolean(userFacingFieldError(loginError, "account", "email"))}
                      />
                    </FormField>
                    <FormField
                      label="密码"
                      required
                      controlId="login-password"
                      error={userFacingFieldError(loginError, "password")}
                      enhanceControl={false}
                    >
                      <span className="password-field">
                        <input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => {
                            setPassword(event.target.value);
                            setLoginError(null);
                          }}
                          placeholder="请输入密码"
                          autoComplete="current-password"
                          required
                          aria-required="true"
                          aria-describedby={[
                            userFacingFieldError(loginError, "password") ? "login-password-error" : null,
                            loginError ? "login-error" : null,
                          ].filter(Boolean).join(" ") || undefined}
                          aria-invalid={Boolean(userFacingFieldError(loginError, "password"))}
                        />
                        <button
                          className="password-visibility"
                          type="button"
                          aria-label="显示或隐藏密码"
                          aria-pressed={showPassword}
                          aria-controls="login-password"
                          onClick={() => setShowPassword((visible) => !visible)}
                        >
                          {showPassword ? (
                            <EyeOff aria-hidden="true" />
                          ) : (
                            <Eye aria-hidden="true" />
                          )}
                        </button>
                      </span>
                    </FormField>
                    <ErrorPanel id="login-error" error={loginError} locale={locale} />
                    <button
                      className="primary-button full-button"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "正在登录…" : "登录"}
                    </button>
                  </form>
                  <button
                    className="text-button forgot-button"
                    type="button"
                    onClick={openRecovery}
                  >
                    忘记密码或无法登录？
                  </button>
                  {IS_LOCAL_REVIEW_ENTRY && (
                    <details
                      className="review-access"
                    >
                      <summary className="review-access-heading">
                        <span className="review-access-icon" aria-hidden="true">
                          <Eye size={17} strokeWidth={2} />
                        </span>
                        <div>
                          <small>
                            {locale === "en" ? "DEVELOPMENT PREVIEW" : "开发预览"}
                          </small>
                          <h2 id="review-access-title">
                            {locale === "en"
                              ? "Skip sign-in"
                              : "跳过登录"}
                          </h2>
                        </div>
                        <ChevronRight
                          className="review-access-chevron"
                          size={17}
                          aria-hidden="true"
                        />
                      </summary>
                      <p>
                        {locale === "en"
                          ? "Open the complete teacher or administrator workspace without signing in. Preview data stays in this browser."
                          : "无需登录即可打开完整教师端或管理端界面；预览数据只保留在当前浏览器。"}
                      </p>
                      <div
                        className="review-access-actions"
                        role="group"
                        aria-label={
                          locale === "en"
                            ? "Workspaces available without sign-in"
                            : "可跳过登录查看的工作区"
                        }
                      >
                        <button
                          type="button"
                          onClick={() => enterReviewWorkspace("teacher")}
                        >
                          <strong>
                            {locale === "en" ? "View teacher workspace" : "跳过登录查看教师端"}
                          </strong>
                          <small>
                            {locale === "en"
                              ? "Courses and reviews"
                              : "课程与审核流程"}
                          </small>
                        </button>
                        <button
                          type="button"
                          onClick={() => enterReviewWorkspace("admin")}
                        >
                          <strong>
                            {locale === "en" ? "View administrator workspace" : "跳过登录查看管理端"}
                          </strong>
                          <small>
                            {locale === "en"
                              ? "Governance workspace"
                              : "系统治理工作台"}
                          </small>
                        </button>
                      </div>
                    </details>
                  )}
                  <p className="security-note">
                    {locale === "en"
                      ? "Formal sign-in still uses Backend authentication and authorization only."
                      : "正式登录仍仅使用后端认证与授权数据，并根据账号权限进入对应工作台"}
                  </p>
                </>
              ) : (
                <PasswordRecovery
                  step={recoveryStep}
                  account={recoveryAccount}
                  requestedRole={recoveryRole}
                  expiresAt={recoveryExpiresAt}
                  code={recoveryCode}
                  password={recoveryPassword}
                  passwordConfirmation={recoveryPasswordConfirmation}
                  error={recoveryError}
                  locale={locale}
                  busy={recoveryBusy}
                  onAccountChange={(value) => {
                    setRecoveryAccount(value);
                    setRecoveryError(null);
                  }}
                  onRequestedRoleChange={(value) => {
                    setRecoveryRole(value);
                    setRecoveryError(null);
                  }}
                  onCodeChange={(value) => {
                    setRecoveryCode(value);
                    setRecoveryError(null);
                  }}
                  onPasswordChange={(value) => {
                    setRecoveryPassword(value);
                    setRecoveryError(null);
                  }}
                  onPasswordConfirmationChange={(value) => {
                    setRecoveryPasswordConfirmation(value);
                    setRecoveryError(null);
                  }}
                  onBack={returnToLogin}
                  onSendCode={() => void sendRecoveryCode()}
                  onResetPassword={() => void resetPassword()}
                  onOpenAssistance={() => {
                    setRecoveryError(null);
                    setRecoveryStep("assistance");
                  }}
                />
              )}
            </section>
          </section>
          {toast && (
            <div className="toast" role="status">
              {toast}
            </div>
          )}
        </main>
      </LocalizedContent>
    );
  }

  const displayUser = currentUser;
  const nav = role === "teacher"
    ? teacherNav
    : systemModeStatus.mode === "MAINTENANCE"
      ? adminNav.filter((item) => item.id === "system")
      : adminNav;
  const baseCopy =
    pageCopy[role][active] ??
    pageCopy[role][role === "teacher" ? "courses" : "overview"];
  const copy = {
    ...baseCopy,
    ...(role === "admin" && active === "rules"
      ? { title: "全局规则" }
      : {}),
    description:
      workspaceMode === "demo"
        ? locale === "en"
          ? "Review this workspace with synthetic local data. It does not connect to the real Backend."
          : `${baseCopy.description} 当前为本地合成数据，不连接真实 Backend。`
        : realPageDescription[role][active] ?? baseCopy.description,
  };
  const isCourseManagement = role === "teacher" && active === "courses";
  const isFocusedTeacherPage =
    role === "teacher" &&
    ["roster", "checkins", "grades", "exemptions"].includes(active);
  const isFocusedWorkspace = role === "admin" || isFocusedTeacherPage;

  const navigateTo = (nextActive: string) => {
    if (nextActive === active) return;

    workspaceScrollPositions.current[role][active] = window.scrollY;
    const nextScrollTop =
      workspaceScrollPositions.current[role][nextActive] ?? 0;
    const roleNav = role === "teacher" ? teacherNav : adminNav;
    const currentIndex = roleNav.findIndex((item) => item.id === active);
    const nextIndex = roleNav.findIndex((item) => item.id === nextActive);

    if (currentIndex >= 0 && nextIndex >= 0) {
      setTabDirection(nextIndex > currentIndex ? "forward" : "backward");
    }
    setTabTransitionVersion((version) => version + 1);
    setTabScrollTop(nextScrollTop);

    setActive(nextActive);
    if (role === "admin" && adminRouteIds.has(nextActive as AdminRoute))
      updateAdminHash(nextActive as AdminRoute);
  };

  return (
    <LocalizedContent locale={locale}>
      <div
        ref={sidebarController.setShellNode}
        className={`app-shell app-shell-tabbed-workspace app-shell-${role} ${isCourseManagement ? "app-shell-course-management" : ""} ${isFocusedWorkspace ? "app-shell-focused-workspace" : ""} ${isSidebarCollapsed ? "is-sidebar-collapsed" : ""} ${sidebarController.isResizing ? "is-resizing-sidebar" : ""} ${sidebarController.isTransitioning ? "is-sidebar-transitioning" : ""} ${sidebarController.isInitialized ? "is-sidebar-initialized" : "is-sidebar-initializing"}`}
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
            "--sidebar-content-visibility": isSidebarCollapsed ? 0 : 1,
          } as CSSProperties
        }
      >
        <aside className="sidebar" id={`${role}-sidebar`}>
          <SportsBrand />
          <div className="workspace-label">
            <span>{role === "teacher" ? "教师空间" : "管理空间"}</span>
            {workspaceMode === "demo" ? (
              <Badge tone="review">TEST</Badge>
            ) : (
              role === "admin" && <Badge tone="green">ADMIN</Badge>
            )}
          </div>
          <nav aria-label="主要导航">
            {nav.map((item) => {
              const NavIcon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={active === item.id ? "active" : ""}
                  aria-current={active === item.id ? "page" : undefined}
                  aria-label={item.label}
                  title={isSidebarCollapsed ? item.label : undefined}
                  onClick={() => navigateTo(item.id)}
                >
                  <i className="sidebar-nav-icon" aria-hidden="true">
                    <NavIcon size={21} strokeWidth={1.8} />
                  </i>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            {role === "teacher" ? (
              <button
                className="profile-button teacher-profile-card sidebar-profile-card"
                type="button"
                aria-label={
                  locale === "en"
                    ? `Open ${displayUser.name}'s profile`
                    : `打开${displayUser.name}的用户信息`
                }
                aria-describedby={
                  isSidebarCollapsed ? "teacher-profile-tooltip" : undefined
                }
                onClick={() => setModal("profile")}
              >
                <span
                  className="avatar teacher-profile-avatar"
                  aria-hidden="true"
                >
                  {displayUser.name.trim().slice(0, 1) || "师"}
                </span>
                <span className="teacher-profile-copy">
                  <b>{displayUser.name}</b>
                  <small>
                    {displayUser.department} · {displayUser.account}
                  </small>
                </span>
                <span
                  className="teacher-profile-tooltip"
                  id="teacher-profile-tooltip"
                  role="tooltip"
                >
                  <b>{displayUser.name}</b>
                  <small>
                    {displayUser.department} · {displayUser.account}
                  </small>
                </span>
              </button>
            ) : (
              <button
                className="profile-button sidebar-profile-card"
                type="button"
                aria-label={
                  locale === "en"
                    ? `Open ${displayUser.name}'s profile`
                    : `打开${displayUser.name}的用户信息`
                }
                onClick={() => setModal("profile")}
              >
                <span className="avatar">
                  {displayUser.name.trim().slice(0, 1) || "管"}
                </span>
                <span>
                  <b>{displayUser.name}</b>
                  <small>
                    {displayUser.email ||
                      `${displayUser.department} · ${displayUser.account}`}
                  </small>
                </span>
                <i>•••</i>
              </button>
            )}
          </div>
          <button
            className="sidebar-collapse-button"
            type="button"
            aria-controls={`${role}-sidebar`}
            aria-label={isSidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
            aria-expanded={!isSidebarCollapsed}
            title={isSidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
            onClick={sidebarController.toggle}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={16} strokeWidth={2} />
            ) : (
              <ChevronLeft size={16} strokeWidth={2} />
            )}
          </button>
          <div
            className="sidebar-resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="调整导航栏宽度"
            aria-controls={`${role}-sidebar`}
            aria-valuemin={SIDEBAR_COLLAPSED_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuenow={sidebarWidth}
            aria-valuetext={
              isSidebarCollapsed
                ? "导航栏已折叠"
                : `导航栏宽度 ${sidebarWidth} 像素`
            }
            tabIndex={0}
            onPointerDown={sidebarController.startResize}
            onPointerMove={sidebarController.moveResize}
            onPointerUp={(event) =>
              sidebarController.finishResize(event.pointerId)
            }
            onPointerCancel={(event) =>
              sidebarController.finishResize(event.pointerId, true)
            }
            onKeyDown={sidebarController.resizeWithKeyboard}
          />
        </aside>
        <main className="workspace">
          {workspaceMode === "demo" && (
            <div className="review-mode-banner" role="status">
              <span className="review-mode-icon" aria-hidden="true">
                <ShieldCheck size={18} strokeWidth={2} />
              </span>
              <span className="review-mode-copy">
                <b>
                  {locale === "en"
                    ? "Sign-in skipped for preview"
                    : "免登录预览模式"}
                </b>
                <small>
                  {locale === "en"
                    ? "The complete interface uses local preview data and does not send business writes to the real Backend."
                    : "完整界面使用本地预览数据，不会向真实 Backend 发送业务写入。"}
                </small>
              </span>
              <span className="review-mode-actions">
                <button type="button" onClick={resetMockWorkspace}>
                  {locale === "en" ? "Reset preview" : "复位预览"}
                </button>
                <button type="button" onClick={logout}>
                  {locale === "en" ? "Back to sign-in" : "返回登录"}
                </button>
              </span>
            </div>
          )}
          <PageHeader
            className={`workspace-header-tabbed ${role === "teacher" ? "workspace-header-teacher" : "workspace-header-admin"} ${isCourseManagement ? "workspace-header-course" : ""} ${isFocusedWorkspace ? "workspace-header-focused" : ""}`}
            title={copy.title}
            eyebrow={isFocusedWorkspace ? undefined : copy.eyebrow}
            transitionKey={
              tabTransitionVersion > 0
                ? `${active}-${tabTransitionVersion}`
                : undefined
            }
            transitionDirection={tabDirection}
            actions={
              <>
                <div
                  className="workspace-school-mark"
                  aria-label="北师香港浸会大学"
                >
                  <Image src="/bnbu-emblem.svg" alt="" width={34} height={34} />
                  <span>
                    <b>北师香港浸会大学</b>
                    <small>BNBU 校园体育</small>
                  </span>
                </div>
                <div className="semester-pill">
                  <span>当前学期</span>
                  <b>
                    {role === "admin"
                      ? adminContext.semesterName
                      : teacherSemesterName}
                  </b>
                </div>
                {role === "admin" && adminContext.systemMode !== "NORMAL" && (
                  <Badge
                    tone="red"
                  >
                    {adminLabel(locale, "systemMode", adminContext.systemMode)}
                  </Badge>
                )}
                <LanguageToggle locale={locale} onChange={setLocale} compact />
                <ThemeControl theme={theme} onChange={handleThemeChange} />
                <button
                  className="icon-button"
                  aria-label="通知"
                  type="button"
                  onClick={() =>
                    setToast(
                      role === "admin" && adminContext.notificationCount
                        ? adminCopy(locale, "system_notifications", {
                            count: adminContext.notificationCount,
                          })
                        : adminCopy(locale, "no_system_notifications"),
                    )
                  }
                >
                  ◌
                  {role === "admin" && adminContext.notificationCount > 0 ? (
                    <span />
                  ) : null}
                </button>
              </>
            }
          />
          <section className="page-content">
            {role === "teacher" ? (
              <TeacherWorkspace
                key={`teacher-${mockDataVersion}`}
                active={active}
                direction={tabDirection}
                mode={workspaceMode}
                showToast={setToast}
                onSemesterChange={setTeacherSemesterName}
              />
            ) : (
              <AdminWorkspace
                key={`admin-${mockDataVersion}`}
                active={active}
                direction={tabDirection}
                locale={locale}
                mode={workspaceMode}
                showToast={setToast}
                onNavigate={(route) => navigateTo(route)}
                onContextChange={setAdminContext}
              />
            )}
          </section>
        </main>
        {modal && (
          <Modal
            role={role}
            mode={workspaceMode}
            user={displayUser}
            locale={locale}
            recoveryStep={
              recoveryStep === "reset" || recoveryStep === "complete"
                ? recoveryStep
                : "identify"
            }
            recoveryAccount={recoveryAccount}
            recoveryExpiresAt={recoveryExpiresAt}
            recoveryCode={recoveryCode}
            recoveryPassword={recoveryPassword}
            recoveryPasswordConfirmation={recoveryPasswordConfirmation}
            recoveryError={recoveryError}
            recoveryBusy={recoveryBusy}
            close={() => {
              resetPasswordSettings();
              setModal(null);
            }}
            logout={logout}
            openPasswordSettings={openPasswordSettingsFromWorkspace}
            resetPasswordSettings={resetPasswordSettings}
            returnToPasswordIdentification={returnToPasswordIdentification}
            onAccountChange={(value) => {
              setRecoveryAccount(value);
              setRecoveryError(null);
            }}
            onCodeChange={(value) => {
              setRecoveryCode(value);
              setRecoveryError(null);
            }}
            onPasswordChange={(value) => {
              setRecoveryPassword(value);
              setRecoveryError(null);
            }}
            onPasswordConfirmationChange={(value) => {
              setRecoveryPasswordConfirmation(value);
              setRecoveryError(null);
            }}
            onSendCode={
              workspaceMode === "demo"
                ? previewPasswordVerificationStep
                : () => void sendRecoveryCode()
            }
            onResetPassword={() => void resetPassword()}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </LocalizedContent>
  );
}

function PortalSessionRestorePage({
  phase,
  error,
  locale,
  onRetry,
  onUseAnotherAccount,
}: {
  phase: Exclude<SessionRestorePhase, "idle">;
  error: UserFacingError | null;
  locale: Locale;
  onRetry: () => void;
  onUseAnotherAccount: () => void;
}) {
  const retryable = phase === "retryable";
  return (
    <main className="portal-maintenance-shell" aria-live="polite">
      <section className="portal-maintenance-card" role="status">
        <span className="portal-maintenance-icon" aria-hidden="true">
          <KeyRound size={52} strokeWidth={1.8} />
        </span>
        <p className="portal-maintenance-kicker">BNBU SPORTS</p>
        <h1>
          {retryable ? "登录状态已保留" : "正在恢复登录状态"}
          <small>
            {retryable
              ? "Your session is still saved"
              : "Restoring your session"}
          </small>
        </h1>
        <p>
          {retryable
            ? "当前暂时无法连接服务，已保存的登录凭据不会被删除。"
            : "正在核验已保存的登录凭据，请稍候。"}
        </p>
        {retryable && (
          <>
            <div className="portal-session-restore-error">
              <ErrorPanel error={error} locale={locale} />
            </div>
            <div className="portal-session-restore-actions">
              <button type="button" onClick={onRetry}>
                重试恢复
              </button>
              <button type="button" onClick={onUseAnotherAccount}>
                使用其他账号
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function PortalMaintenancePage({
  status,
  allowAdminAccess,
  onAdminAccess,
}: {
  status: PortalSystemModeStatus;
  allowAdminAccess: boolean;
  onAdminAccess: () => void;
}) {
  const checking = !status.checked;
  return (
    <main className="portal-maintenance-shell" aria-live="polite">
      <section className="portal-maintenance-card" role="status">
        <span className="portal-maintenance-icon" aria-hidden="true">
          <CloudOff size={52} strokeWidth={1.8} />
        </span>
        <p className="portal-maintenance-kicker">BNBU SPORTS</p>
        <h1>
          {checking ? "正在确认系统状态" : "系统维护中"}
          <small>{checking ? "Checking system status" : "System maintenance"}</small>
        </h1>
        <p>
          {checking
            ? "正在读取服务端最新运行状态，确认完成前所有业务入口保持关闭。"
            : "普通学生与教师业务暂不可用，请等待授权管理员恢复系统。"}
        </p>
        <p lang="en">
          {checking
            ? "All business entry points remain closed until the latest server status is confirmed."
            : "Student and teacher features are temporarily unavailable until an authorised administrator restores service."}
        </p>
        {!checking && (
          <div className="portal-maintenance-meta">
            <span>预计恢复时间：请留意管理员后续通知</span>
            <span lang="en">Estimated recovery: watch for an administrator update</span>
            {status.updatedAt && <code>Updated: {status.updatedAt}</code>}
          </div>
        )}
        {allowAdminAccess && (
          <button type="button" onClick={onAdminAccess}>
            管理员治理入口 · Administrator access
          </button>
        )}
      </section>
    </main>
  );
}

function LoginWordmark() {
  return (
    <p
      className="login-wordmark"
      aria-label="北师香港浸会大学 · 体育课程管理平台"
    >
      北师香港浸会大学 · 体育课程管理平台
    </p>
  );
}

function PasswordRecovery({
  step,
  account,
  requestedRole,
  expiresAt,
  code,
  password,
  passwordConfirmation,
  error,
  locale,
  busy,
  onAccountChange,
  onRequestedRoleChange,
  onCodeChange,
  onPasswordChange,
  onPasswordConfirmationChange,
  onBack,
  onSendCode,
  onResetPassword,
  onOpenAssistance,
}: {
  step: RecoveryStep;
  account: string;
  requestedRole: "TEACHER" | "ADMIN";
  expiresAt: string;
  code: string;
  password: string;
  passwordConfirmation: string;
  error: UserFacingError | null;
  locale: Locale;
  busy: boolean;
  onAccountChange: (value: string) => void;
  onRequestedRoleChange: (value: "TEACHER" | "ADMIN") => void;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmationChange: (value: string) => void;
  onBack: () => void;
  onSendCode: () => void;
  onResetPassword: () => void;
  onOpenAssistance: () => void;
}) {
  const submit = (event: React.FormEvent, action: () => void) => {
    event.preventDefault();
    action();
  };
  const titles: Record<RecoveryStep, string> = {
    identify: "重置密码",
    reset: "验证并设置新密码",
    assistance: "无法登录协助",
    complete: "密码重置完成",
  };

  return (
    <div className="password-recovery" aria-live="polite">
      <div className="recovery-head">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
          aria-label="返回登录"
        >
          <ArrowLeft size={18} aria-hidden="true" /> 返回登录
        </button>
        <span className="recovery-step">
          {step === "identify" ? "1 / 2" : step === "reset" ? "2 / 2" : ""}
        </span>
        <h1 id="login-title">{titles[step]}</h1>
      </div>
      {step === "identify" && (
        <form
          className="recovery-form"
          onSubmit={(event) => submit(event, onSendCode)}
        >
          <p>
            输入账号绑定邮箱和账号身份。后端会创建一次性恢复请求，并通过已配置的邮件服务发送验证码。
          </p>
          <AppSelect
            label="账号身份"
            value={requestedRole}
            options={[
              { value: "TEACHER", label: "教师" },
              { value: "ADMIN", label: "管理员" },
            ]}
            onChange={(value) =>
              onRequestedRoleChange(value === "ADMIN" ? "ADMIN" : "TEACHER")
            }
            required
            error={userFacingFieldError(error, "requestedRole", "role")}
            ariaDescribedBy={error ? "recovery-error" : undefined}
            ariaInvalid={Boolean(userFacingFieldError(error, "requestedRole", "role"))}
          />
          <FormField
            label="账号绑定邮箱"
            required
            controlId="recovery-email"
            error={userFacingFieldError(error, "account", "email")}
          >
            <input
              id="recovery-email"
              value={account}
              onChange={(event) => onAccountChange(event.target.value)}
              placeholder="请输入完整学校邮箱"
              type="email"
              autoComplete="email"
              autoFocus
              aria-describedby={error ? "recovery-error" : undefined}
            />
          </FormField>
          <ErrorPanel id="recovery-error" error={error} locale={locale} />
          <button
            className="primary-button full-button"
            type="submit"
            disabled={busy}
          >
            <Mail size={17} aria-hidden="true" />
            {busy ? "正在提交…" : "发送验证码"}
          </button>
          <button
            className="text-button recovery-assistance-link"
            type="button"
            onClick={onOpenAssistance}
          >
            收不到邮箱验证码或账号无法使用？
          </button>
        </form>
      )}
      {step === "reset" && (
        <form
          className="recovery-form"
          onSubmit={(event) => submit(event, onResetPassword)}
        >
          <p>
            恢复请求已由后端受理。请输入邮件验证码和新密码；成功后，该账号在所有设备上的旧登录状态将失效。
          </p>
          {expiresAt && (
            <p className="recovery-note">
              本次恢复请求有效期至：
              {new Date(expiresAt).toLocaleString()}
            </p>
          )}
          <FormField
            label="邮件验证码"
            required
            controlId="recovery-code"
            hint={locale === "en" ? "Enter a 4–10 digit verification code" : "请输入 4–10 位数字验证码"}
            error={userFacingFieldError(error, "verificationCode", "code")}
          >
            <input
              id="recovery-code"
              value={code}
              onChange={(event) =>
                onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="请输入 4–10 位数字验证码"
              minLength={4}
              maxLength={10}
              aria-describedby={error ? "recovery-error" : undefined}
              autoFocus
            />
          </FormField>
          <FormField
            label="新密码"
            required
            controlId="recovery-password"
            hint={locale === "en" ? "Enter a non-empty personal password" : "请输入非空的个人密码"}
            error={userFacingFieldError(error, "newPassword", "password")}
          >
            <input
              id="recovery-password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="请输入新的个人密码"
              autoComplete="new-password"
              aria-describedby={error ? "recovery-error" : undefined}
            />
          </FormField>
          <FormField
            label="确认新密码"
            required
            controlId="recovery-password-confirmation"
            error={userFacingFieldError(error, "passwordConfirmation")}
          >
            <input
              id="recovery-password-confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) =>
                onPasswordConfirmationChange(event.target.value)
              }
              placeholder="请再次输入新密码"
              autoComplete="new-password"
              aria-describedby={error ? "recovery-error" : undefined}
            />
          </FormField>
          <ErrorPanel id="recovery-error" error={error} locale={locale} />
          <button
            className="primary-button full-button"
            type="submit"
            disabled={busy}
          >
            <KeyRound size={17} aria-hidden="true" />
            {busy ? "正在验证…" : "验证并重置密码"}
          </button>
        </form>
      )}
      {step === "assistance" && (
        <div className="recovery-assistance">
          <span className="recovery-alert">
            <CircleAlert size={22} aria-hidden="true" />
          </span>
          <p>
            如账号不存在、已停用，或无法使用绑定邮箱，请联系系统管理员完成身份核验后处理账号恢复或联系方式更新。
          </p>
          <ul>
            <li>
              教师和管理员：管理员核实账号状态，并协助更新有效邮箱或恢复账号。
            </li>
            <li>
              学生：请使用学生端验证码登录；手机号和邮箱均失效时，由管理员核验身份后绑定新的联系方式。
            </li>
          </ul>
          <p className="recovery-note">
            请勿仅凭姓名或学号请求登录；身份核验需通过学校规定的安全渠道完成。
          </p>
          <button
            className="primary-button full-button"
            type="button"
            onClick={onBack}
          >
            返回登录
          </button>
        </div>
      )}
      {step === "complete" && (
        <div className="recovery-complete">
          <span className="recovery-success">
            <KeyRound size={24} aria-hidden="true" />
          </span>
          <p>
            密码已重置。请使用新密码重新登录；为保护账号安全，所有旧登录状态均已失效。
          </p>
          <button
            className="primary-button full-button"
            type="button"
            onClick={onBack}
          >
            使用新密码登录
          </button>
        </div>
      )}
    </div>
  );
}

function SportsBrand() {
  return (
    <div className="brand sports-brand" translate="no" aria-label="SPORTS">
      <Image
        className="sports-brand-emblem"
        src="/bnbu-emblem.svg"
        alt=""
        width={54}
        height={54}
      />
      <span className="sports-brand-wordmark" aria-hidden="true">
        SPORTS
      </span>
    </div>
  );
}

const MODAL_FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function modalFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

type PasswordSettingsStep = "identify" | "reset" | "complete";

function PasswordSettingsPanel({
  role,
  mode,
  user,
  step,
  account,
  expiresAt,
  code,
  password,
  passwordConfirmation,
  error,
  locale,
  busy,
  onAccountChange,
  onCodeChange,
  onPasswordChange,
  onPasswordConfirmationChange,
  onBackToAccount,
  onBackToIdentity,
  onSendCode,
  onResetPassword,
  onComplete,
}: {
  role: Role;
  mode: WorkspaceMode;
  user: WorkspaceUser;
  step: PasswordSettingsStep;
  account: string;
  expiresAt: string;
  code: string;
  password: string;
  passwordConfirmation: string;
  error: UserFacingError | null;
  locale: Locale;
  busy: boolean;
  onAccountChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmationChange: (value: string) => void;
  onBackToAccount: () => void;
  onBackToIdentity: () => void;
  onSendCode: () => void;
  onResetPassword: () => void;
  onComplete: () => void;
}) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const isPreview = mode === "demo";
  const passwordEntered = password.length > 0;
  const passwordsMatch =
    passwordConfirmation.length > 0 && password === passwordConfirmation;
  const roleLabel = role === "admin"
    ? locale === "en" ? "Administrator" : "管理员"
    : locale === "en" ? "Teacher" : "教师";

  if (step === "complete") {
    return (
      <>
        <div className="password-change-complete" aria-live="polite">
          <span aria-hidden="true">
            <ShieldCheck size={25} />
          </span>
          <h3>{locale === "en" ? "Password updated" : "密码已更新"}</h3>
          <p>
            {locale === "en"
              ? "The Backend has revoked existing sign-in sessions. Sign in again with the new password."
              : "Backend 已撤销该账号现有登录状态，请使用新密码重新登录。"}
          </p>
        </div>
        <div className="modal-footer">
          <button className="primary-button" type="button" onClick={onComplete}>
            {locale === "en" ? "Sign in with new password" : "使用新密码登录"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="password-settings-stepper" aria-label={locale === "en" ? "Password change progress" : "修改密码进度"}>
        <span className="is-active"><b>1</b>{locale === "en" ? "Verify identity" : "验证身份"}</span>
        <i aria-hidden="true" />
        <span className={step === "reset" ? "is-active" : ""}><b>2</b>{locale === "en" ? "Set password" : "设置密码"}</span>
      </div>

      {step === "identify" ? (
        <>
          <form
            key="password-settings-identify"
            className="password-settings-form"
            id="password-settings-identify-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSendCode();
            }}
          >
            <p className="password-settings-intro">
              {locale === "en"
                ? "Verify your identity with the university email linked to this account. You will remain in the current workspace while completing the steps."
                : "通过当前账号已验证的学校邮箱完成身份验证；整个过程保留在当前工作台内。"}
            </p>
            <dl className="password-settings-account">
              <div><dt>{locale === "en" ? "Current account" : "当前账号"}</dt><dd>{user.account}</dd></div>
              <div><dt>{locale === "en" ? "Role" : "账号身份"}</dt><dd>{roleLabel}</dd></div>
              <div className="is-wide"><dt>{locale === "en" ? "Verified email" : "已验证邮箱"}</dt><dd>{user.email || "—"}</dd></div>
            </dl>
            {isPreview ? (
              <p className="password-preview-banner" role="note">
                {locale === "en"
                  ? "Preview only: no verification email will be sent and no password will be changed."
                  : "免登录预览仅展示流程，不会发送验证码，也不会修改账号密码。"}
              </p>
            ) : null}
            <FormField
              label={locale === "en" ? "Complete verified email" : "完整学校邮箱"}
              required
              controlId="password-settings-email"
              hint={
                user.email.includes("*")
                  ? locale === "en" ? "Enter the complete address represented above." : "请输入上方脱敏邮箱对应的完整地址。"
                  : undefined
              }
              error={userFacingFieldError(error, "account", "email")}
            >
              <input
                id="password-settings-email"
                value={account}
                onChange={(event) => onAccountChange(event.target.value)}
                placeholder={locale === "en" ? "Enter the verified university email" : "请输入已验证学校邮箱"}
                type="email"
                autoComplete="email"
                required={!isPreview}
                autoFocus
                aria-describedby={error ? "password-settings-error" : undefined}
              />
            </FormField>
            <ErrorPanel id="password-settings-error" error={error} locale={locale} />
          </form>
          <div className="modal-footer">
            <button className="secondary-button" type="button" onClick={onBackToAccount}>
              {locale === "en" ? "Back to account" : "返回账号信息"}
            </button>
            <button
              className="primary-button"
              type="submit"
              form="password-settings-identify-form"
              formNoValidate={isPreview}
              disabled={busy}
            >
              <Mail size={16} aria-hidden="true" />
              {isPreview
                ? locale === "en" ? "Preview next step" : "预览下一步"
                : busy
                  ? locale === "en" ? "Sending…" : "正在发送…"
                  : locale === "en" ? "Send verification code" : "发送验证码"}
            </button>
          </div>
        </>
      ) : (
        <>
          <form
            key="password-settings-reset"
            className="password-settings-form"
            id="password-settings-reset-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isPreview) onResetPassword();
            }}
          >
            <p className="password-settings-intro">
              {locale === "en"
                ? "Enter the email verification code and set a new password. Existing sign-in sessions will be revoked after completion."
                : "输入邮件验证码并设置新密码；修改完成后，该账号现有登录状态将全部失效。"}
            </p>
            {isPreview ? (
              <p className="password-preview-banner" role="note">
                {locale === "en"
                  ? "Preview only: the final submission is disabled."
                  : "当前为免登录预览，最终提交已禁用。"}
              </p>
            ) : null}
            {expiresAt ? (
              <p className="password-settings-expiry">
                {locale === "en" ? "Verification expires at: " : "验证码有效期至："}
                {new Date(expiresAt).toLocaleString()}
              </p>
            ) : null}
            <FormField
              label={locale === "en" ? "Email verification code" : "邮件验证码"}
              required
              controlId="password-settings-code"
              hint={locale === "en" ? "Enter the 4–10 digit code" : "请输入 4–10 位数字验证码"}
              error={userFacingFieldError(error, "verificationCode", "code")}
            >
              <input
                id="password-settings-code"
                value={code}
                onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={locale === "en" ? "Verification code" : "请输入验证码"}
                minLength={4}
                maxLength={10}
                required={!isPreview}
                autoFocus
                aria-describedby={error ? "password-settings-error" : undefined}
              />
            </FormField>
            <FormField
              label={locale === "en" ? "New password" : "新密码"}
              required
              controlId="password-settings-password"
              error={userFacingFieldError(error, "newPassword", "password")}
            >
              <span className="password-field">
                <input
                  id="password-settings-password"
                  type={showNewPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder={locale === "en" ? "Enter a new personal password" : "请输入新的个人密码"}
                  autoComplete="new-password"
                  required={!isPreview}
                  aria-describedby={error ? "password-settings-error" : undefined}
                />
                <button
                  className="password-visibility"
                  type="button"
                  aria-label={locale === "en" ? "Show or hide new password" : "显示或隐藏新密码"}
                  aria-pressed={showNewPassword}
                  onClick={() => setShowNewPassword((visible) => !visible)}
                >
                  {showNewPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </FormField>
            <div className="password-rule-list" aria-label={locale === "en" ? "New password requirements" : "新密码要求"}>
              <span className={passwordEntered ? "met" : ""}>
                {passwordEntered ? "✓" : "○"} {locale === "en" ? "Password entered" : "已输入密码"}
              </span>
            </div>
            <FormField
              label={locale === "en" ? "Confirm new password" : "确认新密码"}
              required
              controlId="password-settings-confirmation"
              error={userFacingFieldError(error, "passwordConfirmation")}
            >
              <span className="password-field">
                <input
                  id="password-settings-confirmation"
                  type={showPasswordConfirmation ? "text" : "password"}
                  value={passwordConfirmation}
                  onChange={(event) => onPasswordConfirmationChange(event.target.value)}
                  placeholder={locale === "en" ? "Enter the new password again" : "请再次输入新密码"}
                  autoComplete="new-password"
                  required={!isPreview}
                  aria-describedby={error ? "password-settings-error" : undefined}
                />
                <button
                  className="password-visibility"
                  type="button"
                  aria-label={locale === "en" ? "Show or hide password confirmation" : "显示或隐藏确认密码"}
                  aria-pressed={showPasswordConfirmation}
                  onClick={() => setShowPasswordConfirmation((visible) => !visible)}
                >
                  {showPasswordConfirmation ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </FormField>
            {passwordConfirmation ? (
              <p className={`password-match-hint ${passwordsMatch ? "matched" : ""}`}>
                {passwordsMatch
                  ? locale === "en" ? "✓ Passwords match" : "✓ 两次密码一致"
                  : locale === "en" ? "The passwords do not match" : "两次输入的密码不一致"}
              </p>
            ) : null}
            <ErrorPanel id="password-settings-error" error={error} locale={locale} />
          </form>
          <div className="modal-footer">
            <button className="secondary-button" type="button" onClick={onBackToIdentity}>
              {locale === "en" ? "Previous" : "上一步"}
            </button>
            <button
              className="primary-button"
              type="submit"
              form="password-settings-reset-form"
              disabled={busy || isPreview}
            >
              <KeyRound size={16} aria-hidden="true" />
              {isPreview
                ? locale === "en" ? "Disabled in preview" : "预览模式不可提交"
                : busy
                  ? locale === "en" ? "Verifying…" : "正在验证…"
                  : locale === "en" ? "Verify and update" : "验证并修改密码"}
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Modal({
  role,
  mode,
  user,
  locale,
  recoveryStep,
  recoveryAccount,
  recoveryExpiresAt,
  recoveryCode,
  recoveryPassword,
  recoveryPasswordConfirmation,
  recoveryError,
  recoveryBusy,
  close,
  logout,
  openPasswordSettings,
  resetPasswordSettings,
  returnToPasswordIdentification,
  onAccountChange,
  onCodeChange,
  onPasswordChange,
  onPasswordConfirmationChange,
  onSendCode,
  onResetPassword,
}: {
  role: Role;
  mode: WorkspaceMode;
  user: WorkspaceUser;
  locale: Locale;
  recoveryStep: PasswordSettingsStep;
  recoveryAccount: string;
  recoveryExpiresAt: string;
  recoveryCode: string;
  recoveryPassword: string;
  recoveryPasswordConfirmation: string;
  recoveryError: UserFacingError | null;
  recoveryBusy: boolean;
  close: () => void;
  logout: () => void;
  openPasswordSettings: () => Promise<void>;
  resetPasswordSettings: () => void;
  returnToPasswordIdentification: () => void;
  onAccountChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmationChange: (value: string) => void;
  onSendCode: () => void;
  onResetPassword: () => void;
}) {
  const [view, setView] = useState<"profile" | "password">("profile");
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(close);

  const returnToProfile = () => {
    resetPasswordSettings();
    setView("profile");
  };

  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const initial = dialog.querySelector<HTMLElement>("[data-modal-initial-focus]") ??
        modalFocusableElements(dialog)[0] ?? dialog;
      initial.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      const opener = restoreFocusRef.current;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = modalFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={dialogRef}
        className={`modal account-modal ${view === "password" ? "account-modal-security" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div className="modal-head">
          <div className="account-modal-profile">
            <span className="account-modal-avatar" aria-hidden="true">
              {view === "password" ? <KeyRound size={19} /> : user.name.trim().slice(0, 1)}
            </span>
            <div className="account-modal-copy">
              <h2 id="modal-title">
                {view === "password"
                  ? locale === "en" ? "Change password" : "修改密码"
                  : user.name}
              </h2>
              <p>
                {view === "password"
                  ? locale === "en" ? "Verify your identity without leaving the workspace" : "无需离开工作台，完成身份验证并设置新密码"
                  : `${user.department} · ${user.account}`}
              </p>
            </div>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="关闭"
            data-modal-initial-focus
            onClick={close}
          >
            ×
          </button>
        </div>
        {view === "profile" ? (
          <>
            <div className="profile-meta">
              <span>当前身份</span>
              <Badge tone={role === "teacher" ? "blue" : "green"}>
                {role.toUpperCase()}
              </Badge>
            </div>
            <section
              className="account-security-card"
              aria-labelledby="account-security-title"
            >
              <span className="account-security-icon" aria-hidden="true">
                <KeyRound size={18} />
              </span>
              <div>
                <p className="account-security-eyebrow">账号安全</p>
                <h3 id="account-security-title">修改密码</h3>
                <p>无需跳转登录页，在当前工作台完成邮箱验证并设置新密码。</p>
              </div>
              <button
                className="secondary-button account-security-action"
                type="button"
                onClick={() => {
                  void openPasswordSettings();
                  setView("password");
                }}
              >
                去修改
              </button>
            </section>
            <div className="modal-footer">
              <button className="secondary-button" type="button" onClick={close}>
                取消
              </button>
              <button className="danger-button" type="button" onClick={logout}>
                退出登录
              </button>
            </div>
          </>
        ) : (
          <PasswordSettingsPanel
            role={role}
            mode={mode}
            user={user}
            step={recoveryStep}
            account={recoveryAccount}
            expiresAt={recoveryExpiresAt}
            code={recoveryCode}
            password={recoveryPassword}
            passwordConfirmation={recoveryPasswordConfirmation}
            error={recoveryError}
            locale={locale}
            busy={recoveryBusy}
            onAccountChange={onAccountChange}
            onCodeChange={onCodeChange}
            onPasswordChange={onPasswordChange}
            onPasswordConfirmationChange={onPasswordConfirmationChange}
            onBackToAccount={returnToProfile}
            onBackToIdentity={returnToPasswordIdentification}
            onSendCode={onSendCode}
            onResetPassword={onResetPassword}
            onComplete={logout}
          />
        )}
      </section>
    </div>
  );
}
