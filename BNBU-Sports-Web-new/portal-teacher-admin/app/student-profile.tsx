"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  useStudentProfile,
  type StudentProfileLoadState,
} from "./use-student-profile";
import type { UserFacingError } from "./api-client";
import { ErrorPanel } from "./error-panel";

export type StudentProfile = {
  id: string | number;
  name: string;
  number?: string;
  email?: string;
  gender?: string;
  grade?: string;
  joinedAt?: string;
  joinMethod?: string;
  avatarUrl?: string;
  className?: string;
  major?: string;
  course?: string;
  courseStatus?: string;
};

export type StudentProfileField =
  | "number"
  | "email"
  | "gender"
  | "grade"
  | "joinedAt"
  | "joinMethod"
  | "className"
  | "major"
  | "course"
  | "courseStatus";

export type StudentInfoItem = {
  key?: string;
  label: string;
  value?: ReactNode;
};

export type StudentCourseMetric = {
  label: string;
  value: ReactNode;
  tone?: "default" | "attention" | "success";
};

export type StudentQuickAction = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
};

const fieldLabels: Record<StudentProfileField, string> = {
  number: "学号",
  email: "邮箱",
  gender: "性别",
  grade: "年级",
  joinedAt: "加入时间",
  joinMethod: "加入方式",
  className: "班级",
  major: "专业",
  course: "当前课程",
  courseStatus: "课程状态",
};

const avatarSizes = {
  small: 30,
  medium: 36,
  large: 44,
};

function portalTarget() {
  return (
    document.querySelector<HTMLElement>(".localized-content") ?? document.body
  );
}

export function StudentInfoFields({
  profile,
  fields,
  items = [],
  compact = false,
}: {
  profile: StudentProfile;
  fields: StudentProfileField[];
  items?: StudentInfoItem[];
  compact?: boolean;
}) {
  const profileItems = fields.map((field) => ({
    key: field,
    label: fieldLabels[field],
    value: profile[field],
  }));
  const visibleItems = [...profileItems, ...items].filter(
    (item) =>
      item.value !== undefined && item.value !== null && item.value !== "",
  );

  if (visibleItems.length === 0) return null;

  return (
    <dl className={`student-info-fields ${compact ? "is-compact" : ""}`}>
      {visibleItems.map((item, index) => (
        <div key={item.key ?? `${item.label}-${index}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StudentAvatar({
  student,
  decorative = true,
}: {
  student: StudentProfile;
  decorative?: boolean;
}) {
  return (
    <span className="student-avatar" aria-hidden={decorative || undefined}>
      {student.avatarUrl ? (
        <Image
          src={student.avatarUrl}
          alt={decorative ? "" : student.name}
          width={48}
          height={48}
          unoptimized
        />
      ) : (
        student.name.trim().slice(-1) || "生"
      )}
    </span>
  );
}

export function StudentHoverCard({
  id,
  open,
  student,
  fields,
  triggerRef,
  cardRef,
  onMouseEnter,
  onMouseLeave,
}: {
  id: string;
  open: boolean;
  student: StudentProfile;
  fields: StudentProfileField[];
  triggerRef: RefObject<HTMLButtonElement | null>;
  cardRef: RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [position, setPosition] = useState({ left: 12, top: 12, ready: false });

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(open), open ? 0 : 160);
    return () => window.clearTimeout(timer);
  }, [open]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const card = cardRef.current;
    if (!trigger || !card) return;

    const margin = 12;
    const gap = 10;
    const triggerRect = trigger.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const maxLeft = Math.max(
      margin,
      window.innerWidth - cardRect.width - margin,
    );
    const left = Math.min(maxLeft, Math.max(margin, triggerRect.left));
    const fitsBelow =
      triggerRect.bottom + gap + cardRect.height <= window.innerHeight - margin;
    const fitsAbove = triggerRect.top - gap - cardRect.height >= margin;
    const preferredTop = fitsBelow
      ? triggerRect.bottom + gap
      : fitsAbove
        ? triggerRect.top - cardRect.height - gap
        : Math.min(
            Math.max(margin, triggerRect.bottom + gap),
            Math.max(margin, window.innerHeight - cardRect.height - margin),
          );

    setPosition({ left, top: preferredTop, ready: true });
  }, [cardRef, triggerRef]);

  useLayoutEffect(() => {
    if (mounted) updatePosition();
  }, [mounted, open, updatePosition]);

  useEffect(() => {
    if (!mounted) return;
    const reposition = () => updatePosition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [mounted, updatePosition]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`student-hover-card ${open ? "is-open" : "is-closing"}`}
      id={id}
      ref={cardRef}
      role="tooltip"
      style={{
        left: position.left,
        top: position.top,
        visibility: position.ready ? "visible" : "hidden",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="student-hover-heading">
        <StudentAvatar student={student} />
        <div>
          <b>{student.name}</b>
          <small>学生信息</small>
        </div>
      </div>
      <StudentInfoFields profile={student} fields={fields} compact />
    </div>,
    portalTarget(),
  );
}

export function StudentDetailDrawer({
  open,
  student,
  status,
  error,
  detailFields,
  courseMetrics = [],
  quickActions = [],
  onClose,
  onRetry,
}: {
  open: boolean;
  student: StudentProfile;
  status: StudentProfileLoadState;
  error?: UserFacingError | null;
  detailFields: StudentProfileField[];
  courseMetrics?: StudentCourseMetric[];
  quickActions?: StudentQuickAction[];
  onClose: () => void;
  onRetry?: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(open), open ? 0 : 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusTimer = window.setTimeout(
      () => closeButtonRef.current?.focus(),
      0,
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = [
        ...drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [mounted, onClose, open]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`student-detail-backdrop ${open ? "is-open" : "is-closing"}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`student-detail-drawer ${open ? "is-open" : "is-closing"}`}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="student-detail-header">
          <StudentAvatar student={student} />
          <div>
            <span>学生详情</span>
            <h2 id={titleId}>{student.name}</h2>
            <p>{student.course ?? "学生资料"}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="关闭学生详情"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="student-detail-body">
          {status === "loading" ? (
            <div
              className="student-detail-skeleton"
              role="status"
              aria-label="正在加载学生详情"
            >
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : (
            <>
              {status === "error" && (
                <div className="student-detail-error">
                  <ErrorPanel
                    error={error ?? {
                      code: "STUDENT_PROFILE_LOAD_FAILED",
                      title: "学生详情加载失败",
                      message: "学生详情暂时无法加载。",
                      action: "请稍后重试。",
                      requestId: null,
                      retryable: true,
                      category: "NETWORK",
                      fieldErrors: [],
                    }}
                  />
                  {onRetry && (
                    <button type="button" onClick={onRetry}>
                      重新加载
                    </button>
                  )}
                </div>
              )}

              <section className="student-detail-section">
                <div className="student-detail-section-title">
                  <span>基础信息</span>
                </div>
                <StudentInfoFields profile={student} fields={detailFields} />
              </section>

              {(student.course ||
                student.courseStatus ||
                courseMetrics.length > 0) && (
                <section className="student-detail-section">
                  <div className="student-detail-section-title">
                    <span>当前课程信息</span>
                  </div>
                  <StudentInfoFields
                    profile={student}
                    fields={["course", "courseStatus"]}
                  />
                  {courseMetrics.length > 0 && (
                    <dl className="student-course-metrics">
                      {courseMetrics.map((metric) => (
                        <div
                          className={`is-${metric.tone ?? "default"}`}
                          key={metric.label}
                        >
                          <dt>{metric.label}</dt>
                          <dd>{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              )}

              {quickActions.length > 0 && (
                <section className="student-detail-section student-quick-actions">
                  <div className="student-detail-section-title">
                    <span>快捷操作</span>
                  </div>
                  <div>
                    {quickActions.map((action) => (
                      <button
                        className={`is-${action.tone ?? "default"}`}
                        type="button"
                        disabled={action.disabled}
                        key={action.label}
                        onClick={() => {
                          action.onSelect();
                          onClose();
                        }}
                      >
                        {action.label}
                        <span aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </div>,
    portalTarget(),
  );
}

export function StudentIdentity({
  student,
  enableHover = true,
  enableClick = true,
  hoverFields = ["number", "gender", "grade", "course", "courseStatus"],
  detailFields = [
    "number",
    "email",
    "gender",
    "grade",
    "joinedAt",
    "joinMethod",
    "className",
    "major",
  ],
  courseMetrics,
  quickActions,
  avatarSize = "small",
  nameDisplay = "full",
  loading = false,
  loadProfile,
}: {
  student: StudentProfile;
  enableHover?: boolean;
  enableClick?: boolean;
  hoverFields?: StudentProfileField[];
  detailFields?: StudentProfileField[];
  courseMetrics?: StudentCourseMetric[];
  quickActions?: StudentQuickAction[];
  avatarSize?: keyof typeof avatarSizes | number;
  nameDisplay?: "full" | "truncate";
  loading?: boolean;
  loadProfile?: (student: StudentProfile) => Promise<Partial<StudentProfile>>;
}) {
  const hoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profile, status, error, load } = useStudentProfile({
    student,
    loadProfile,
  });
  const avatarPixels =
    typeof avatarSize === "number" ? avatarSize : avatarSizes[avatarSize];

  const clearTimer = useCallback((timer: RefObject<number | null>) => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const clearHoverTimers = useCallback(() => {
    clearTimer(openTimer);
    clearTimer(closeTimer);
  }, [clearTimer]);

  useEffect(() => () => clearHoverTimers(), [clearHoverTimers]);

  useEffect(() => {
    if (!hoverOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearHoverTimers();
        setHoverOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [clearHoverTimers, hoverOpen]);

  const supportsHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const showHover = (delay = 150, force = false) => {
    if (!enableHover || (!force && !supportsHover())) return;
    clearTimer(closeTimer);
    clearTimer(openTimer);
    openTimer.current = window.setTimeout(() => {
      setHoverOpen(true);
      openTimer.current = null;
    }, delay);
  };

  const hideHover = (delay = 100) => {
    clearTimer(openTimer);
    clearTimer(closeTimer);
    closeTimer.current = window.setTimeout(() => {
      setHoverOpen(false);
      closeTimer.current = null;
    }, delay);
  };

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = () => {
    if (!enableClick) return;
    clearHoverTimers();
    setHoverOpen(false);
    setDrawerOpen(true);
    void load();
  };

  if (loading) {
    return (
      <span
        className="student-identity student-identity-loading"
        role="status"
        aria-label="正在加载学生信息"
      >
        <span className="student-avatar" />
        <span className="student-name-placeholder" />
      </span>
    );
  }

  const triggerStyle = {
    "--student-avatar-size": `${avatarPixels}px`,
  } as CSSProperties;

  return (
    <>
      <button
        className={`student-identity name-${nameDisplay}`}
        ref={triggerRef}
        type="button"
        style={triggerStyle}
        aria-label={`${student.name}，查看学生详情`}
        aria-describedby={hoverOpen ? hoverId : undefined}
        aria-haspopup={enableClick ? "dialog" : undefined}
        aria-expanded={enableClick ? drawerOpen : undefined}
        onMouseEnter={() => showHover()}
        onMouseLeave={() => hideHover()}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) showHover(0, true);
        }}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && hoverCardRef.current?.contains(next))
            return;
          hideHover();
        }}
        onClick={openDrawer}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openDrawer();
        }}
      >
        <StudentAvatar student={student} />
        <b title={student.name}>{student.name}</b>
      </button>

      {enableHover && (
        <StudentHoverCard
          id={hoverId}
          open={hoverOpen}
          student={profile}
          fields={hoverFields}
          triggerRef={triggerRef}
          cardRef={hoverCardRef}
          onMouseEnter={() => {
            clearTimer(closeTimer);
            setHoverOpen(true);
          }}
          onMouseLeave={() => hideHover()}
        />
      )}

      {enableClick && (
        <StudentDetailDrawer
          open={drawerOpen}
          student={profile}
          status={loading ? "loading" : status}
          error={error}
          detailFields={detailFields}
          courseMetrics={courseMetrics}
          quickActions={quickActions}
          onClose={closeDrawer}
          onRetry={() => void load(true)}
        />
      )}
    </>
  );
}
