"use client";

import {
  ChevronLeft,
  CircleAlert,
  Copy,
  Download,
  Eye,
  File as FileIcon,
  ListChecks,
  Maximize2,
  Pause,
  Play,
  Printer,
  QrCode,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppSelect } from "./app-select";
import { businessDateTime } from "./business-time";
import { FormField } from "./form-field";
import {
  toUserFacingError,
  type UserFacingError,
} from "./api-client";
import { ErrorPanel, localUserFacingError } from "./error-panel";
import {
  formatInviteExpiry,
  formatInviteRemaining,
  getInviteStatus,
  inviteStatusLabel,
} from "./course-invite";
import { InviteQrCode } from "./invite-qr";
import { statusLabel } from "./language";
import {
  TEACHER_REVIEW_ACTIONS,
  publicReasonById,
  reasonsForAction,
} from "./review-public-reasons";
import {
  applyAttendanceAuditState,
  deriveAuditSummary,
  toCreditedDurationHours,
  type AttendanceAuditSummary,
  type AuditStatus,
} from "./checkin-audit";
import {
  CourseOverviewLayout,
  DataTable,
  FilterToolbar,
  ManagementTableLayout,
  PageSummaryMetrics,
  ProgressCell,
  ReviewWorkbenchLayout,
  StatusFilterTabs,
  StatusTabs,
  TableActionMenu,
  TableActionMenuItem,
} from "./teacher-ui";
import {
  StudentIdentity,
  type StudentCourseMetric,
  type StudentProfile,
  type StudentQuickAction,
} from "./student-profile";
import {
  TabPageTransition,
  type TabTransitionDirection,
} from "./teacher-tab-page-transition";
import { RosterReconciliationPage } from "./roster-reconciliation";
import type {
  PlatformCourseMember,
  RosterCourseReference,
} from "./roster-reconciliation-types";
import {
  createInvalidToValidReviewOperation,
  createContractCourseInvitation,
  createMakeupExerciseRecord,
  loadSubmittedCheckins,
  fetchExerciseRecord,
  loadTeacherCourses,
  loadTeacherGrades,
  loadTeacherExemptions,
  loadTeacherStudents,
  openTeacherMedia,
  publishStudentScore,
  readDemoCurrentSemester,
  recalculateStudentScore,
  removeEnrollment,
  ReviewTransitionConsistencyError,
  reviewExemptionApplication,
  submitExerciseReviewWithRetry,
  returnExerciseRecordForProof,
  subscribeDemoCurrentSemester,
  transitionInvalidExerciseReviewToValid,
  tryAcquireReviewTransitionLock,
  updateClassSectionWindow,
  reviseClassProgressTarget,
} from "./teacher-data";
import type { InvalidToValidReviewOperation } from "./teacher-data";
import type { Semester } from "./teacher-api-types";
import { semesterDisplayName } from "./semester-presentation";
import type { WorkspaceMode } from "./portal-app";

type TeacherWorkspaceProps = {
  active: string;
  direction: TabTransitionDirection;
  mode: WorkspaceMode;
  showToast: (value: string) => void;
  onSemesterChange?: (value: string) => void;
};

type FormErrorState = string | UserFacingError;

function userErrorToast(error: UserFacingError): string {
  return [
    error.message,
    error.action,
    error.requestId ? `诊断编号：${error.requestId}` : null,
  ].filter(Boolean).join(" ");
}

function userFacingFieldError(
  error: FormErrorState,
  ...fieldNames: string[]
): string | undefined {
  if (!error || typeof error === "string") return undefined;
  const accepted = new Set(fieldNames.map((field) => field.toLowerCase()));
  return error.fieldErrors.find((item) => {
    const field = item.field.toLowerCase();
    const leaf = field.split(".").pop() ?? field;
    return accepted.has(field) || accepted.has(leaf);
  })?.message;
}

type ExemptionStatus =
  "pending" | "supplement_required" | "approved" | "rejected";
type GradeStatus = "NotRecorded" | "Recorded" | "Exempt" | "Absent" | "Unavailable";
type CourseStatus = "ACTIVE";
type MembershipStatus = "active" | "removed" | "exited" | "disabled";
type CheckinDetailView = "list" | "album";
type CheckinAuditFilter = "all" | AuditStatus;
type RosterView = "all" | "needs_attention" | "complete" | "inactive";
type CheckinReviewFilter = "all" | "history";
type ExemptionFilter = "all" | ExemptionStatus;

type Invite = {
  code: string;
  expiresAt: string;
  status: "active" | "revoked";
  durationMinutes?: number;
};

const MAKEUP_SPORT_TYPES = [
  { value: "RUNNING", label: "跑步" },
  { value: "BASKETBALL", label: "篮球" },
  { value: "FOOTBALL", label: "足球" },
  { value: "BADMINTON", label: "羽毛球" },
  { value: "TABLE_TENNIS", label: "乒乓球" },
  { value: "SWIMMING", label: "游泳" },
  { value: "FITNESS", label: "健身" },
  { value: "CYCLING", label: "骑行" },
  { value: "OTHER", label: "其他" },
] as const;

type CheckinWindow = {
  windowMode: "available" | "unavailable";
  dateRangeStart: string;
  dateRangeEnd: string;
  dailyStartTime: string;
  dailyEndTime: string;
  excludedDates: { date: string; reason: string }[];
  semesterDeadline: string;
};

type Course = {
  id: string;
  name: string;
  semester: string;
  semesterId?: string;
  courseId?: string;
  status: CourseStatus;
  courseTarget: number;
  otherTarget: number;
  version?: number;
  checkinWindow: CheckinWindow;
  invite?: Invite;
};

type Student = {
  id: string;
  name: string;
  number: string;
  email: string;
  gender: "男" | "女" | "其他" | "未知";
  grade: string;
  courseId: string;
  enrollmentId?: string;
  version?: number;
  status: MembershipStatus;
  joinedAt: string;
  joinMethod: "qr" | "manual_import";
  courseHours: number;
  otherHours: number;
  courseWaiverHours?: number;
  otherWaiverHours?: number;
};

type CheckinRecord = {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentId?: string;
  creditType: "课程相关" | "其他运动" | "系统抵扣";
  sport: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  creditedMinutes: number;
  originalHours: number;
  approvedHours: number;
  description: string;
  submittedAt: string;
  status: "有效" | "已调整" | "系统抵扣";
  risk: "低风险" | "需关注" | "凭证模糊" | null;
  confidence: number | null;
  proof: string[];
  mediaIds?: string[];
  locationExpired: boolean | null;
  reviewComment?: string;
  source: "student" | "system";
  auditStatus: AuditStatus;
  invalidReason?: string;
  auditRemark?: string;
  version?: number;
  reviewVersion?: number;
};

type Grade = {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentId?: string;
  gender: "男" | "女" | "其他" | "未知";
  gradeGroup: "大一/大二" | "大三/大四" | "未知";
  enduranceStatus: GradeStatus;
  minutes?: number;
  seconds?: number;
  physicalScore?: number;
  published: boolean;
  scoreStatus?: string;
  qualificationStatus?: string;
  validCourseDurationSeconds?: number;
  validGeneralDurationSeconds?: number;
  totalValidDurationSeconds?: number;
  scoringSeconds?: number;
  excessSeconds?: number;
  baseScore?: number | null;
  adjustmentTotal?: number | null;
  calculatedAt?: string | null;
  publishedAt?: string | null;
  version?: number;
};

type Exemption = {
  id: string | number;
  studentId: string;
  courseId: string;
  kind:
    | "耐力跑免测"
    | "校队认证"
    | "社团认证"
    | "体测免测"
    | "运动打卡减免"
    | "特殊情况";
  organization?: string;
  reason: string;
  material: string[];
  mediaIds?: string[];
  submittedAt: string;
  status: ExemptionStatus;
  reviewComment?: string;
  score?: number;
  courseOffset?: number;
  otherOffset?: number;
  version?: number;
};

type MaterialPreview = {
  file: string;
  studentName: string;
};

type DialogState =
  | { type: "course-new" }
  | { type: "course-manage"; courseId: string }
  | { type: "invite"; courseId: string }
  | { type: "invite-revoke"; courseId: string }
  | {
      type: "student-action";
      studentId: string;
      action: "remove" | "supplement" | "waiver";
    }
  | { type: "supplement" }
  | { type: "checkin"; recordId: string }
  | { type: "checkin-invalid"; recordId: string }
  | { type: "checkin-return-proof"; recordId: string }
  | { type: "checkin-correct-valid"; recordId: string }
  | { type: "grade"; gradeId: string }
  | { type: "publish-grades"; courseId: string }
  | { type: "exemption"; exemptionId: string | number }
  | null;

const returnForProofReasons = reasonsForAction(TEACHER_REVIEW_ACTIONS.ReturnForSupplement);
const markInvalidReasons = reasonsForAction(TEACHER_REVIEW_ACTIONS.MarkInvalid);

const demoSemester: Semester = readDemoCurrentSemester();

const initialCourses: Course[] = [
  {
    id: "demo-section-pe101-01",
    name: "大学体育（一）",
    semester: semesterDisplayName(demoSemester),
    semesterId: demoSemester.id,
    courseId: "demo-catalog-pe101",
    status: "ACTIVE",
    courseTarget: 8,
    otherTarget: 12,
    version: 1,
    checkinWindow: {
      windowMode: "available",
      dateRangeStart: "2026-08-24",
      dateRangeEnd: "2027-01-09",
      dailyStartTime: "06:00",
      dailyEndTime: "22:00",
      excludedDates: [{ date: "2026-10-01", reason: "国庆假期" }],
      semesterDeadline: "2027-01-09",
    },
    invite: {
      code: "TEST-4821",
      expiresAt: "2026-08-30T12:00:00+08:00",
      status: "active",
    },
  },
  {
    id: "demo-section-badminton-02",
    name: "羽毛球基础",
    semester: semesterDisplayName(demoSemester),
    semesterId: demoSemester.id,
    courseId: "demo-catalog-badminton",
    status: "ACTIVE",
    courseTarget: 10,
    otherTarget: 10,
    version: 1,
    checkinWindow: {
      windowMode: "available",
      dateRangeStart: "2026-08-24",
      dateRangeEnd: "2027-01-09",
      dailyStartTime: "07:00",
      dailyEndTime: "21:30",
      excludedDates: [],
      semesterDeadline: "2027-01-09",
    },
  },
];

const initialStudents: Student[] = [
  {
    id: "demo-student-a",
    name: "测试学生甲",
    number: "TEST2026001",
    email: "student.a@bnbu.invalid",
    gender: "女",
    grade: "2026级",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-a",
    version: 1,
    status: "active",
    joinedAt: "2026-08-24T09:10:00+08:00",
    joinMethod: "qr",
    courseHours: 6,
    otherHours: 5,
  },
  {
    id: "demo-student-b",
    name: "测试学生乙",
    number: "TEST2026002",
    email: "student.b@bnbu.invalid",
    gender: "男",
    grade: "2026级",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-b",
    version: 1,
    status: "active",
    joinedAt: "2026-08-24T10:22:00+08:00",
    joinMethod: "qr",
    courseHours: 8,
    otherHours: 12,
  },
  {
    id: "demo-student-c",
    name: "测试学生丙",
    number: "TEST2026003",
    email: "student.c@bnbu.invalid",
    gender: "其他",
    grade: "2026级",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-c",
    version: 1,
    status: "active",
    joinedAt: "2026-08-25T08:45:00+08:00",
    joinMethod: "manual_import",
    courseHours: 3,
    otherHours: 4,
  },
  {
    id: "demo-student-d",
    name: "测试学生丁",
    number: "TEST2026004",
    email: "student.d@bnbu.invalid",
    gender: "未知",
    grade: "2025级",
    courseId: "demo-section-badminton-02",
    enrollmentId: "demo-enrollment-d",
    version: 1,
    status: "active",
    joinedAt: "2026-08-24T14:18:00+08:00",
    joinMethod: "qr",
    courseHours: 9,
    otherHours: 8,
    otherWaiverHours: 2,
  },
];

const initialRecords: CheckinRecord[] = [
  {
    id: "demo-record-a1",
    studentId: "demo-student-a",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-a",
    creditType: "课程相关",
    sport: "校园跑",
    startAt: "2026-08-24T17:00:00+08:00",
    endAt: "2026-08-24T19:00:00+08:00",
    durationMinutes: 120,
    creditedMinutes: 120,
    originalHours: 2,
    approvedHours: 2,
    description: "完成校园环线慢跑与拉伸。",
    submittedAt: "2026-08-24T19:05:00+08:00",
    status: "有效",
    risk: "低风险",
    confidence: 0.94,
    proof: ["/checkin-evidence-preview.svg"],
    locationExpired: false,
    reviewComment: "凭证完整。",
    source: "student",
    auditStatus: "valid",
    version: 1,
    reviewVersion: 1,
  },
  {
    id: "demo-record-a2",
    studentId: "demo-student-a",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-a",
    creditType: "其他运动",
    sport: "健身训练",
    startAt: "2026-08-25T07:30:00+08:00",
    endAt: "2026-08-25T08:30:00+08:00",
    durationMinutes: 60,
    creditedMinutes: 0,
    originalHours: 1,
    approvedHours: 0,
    description: "器械训练记录。",
    submittedAt: "2026-08-25T08:35:00+08:00",
    status: "已调整",
    risk: "凭证模糊",
    confidence: 0.42,
    proof: ["/checkin-evidence-preview.svg"],
    locationExpired: null,
    reviewComment: "凭证无法证明完整运动过程。",
    source: "student",
    auditStatus: "invalid",
    invalidReason: "图片或视频无法证明运动过程",
    auditRemark: "请重新提交完整运动凭证。",
    version: 2,
    reviewVersion: 1,
  },
  {
    id: "demo-record-b1",
    studentId: "demo-student-b",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-b",
    creditType: "其他运动",
    sport: "游泳",
    startAt: "2026-08-24T15:00:00+08:00",
    endAt: "2026-08-24T17:00:00+08:00",
    durationMinutes: 120,
    creditedMinutes: 120,
    originalHours: 2,
    approvedHours: 2,
    description: "完成耐力游泳训练。",
    submittedAt: "2026-08-24T17:12:00+08:00",
    status: "有效",
    risk: "低风险",
    confidence: 0.91,
    proof: ["/checkin-evidence-preview.svg"],
    locationExpired: null,
    source: "student",
    auditStatus: "valid",
    version: 1,
    reviewVersion: 0,
  },
  {
    id: "demo-record-c1",
    studentId: "demo-student-c",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-c",
    creditType: "课程相关",
    sport: "羽毛球",
    startAt: "2026-08-25T09:00:00+08:00",
    endAt: "2026-08-25T10:30:00+08:00",
    durationMinutes: 90,
    creditedMinutes: 60,
    originalHours: 1.5,
    approvedHours: 1,
    description: "完成双打练习。",
    submittedAt: "2026-08-25T10:35:00+08:00",
    status: "有效",
    risk: "需关注",
    confidence: 0.58,
    proof: ["/checkin-evidence-preview.svg", "/checkin-finish-preview.mp4"],
    locationExpired: false,
    source: "student",
    auditStatus: "valid",
    version: 1,
    reviewVersion: 0,
  },
  {
    id: "demo-record-d1",
    studentId: "demo-student-d",
    courseId: "demo-section-badminton-02",
    enrollmentId: "demo-enrollment-d",
    creditType: "系统抵扣",
    sport: "免测抵扣",
    startAt: "2026-08-24T00:00:00+08:00",
    endAt: "2026-08-24T00:00:00+08:00",
    durationMinutes: 0,
    creditedMinutes: 120,
    originalHours: 0,
    approvedHours: 2,
    description: "经批准的其他运动学时抵扣。",
    submittedAt: "2026-08-24T11:00:00+08:00",
    status: "系统抵扣",
    risk: null,
    confidence: null,
    proof: [],
    locationExpired: null,
    source: "system",
    auditStatus: "valid",
    version: 1,
    reviewVersion: 0,
  },
];

const initialGrades: Grade[] = [
  {
    id: "demo-grade-a",
    studentId: "demo-student-a",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-a",
    gender: "女",
    gradeGroup: "大一/大二",
    enduranceStatus: "Recorded",
    minutes: 12,
    seconds: 30,
    physicalScore: 82,
    published: false,
    validCourseDurationSeconds: 21600,
    validGeneralDurationSeconds: 18000,
    totalValidDurationSeconds: 39600,
    version: 1,
  },
  {
    id: "demo-grade-b",
    studentId: "demo-student-b",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-b",
    gender: "男",
    gradeGroup: "大一/大二",
    enduranceStatus: "Recorded",
    minutes: 11,
    seconds: 45,
    physicalScore: 90,
    published: true,
    scoreStatus: "PUBLISHED",
    validCourseDurationSeconds: 28800,
    validGeneralDurationSeconds: 43200,
    totalValidDurationSeconds: 72000,
    publishedAt: "2026-08-25T11:00:00+08:00",
    version: 2,
  },
  {
    id: "demo-grade-c",
    studentId: "demo-student-c",
    courseId: "demo-section-pe101-01",
    enrollmentId: "demo-enrollment-c",
    gender: "其他",
    gradeGroup: "大一/大二",
    enduranceStatus: "NotRecorded",
    published: false,
    validCourseDurationSeconds: 10800,
    validGeneralDurationSeconds: 14400,
    totalValidDurationSeconds: 25200,
    version: 1,
  },
  {
    id: "demo-grade-d",
    studentId: "demo-student-d",
    courseId: "demo-section-badminton-02",
    enrollmentId: "demo-enrollment-d",
    gender: "未知",
    gradeGroup: "大三/大四",
    enduranceStatus: "Exempt",
    physicalScore: 80,
    published: false,
    validCourseDurationSeconds: 32400,
    validGeneralDurationSeconds: 28800,
    totalValidDurationSeconds: 61200,
    version: 1,
  },
];

const initialExemptions: Exemption[] = [
  {
    id: "demo-exemption-a",
    studentId: "demo-student-a",
    courseId: "demo-section-pe101-01",
    kind: "耐力跑免测",
    reason: "本地审查用合成申请。",
    material: ["合成证明材料.jpg"],
    submittedAt: "2026-08-25T09:20:00+08:00",
    status: "pending",
    version: 1,
  },
  {
    id: "demo-exemption-c",
    studentId: "demo-student-c",
    courseId: "demo-section-pe101-01",
    kind: "社团认证",
    organization: "测试跑步社",
    reason: "需要补充训练签到记录。",
    material: ["合成社团证明.png"],
    submittedAt: "2026-08-24T16:30:00+08:00",
    status: "supplement_required",
    reviewComment: "请补充本学期训练签到。",
    version: 2,
  },
  {
    id: "demo-exemption-d",
    studentId: "demo-student-d",
    courseId: "demo-section-badminton-02",
    kind: "运动打卡减免",
    reason: "本地审查用已批准样例。",
    material: ["合成批准材料.jpg"],
    submittedAt: "2026-08-23T13:00:00+08:00",
    status: "approved",
    reviewComment: "合成材料完整。",
    otherOffset: 2,
    version: 2,
  },
];

function toneForStatus(status: string) {
  if (
    [
      "ACTIVE",
      "active",
      "有效",
      "已发布",
      "approved",
      "处理完成",
      "正常",
      "Recorded",
    ].includes(status)
  )
    return "green";
  if (
    [
      "REJECTED",
      "rejected",
      "removed",
      "exited",
      "disabled",
      "已关闭",
      "Absent",
      "已关闭",
    ].includes(status)
  )
    return "red";
  if (
    [
      "PENDING",
      "pending",
      "待受理",
      "需关注",
      "凭证模糊",
      "NEEDS_CORRECTION",
      "supplement_required",
      "NotRecorded",
    ].includes(status)
  )
    return "orange";
  return "gray";
}

function membershipStatusLabel(status: MembershipStatus) {
  return (
    {
      active: "在课",
      removed: "已移出课程",
      exited: "已退出课程",
      disabled: "成员关系已停用",
    } as const
  )[status];
}

function joinMethodLabel(method: Student["joinMethod"]) {
  return method === "qr" ? "扫码加入" : "手动导入";
}

function actualDurationLabel(record: CheckinRecord) {
  if (record.source === "system") return "教师补录";
  const minutes = Math.max(0, record.durationMinutes);
  if (!Number.isFinite(minutes))
    return `${record.originalHours.toFixed(1)} 小时`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0)
    return `${hours} 小时 ${remainingMinutes} 分`;
  if (hours > 0) return `${hours} 小时`;
  return `${remainingMinutes} 分`;
}

function attendanceHoursLabel(minutes: number) {
  return (Math.max(0, minutes) / 60).toFixed(1);
}

function singleRecordCreditedDurationLabel(minutes: number) {
  const creditedHours = toCreditedDurationHours(minutes);
  return creditedHours === null ? "异常" : `${creditedHours} 小时`;
}

function joinedWithinLast24Hours(value: string, now = Date.now()) {
  const joinedAt = Date.parse(value);
  return (
    Number.isFinite(joinedAt) &&
    joinedAt <= now &&
    now - joinedAt <= 24 * 60 * 60 * 1000
  );
}

function checkinMonthLabel(record: CheckinRecord) {
  const [year, month] = record.startAt.slice(0, 7).split("-");
  return year && month ? `${year} 年 ${Number(month)} 月` : "补录记录";
}

function checkinDayLabel(record: CheckinRecord) {
  const day = record.startAt.slice(8, 10);
  return /^\d{2}$/.test(day) ? `${Number(day)} 日` : "补录";
}

const auditStatusLabels: Record<AuditStatus, string> = {
  valid: statusLabel("valid", "audit"),
  invalid: statusLabel("invalid", "audit"),
};

// current API lets a teacher append only VALID or INVALID
// (CreateReviewRequest.result is `enum: [VALID, INVALID]`), and a submission
// already arrives VALID. There is no third review state.
const auditDecisionOptions: AuditStatus[] = ["valid", "invalid"];

function AuditStatusSelector({
  record,
  onSelect,
  onReturn,
}: {
  record: CheckinRecord;
  onSelect: (record: CheckinRecord, status: AuditStatus) => void;
  onReturn: (record: CheckinRecord) => void;
}) {
  return (
    <div
      className={`record-audit-control is-${record.auditStatus}`}
      data-audit-anchor
      tabIndex={-1}
    >
      <div className="record-audit-label">
        <span>审核状态</span>
        <b>{auditStatusLabels[record.auditStatus]}</b>
      </div>
      <div
        className="audit-status-selector"
        role="radiogroup"
        aria-label={`${record.sport}审核状态`}
      >
        {auditDecisionOptions.map((status) => {
          return (
            <button
              type="button"
              role="radio"
              aria-checked={record.auditStatus === status}
              className={`audit-status-option is-${status} ${record.auditStatus === status ? "selected" : ""}`.trim()}
              key={status}
              onClick={() => onSelect(record, status)}
            >
              <span aria-hidden="true" />
              {status === "valid" ? "通过" : "无效"}
            </button>
          );
        })}
        <button
          type="button"
          className="audit-status-option is-return"
          onClick={() => onReturn(record)}
        >
          <span aria-hidden="true" />
          退回补证
        </button>
      </div>
      <p className="record-audit-hint">
        通过与无效仍可走现有审核接口。退回补证和判无效必须选择 V8.1 六类固定公开原因，可再写一句公开补充说明；不再使用自由文本或其他兜底项。Backend 未实现时会显示真实错误，不在本地假装已退回。
      </p>
      {record.auditStatus === "invalid" && (
        <>
          <p className="record-invalid-reason">
            {record.invalidReason ? (
              <>
                <span>无效原因</span>
                {record.invalidReason}
                {record.auditRemark ? `：${record.auditRemark}` : ""}
              </>
            ) : (
              <span>该记录已被判定为无效。</span>
            )}
          </p>
          <p className="record-audit-hint">
            改回有效时需要填写纠正说明；原无效审核会保留在历史中。
          </p>
        </>
      )}
    </div>
  );
}

function CheckinAuditSummary({
  summary,
  requiredMinutes,
}: {
  summary: AttendanceAuditSummary;
  requiredMinutes: number;
}) {
  const validHours = attendanceHoursLabel(summary.validMinutes);
  const remainingHours = attendanceHoursLabel(summary.remainingMinutes);
  const exceededHours = attendanceHoursLabel(summary.exceededMinutes);

  return (
    <section className="checkin-audit-summary" aria-label="打卡审核汇总">
      <div className="audit-summary-progress">
        <div className="audit-summary-heading">
          <div>
            <span>有效时长</span>
            <strong>
              {validHours}
              <small> / {attendanceHoursLabel(requiredMinutes)} 小时</small>
            </strong>
          </div>
            <span className="audit-overall-status is-complete">有效学时汇总</span>
        </div>
        <div
          className="audit-progress-track"
          role="progressbar"
          aria-label="有效打卡时长进度"
          aria-valuemin={0}
          aria-valuemax={requiredMinutes}
          aria-valuenow={Math.min(summary.validMinutes, requiredMinutes)}
        >
          <span style={{ width: `${summary.progressPercent}%` }} />
        </div>
        <div className="audit-progress-note">
          <span>
            {summary.hasReachedTarget
              ? summary.exceededMinutes > 0
                ? `已超出目标 ${exceededHours} 小时`
                : "已达到教师设置的学时目标"
              : `还差 ${remainingHours} 小时`}
          </span>
          <span>有效 {summary.validCount} · 无效 {summary.invalidCount}</span>
        </div>
      </div>
    </section>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge badge-${tone ?? toneForStatus(String(children))}`}>
      {children}
    </span>
  );
}

function courseLabel(course?: Course) {
  return course ? course.name : "未知课程";
}

function checkinDateLabel(record: CheckinRecord) {
  const formatted = businessDateTime(record.startAt);
  return formatted ? formatted.split(" ")[0] : record.startAt;
}

function enduranceScoreLabel(grade: Grade) {
  if (grade.enduranceStatus === "Recorded") {
    return `${grade.gender === "男" ? "1000m" : "800m"} ${grade.minutes}'${String(grade.seconds).padStart(2, "0")}″ · ${grade.physicalScore}分`;
  }
  if (grade.enduranceStatus === "Exempt")
    return `免测 ${grade.physicalScore}分`;
  if (grade.enduranceStatus === "Absent") return "缺考 0分";
  return "等待录入";
}

function durationHoursLabel(seconds?: number) {
  if (seconds === undefined) return "—";
  return `${(seconds / 3600).toFixed(1)} h`;
}

function scoreStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    DRAFT: "草稿",
    CALCULATED: "已计算",
    PUBLISHED: "已发布",
    LOCKED: "已锁定",
  };
  return status ? labels[status] ?? status : "未生成";
}

function qualificationStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    QUALIFIED: "达标",
    NOT_QUALIFIED: "未达标",
    INSUFFICIENT_DURATION: "有效时长不足",
    PENDING: "待计算",
  };
  return status ? labels[status] ?? status : "未生成";
}

function scoreEndurance(
  totalSeconds: number,
  distance: 800 | 1000,
  senior: boolean,
) {
  const excellent =
    distance === 1000 ? (senior ? 220 : 225) : senior ? 225 : 230;
  const score =
    100 - Math.max(0, Math.ceil((totalSeconds - excellent) / 5) * 2);
  return Math.max(0, Math.min(100, score));
}

function isImageMaterial(file: string) {
  return /\.(?:avif|gif|heic|jpe?g|png|svg|webp)$/i.test(file);
}

function isVideoMaterial(file: string) {
  return /\.(?:m4v|mov|mp4|webm)$/i.test(file);
}

function proofMaterialLabel(file: string) {
  if (isVideoMaterial(file)) return "视频";
  if (isImageMaterial(file)) return "图片";
  return "凭证";
}

const CHECKIN_EVIDENCE_PREVIEW = "/checkin-evidence-preview.svg";

function CheckinEvidenceReviewer({
  record,
  activeProofIndex,
  imageZoom,
  videoPlaying,
  onProofChange,
  onImageZoomChange,
  onVideoPlayingChange,
  onDownload,
  realMode,
  onOpen,
}: {
  record: CheckinRecord;
  activeProofIndex: number;
  imageZoom: number;
  videoPlaying: boolean;
  onProofChange: (index: number) => void;
  onImageZoomChange: (zoom: number) => void;
  onVideoPlayingChange: (playing: boolean) => void;
  onDownload: (proof: string) => void;
  realMode: boolean;
  onOpen: () => void;
}) {
  const proof = record.proof[activeProofIndex];
  if (!proof)
    return (
      <EmptyState title="无凭证文件" description="该记录未附带照片或视频。" />
    );

  const video = isVideoMaterial(proof);
  const imageProofCount = record.proof.filter(isImageMaterial).length;
  const videoProofCount = record.proof.filter(isVideoMaterial).length;
  const canZoomIn = imageZoom < 2;
  const canZoomOut = imageZoom > 0.6;

  return (
    <section
      className="checkin-evidence-reviewer"
      aria-label="打卡凭证审核工具"
    >
      <div className="evidence-review-head">
        <div>
          <span className="eyebrow">运动凭证</span>
          <b>{record.proof.length} 份材料</b>
          <small className="evidence-material-summary">
            <span>{imageProofCount} 图片</span>
            <i aria-hidden="true">·</i>
            <span>{videoProofCount} 视频</span>
          </small>
        </div>
        <button
          className="secondary-button evidence-download-button"
          type="button"
          onClick={() => onDownload(proof)}
        >
          <Download size={15} />
          {realMode ? "打开真实原件" : "下载原件"}
        </button>
      </div>

      <div
        className="evidence-proof-tabs"
        role="tablist"
        aria-label="选择要审核的凭证"
      >
        {record.proof.map((item, index) => {
          const selected = index === activeProofIndex;
          const isVideo = isVideoMaterial(item);
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={selected}
              className={selected ? "is-selected" : ""}
              onClick={() => onProofChange(index)}
            >
              {/* Real evidence arrives as opaque media ids ("凭证 1"), because
                  /evidence-context returns identifiers only. Claiming 图片 for
                  an unlabelled item would mislabel every WebM/MP4 the student
                  recorded, so the type is shown only when the name proves it. */}
              <span>
                {isVideo ? (
                  <Play size={13} fill="currentColor" />
                ) : isImageMaterial(item) ? (
                  "图"
                ) : (
                  <FileIcon size={13} />
                )}
              </span>
              <b>{item}</b>
              <small>
                {proofMaterialLabel(item)}
              </small>
            </button>
          );
        })}
      </div>

      <div className="evidence-stage">
        {realMode ? (
          <div className="evidence-image-canvas">
            <EmptyState
              title="真实凭证受安全访问控制保护"
              description="点击下方按钮获取短期签名地址，并在新窗口查看服务端原件。此处不会显示固定占位图。"
            />
            <button className="primary-button" type="button" onClick={onOpen}>
              查看真实凭证
            </button>
          </div>
        ) : video ? (
          <div
            className={`evidence-video-player ${videoPlaying ? "is-playing" : ""}`}
          >
            <Image
              src={CHECKIN_EVIDENCE_PREVIEW}
              alt={`${proof} 的视频首帧预览`}
              width={1200}
              height={800}
              unoptimized
            />
            <button
              className="evidence-video-toggle"
              type="button"
              aria-label="播放或暂停视频"
              aria-pressed={videoPlaying}
              onClick={() => onVideoPlayingChange(!videoPlaying)}
            >
              {videoPlaying ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" />
              )}
            </button>
            <div className="evidence-video-controls" aria-label="视频播放进度">
              <span className="evidence-video-progress">
                <i />
              </span>
              <small>{videoPlaying ? "00:14 / 00:36" : "00:00 / 00:36"}</small>
            </div>
          </div>
        ) : (
          <div className="evidence-image-canvas">
            <Image
              src={CHECKIN_EVIDENCE_PREVIEW}
              alt={`${proof} 的图片预览`}
              width={1200}
              height={800}
              unoptimized
              style={{ transform: `scale(${imageZoom})` }}
            />
            <div className="evidence-image-controls" aria-label="图片缩放控制">
              <button
                type="button"
                disabled={!canZoomOut}
                aria-label="缩小图片"
                onClick={() =>
                  onImageZoomChange(
                    Math.max(0.6, Number((imageZoom - 0.2).toFixed(1))),
                  )
                }
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                className="evidence-zoom-value"
                aria-label="恢复原始缩放"
                onClick={() => onImageZoomChange(1)}
              >
                {Math.round(imageZoom * 100)}%
              </button>
              <button
                type="button"
                disabled={!canZoomIn}
                aria-label="放大图片"
                onClick={() =>
                  onImageZoomChange(
                    Math.min(2, Number((imageZoom + 0.2).toFixed(1))),
                  )
                }
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="evidence-review-caption">
        {realMode
          ? "凭证内容来自后端短期签名地址；当前页面不缓存或替换真实媒体。"
          : video
          ? "视频可播放并核对时长、场景与运动过程。"
          : "可缩放图片，核对时间、场景及运动凭证细节。"}
      </p>

    </section>
  );
}

function materialTypeLabel(_file: string) {
  void _file;
  return "图片";
}

function EvidenceMaterials({
  files,
  onPreview,
}: {
  files: string[];
  onPreview: (file: string) => void;
}) {
  return (
    <section
      className="evidence-materials"
      aria-label={`学生证明材料，共 ${files.length} 份`}
    >
      <div className="evidence-materials-head">
        <span>学生证明材料</span>
        <small>{files.length} 份 · 点击缩略图或文件名预览</small>
      </div>
      <div className="evidence-thumbnail-list">
        {files.map((file, index) => {
          const image = isImageMaterial(file);
          return (
            <button
              className={`evidence-thumbnail ${image ? "evidence-thumbnail-image" : "evidence-thumbnail-document"} evidence-thumbnail-tone-${index % 4}`}
              type="button"
              key={file}
              aria-label={`预览 ${file}`}
              onClick={() => onPreview(file)}
            >
              <span>{materialTypeLabel(file)}</span>
              <small>{file}</small>
            </button>
          );
        })}
      </div>
      <div className="material-file-links">
        {files.map((file) => (
          <button
            className="document-link"
            type="button"
            key={file}
            onClick={() => onPreview(file)}
          >
            {file}
            <span>预览 ↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Dialog({
  title,
  description,
  close,
  children,
  footer,
  wide = false,
  drawer = false,
  className = "",
  eyebrow = "教师端业务操作",
  headerContent,
  closeDisabled = false,
}: {
  title: string;
  description: React.ReactNode;
  close: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  drawer?: boolean;
  className?: string;
  eyebrow?: string;
  headerContent?: React.ReactNode;
  closeDisabled?: boolean;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabled) close();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [close, closeDisabled]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !closeDisabled && close()
      }
    >
      <section
        className={`modal teacher-dialog ${wide ? "teacher-dialog-wide" : ""} ${drawer ? "review-drawer" : ""} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-dialog-title"
        aria-busy={closeDisabled}
      >
        <div className="modal-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id="teacher-dialog-title">{title}</h2>
            {headerContent}
            <p>{description}</p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="关闭"
            disabled={closeDisabled}
            onClick={close}
          >
            ×
          </button>
        </div>
        <div className="teacher-dialog-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </section>
    </div>
  );
}

function CourseTargetStatCard({
  icon,
  label,
  value,
  tone = "blue",
  compact = false,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  tone?: "blue" | "orange" | "green" | "gray";
  compact?: boolean;
}) {
  return (
    <article
      className={`course-target-stat-card is-${tone} ${compact ? "is-compact" : ""}`.trim()}
    >
      <span className="course-target-stat-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <FormField
      className={`teacher-field ${className ?? ""}`.trim()}
      label={label}
      required={required}
      hint={hint}
      error={error}
    >
      {children}
    </FormField>
  );
}

export function TeacherWorkspace({
  active,
  direction,
  mode,
  showToast,
  onSemesterChange,
}: TeacherWorkspaceProps) {
  const [courses, setCourses] = useState<Course[]>(
    mode === "demo" ? initialCourses : [],
  );
  const [students, setStudents] = useState<Student[]>(
    mode === "demo" ? initialStudents : [],
  );
  const [records, setRecords] = useState<CheckinRecord[]>(
    mode === "demo" ? initialRecords : [],
  );
  const [grades, setGrades] = useState<Grade[]>(
    mode === "demo" ? initialGrades : [],
  );
  const [exemptions, setExemptions] = useState<Exemption[]>(
    mode === "demo" ? initialExemptions : [],
  );
  const [dialog, setDialog] = useState<DialogState>(null);
  const [materialPreview, setMaterialPreview] =
    useState<MaterialPreview | null>(null);
  const [activeCheckinProofIndex, setActiveCheckinProofIndex] = useState(0);
  const [checkinImageZoom, setCheckinImageZoom] = useState(1);
  const [checkinVideoPlaying, setCheckinVideoPlaying] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<FormErrorState>("");
  const [reviewTransitionPending, setReviewTransitionPending] = useState(false);
  const reviewTransitionLockRef = useRef(false);
  const reviewTransitionContextRef = useRef<InvalidToValidReviewOperation | null>(
    null,
  );
  const [courseFilter, setCourseFilter] = useState("all");
  const [courseView, setCourseView] = useState<"all" | "active">("all");
  const [reconciliationCourseId, setReconciliationCourseId] = useState<
    string | null
  >(null);
  const [rosterView, setRosterView] = useState<RosterView>("all");
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterSort, setRosterSort] = useState<
    "attention" | "progress" | "name"
  >("attention");
  const [checkinStudentId, setCheckinStudentId] = useState<string | null>(null);
  const [checkinDetailView, setCheckinDetailView] =
    useState<CheckinDetailView>("list");
  const [checkinReviewFilter, setCheckinReviewFilter] =
    useState<CheckinReviewFilter>("history");
  const [checkinAuditFilter, setCheckinAuditFilter] =
    useState<CheckinAuditFilter>("all");
  const [pendingRecordFocusId, setPendingRecordFocusId] = useState<
    string | null
  >(null);
  const [gradeCourseId, setGradeCourseId] = useState(
    mode === "demo" ? initialCourses[0]?.id ?? "" : "",
  );
  const [gradeView, setGradeView] = useState<
    "all" | "recorded" | "pending" | "exception"
  >("all");
  const [exemptionFilter, setExemptionFilter] =
    useState<ExemptionFilter>("pending");
  const [exemptionSearch, setExemptionSearch] = useState("");
  const [exemptionKind, setExemptionKind] = useState<"all" | Exemption["kind"]>(
    "all",
  );
  const [inviteClock, setInviteClock] = useState(() => Date.now());
  const [inviteQr, setInviteQr] = useState<{
    code: string;
    dataUrl: string;
  } | null>(null);
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(
    mode === "demo" ? demoSemester : null,
  );
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<UserFacingError | null>(null);
  const invitePresentationRef = useRef<HTMLDivElement>(null);
  const handleInviteQrReady = useCallback(
    (code: string, dataUrl: string) => setInviteQr({ code, dataUrl }),
    [],
  );

  useEffect(() => {
    if (mode !== "demo") return;
    return subscribeDemoCurrentSemester((semester) => {
      const label = semesterDisplayName(semester);
      setCurrentSemester(semester);
      setCourses((current) => current.map((course) => ({
        ...course,
        semester: label,
        semesterId: semester.id,
      })));
    });
  }, [mode]);

  useEffect(() => {
    onSemesterChange?.(semesterDisplayName(currentSemester));
  }, [currentSemester, onSemesterChange]);

  const refreshTeacherData = useCallback(async () => {
    if (mode === "demo") {
      setDataError(null);
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    setDataError(null);
    try {
      const { courses: nextCourses, semester } = await loadTeacherCourses();
      setCourses(nextCourses);
      setCurrentSemester(semester);
      const sectionIds = nextCourses.map((course) => course.id);
      const nextStudents = sectionIds.length
        ? await loadTeacherStudents(sectionIds)
        : [];
      const nextRecords = await loadSubmittedCheckins();
      const knownIds = new Set(nextStudents.map((student) => student.id));
      if (nextRecords.some((record) => !knownIds.has(record.studentId)))
        throw new Error("RECORD_STUDENT_PROJECTION_MISSING");
      setRecords(nextRecords);
      const [nextGrades, nextExemptions] = await Promise.all([
        loadTeacherGrades(nextStudents),
        loadTeacherExemptions(),
      ]);
      const gradesByEnrollment = new Map(
        nextGrades.map((grade) => [grade.enrollmentId, grade]),
      );
      setStudents(
        nextStudents.map((student) => {
          const score = gradesByEnrollment.get(student.enrollmentId);
          return {
            ...student,
            courseHours:
              Math.max(0, score?.validCourseDurationSeconds ?? 0) / 3600,
            otherHours:
              Math.max(0, score?.validGeneralDurationSeconds ?? 0) / 3600,
          };
        }),
      );
      setGrades(nextGrades);
      setExemptions(nextExemptions);
      setGradeCourseId((current) => {
        if (current && nextCourses.some((course) => course.id === current))
          return current;
        return (
          nextCourses.find((course) => course.status === "ACTIVE")?.id ??
          nextCourses[0]?.id ??
          ""
        );
      });
    } catch (error) {
      const userError =
        error instanceof Error &&
        error.message === "RECORD_STUDENT_PROJECTION_MISSING"
          ? localUserFacingError("后端返回了无法关联学生身份资料的打卡记录，已停止展示不完整数据。")
          : toUserFacingError(error);
      setCourses([]);
      setCurrentSemester(null);
      setStudents([]);
      setRecords([]);
      setGrades([]);
      setExemptions([]);
      setDataError(userError);
      showToast(userErrorToast(userError));
    } finally {
      setDataLoading(false);
    }
  }, [mode, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshTeacherData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active, refreshTeacherData]);

  useEffect(() => {
    const timer = window.setInterval(() => setInviteClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const teacherCourses = courses;
  const reconciliationCourses: RosterCourseReference[] = useMemo(
    () =>
      courses.map((course) => ({
        id: String(course.id),
        code: String(course.id),
        name: course.name,
        teachingClassCode: String(course.id),
      })),
    [courses],
  );
  const reconciliationMembers: PlatformCourseMember[] = useMemo(
    () =>
      students
        .filter(
          (student) =>
            student.status === "active" && Boolean(student.enrollmentId),
        )
        .map((student) => ({
          id: String(student.enrollmentId),
          courseId: String(student.courseId),
          studentId: String(student.id),
          studentNumber: student.number,
          name: student.name,
          gender: student.gender,
          grade: student.grade,
          joinedAt: student.joinedAt,
          joinMethod: student.joinMethod === "qr" ? "QR_CODE" : "IMPORT",
        })),
    [students],
  );
  const getCheckinSummary = (student: Student) => {
    const course = courses.find((item) => item.id === student.courseId);
    const approvedOffsets = exemptions.filter(
      (item) => item.studentId === student.id && item.status === "approved",
    );
    const courseTarget = Math.max(
      0,
      (course?.courseTarget ?? 0) -
        (student.courseWaiverHours ?? 0) -
        approvedOffsets.reduce(
          (total, item) => total + (item.courseOffset ?? 0),
          0,
        ),
    );
    const otherTarget = Math.max(
      0,
      (course?.otherTarget ?? 0) -
        (student.otherWaiverHours ?? 0) -
        approvedOffsets.reduce(
          (total, item) => total + (item.otherOffset ?? 0),
          0,
        ),
    );
    const expectedHours = courseTarget + otherTarget;
    const completedHours = student.courseHours + student.otherHours;
    const studentRecords = records.filter(
      (record) => record.studentId === student.id,
    );
    const confidence = mode === "demo" && studentRecords.length
      ? studentRecords.reduce(
          (total, record) => total + (record.confidence ?? 0),
          0,
        ) /
        studentRecords.length
      : null;
    return {
      expectedHours,
      remainingHours: Math.max(0, expectedHours - completedHours),
      confidence,
      recordCount: studentRecords.length,
    };
  };

  const getRosterProgress = (student: Student) => {
    const course = courses.find((item) => item.id === student.courseId);
    const approvedOffsets = exemptions.filter(
      (item) => item.studentId === student.id && item.status === "approved",
    );
    const courseWaiver =
      (student.courseWaiverHours ?? 0) +
      approvedOffsets.reduce(
        (total, item) => total + (item.courseOffset ?? 0),
        0,
      );
    const otherWaiver =
      (student.otherWaiverHours ?? 0) +
      approvedOffsets.reduce(
        (total, item) => total + (item.otherOffset ?? 0),
        0,
      );
    const courseTarget = Math.max(
      0,
      (course?.courseTarget ?? 0) - courseWaiver,
    );
    const otherTarget = Math.max(0, (course?.otherTarget ?? 0) - otherWaiver);
    const coursePercent = courseTarget
      ? Math.min(100, Math.round((student.courseHours / courseTarget) * 100))
      : 100;
    const otherPercent = otherTarget
      ? Math.min(100, Math.round((student.otherHours / otherTarget) * 100))
      : 100;
    const totalTarget = courseTarget + otherTarget;
    const totalPercent = totalTarget
      ? Math.min(
          100,
          Math.round(
            ((student.courseHours + student.otherHours) / totalTarget) * 100,
          ),
        )
      : 100;
    return {
      course,
      courseWaiver,
      otherWaiver,
      courseTarget,
      otherTarget,
      coursePercent,
      otherPercent,
      totalPercent,
    };
  };

  const getCourseManagementSummary = (course: Course) => {
    const enrolledStudents = students.filter(
      (student) =>
        student.courseId === course.id && student.status === "active",
    );
    const studentCount = enrolledStudents.length;
    const qualifiedStudentCount = enrolledStudents.filter(
      (student) => getRosterProgress(student).totalPercent >= 100,
    ).length;
    const unqualifiedStudentCount = studentCount - qualifiedStudentCount;
    const completionRate =
      studentCount > 0
        ? Math.round((qualifiedStudentCount / studentCount) * 100)
        : 0;
    const pendingAuditRecordCount = records.filter(
      (record) => record.courseId === course.id && record.auditStatus === "invalid",
    ).length;
    const newStudentCount = enrolledStudents.filter((student) =>
      joinedWithinLast24Hours(student.joinedAt),
    ).length;

    return {
      studentCount,
      qualifiedStudentCount,
      unqualifiedStudentCount,
      completionRate,
      pendingAuditRecordCount,
      newStudentCount,
    };
  };

  const studentProfileFor = (student: Student): StudentProfile => {
    const course = courses.find((item) => item.id === student.courseId);
    return {
      id: `student-${student.id}`,
      name: student.name,
      number: student.number,
      email: student.email,
      gender: student.gender,
      grade: student.grade,
      joinedAt: businessDateTime(student.joinedAt) || "—",
      joinMethod: joinMethodLabel(student.joinMethod),
      course: courseLabel(course),
      courseStatus: membershipStatusLabel(student.status),
    };
  };

  const studentCourseMetricsFor = (student: Student): StudentCourseMetric[] => {
    const studentRecords = records.filter(
      (record) => record.studentId === student.id,
    );
    const studentGrade = grades.find(
      (grade) =>
        grade.studentId === student.id && grade.courseId === student.courseId,
    );
    const pendingReviewCount = exemptions.filter(
        (item) =>
          item.studentId === student.id &&
          (item.status === "pending" || item.status === "supplement_required"),
      ).length;
    const gradeStatus = !studentGrade
      ? "暂无成绩"
      : studentGrade.published
        ? "已发布"
        : statusLabel(studentGrade.enduranceStatus, "grade");

    return [
      {
        label: "累计运动学时",
        value: `${(student.courseHours + student.otherHours).toFixed(1)}h`,
      },
      { label: "打卡次数", value: `${studentRecords.length} 次` },
      {
        label: "成绩状态",
        value: gradeStatus,
        tone:
          gradeStatus === "待录入" || gradeStatus === "缺考"
            ? "attention"
            : "default",
      },
      {
        label: "待审核内容",
        value: pendingReviewCount > 0 ? `${pendingReviewCount} 项` : "无",
        tone: pendingReviewCount > 0 ? "attention" : "success",
      },
    ];
  };

  // Removing a member blocks new check-ins but must not hide or delete existing
  // pending/valid/invalid records from the teacher's audit workspace.
  const checkinStudents = students.filter(
    (student) =>
      student.status === "active" ||
      records.some((record) => record.studentId === student.id),
  );
  const checkinStudentSummaries = checkinStudents.map((student) => ({
    student,
    ...getCheckinSummary(student),
  }));
  const selectedCheckinStudent = checkinStudents.find(
    (student) => student.id === checkinStudentId,
  );
  const selectedCheckinSummary = selectedCheckinStudent
    ? getCheckinSummary(selectedCheckinStudent)
    : undefined;
  const selectedCheckinCourse = courses.find(
    (course) => course.id === selectedCheckinStudent?.courseId,
  );
  const selectedCheckinRequiredMinutes =
    ((selectedCheckinCourse?.courseTarget ?? 0) +
      (selectedCheckinCourse?.otherTarget ?? 0)) *
    60;
  const selectedStudentCheckins = useMemo(
    () =>
      checkinStudentId === null
        ? []
        : records
            .filter((record) => record.studentId === checkinStudentId)
            .sort((left, right) => right.startAt.localeCompare(left.startAt)),
    [checkinStudentId, records],
  );
  const selectedCheckinAuditSummary = useMemo(
    () =>
      deriveAuditSummary(
        selectedStudentCheckins,
        selectedCheckinRequiredMinutes,
      ),
    [selectedCheckinRequiredMinutes, selectedStudentCheckins],
  );
  const visibleSelectedStudentCheckins = useMemo(
    () =>
      selectedStudentCheckins.filter(
        (record) =>
          checkinAuditFilter === "all" ||
          record.auditStatus === checkinAuditFilter,
      ),
    [checkinAuditFilter, selectedStudentCheckins],
  );
  const selectedCheckinAlbums = useMemo(
    () =>
      visibleSelectedStudentCheckins.reduce<
        { month: string; records: CheckinRecord[] }[]
      >((groups, record) => {
        const month = checkinMonthLabel(record);
        const group = groups.find((item) => item.month === month);
        if (group) group.records.push(record);
        else groups.push({ month, records: [record] });
        return groups;
      }, []),
    [visibleSelectedStudentCheckins],
  );

  useEffect(() => {
    if (pendingRecordFocusId === null) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const recordElement = document.getElementById(
        `checkin-record-${pendingRecordFocusId}`,
      );
      recordElement?.scrollIntoView({ behavior: "smooth", block: "center" });
      recordElement
        ?.querySelector<HTMLElement>("[data-audit-anchor]")
        ?.focus({ preventScroll: true });
      setPendingRecordFocusId(null);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [checkinAuditFilter, checkinDetailView, pendingRecordFocusId]);

  const openDialog = (
    nextDialog: Exclude<DialogState, null>,
    initialForm: Record<string, string> = {},
  ) => {
    setForm(initialForm);
    setFormError("");
    setDialog(nextDialog);
  };

  const closeDialog = () => {
    setDialog(null);
    setForm({});
    setFormError("");
  };

  const closeCorrectionDialog = () => {
    if (reviewTransitionLockRef.current) return;
    reviewTransitionContextRef.current = null;
    closeDialog();
  };

  const openMaterialPreview = (
    file: string,
    studentName: string,
  ) => {
    setMaterialPreview({ file, studentName });
  };

  const updateForm = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (formError) setFormError("");
  };

  const selectRecordAuditStatus = async (
    record: CheckinRecord,
    status: AuditStatus,
  ) => {
    if (status === "invalid") {
      openDialog(
        { type: "checkin-invalid", recordId: record.id },
        {
          publicReasonId:
            markInvalidReasons.find((reason) => reason.zh === record.invalidReason)?.id ?? "",
          publicSupplementalNote: record.auditRemark ?? "",
        },
      );
      return;
    }
    if (status !== "valid") return;
    if (record.auditStatus === status) return;
    if (mode === "demo") {
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? {
                ...applyAttendanceAuditState(item, {
                  auditStatus: "valid",
                  auditRemark: form.auditRemark?.trim() || "Mock 审核通过",
                }),
                status: "有效",
              }
            : item,
        ),
      );
      showToast("Mock 记录已标记为有效，汇总已在本地更新。");
      return;
    }
    if (record.auditStatus === "invalid") {
      if (
        reviewTransitionLockRef.current ||
        reviewTransitionContextRef.current
      ) {
        return;
      }
      reviewTransitionContextRef.current =
        createInvalidToValidReviewOperation(record.id);
      openDialog(
        { type: "checkin-correct-valid", recordId: record.id },
        { correctionReason: "" },
      );
      return;
    }
    try {
      await submitExerciseReviewWithRetry(
        record.id,
        (fresh, currentReviewVersion) => ({
          result: "VALID",
          publicComment: form.auditRemark?.trim() || "有效",
          reasonCode: null,
          reason: null,
          expectedReviewVersion: currentReviewVersion,
          expectedVersion: fresh.version,
        }),
      );
      await refreshTeacherData();
      showToast("已标记为有效，汇总有效时长已更新。");
    } catch (error) {
      showToast(userErrorToast(toUserFacingError(error)));
    }
  };

  const openReturnForProof = (record: CheckinRecord) => {
    if (mode === "demo") {
      showToast("演示模式不把退回补证写成正式结果。");
      return;
    }
    openDialog(
      { type: "checkin-return-proof", recordId: record.id },
      { proofWindowHours: "24", publicReasonId: "", publicSupplementalNote: "" },
    );
  };

  const confirmReturnForProof = async (recordId: string) => {
    const selectedReason = publicReasonById(form.publicReasonId);
    const publicNote = form.publicSupplementalNote?.trim() || "";
    const windowHours = form.proofWindowHours === "72" ? 72 : 24;
    if (!selectedReason || !selectedReason.actions.includes(TEACHER_REVIEW_ACTIONS.ReturnForSupplement)) {
      setFormError("请选择一项适用于退回补证的固定公开原因。");
      return;
    }
    const reason = publicNote ? `${selectedReason.zh}\n${publicNote}` : selectedReason.zh;
    const record = records.find((item) => item.id === recordId);
    if (!record) {
      setFormError("找不到该打卡记录。");
      return;
    }
    try {
      const fresh = await fetchExerciseRecord(recordId);
      await returnExerciseRecordForProof(record.courseId, recordId, {
        studentVisibleReason: reason,
        proofWindowHours: windowHours,
        expectedVersion: fresh.version,
      });
      await refreshTeacherData();
      closeDialog();
      showToast("已提交退回补证。服务端确认前不会在本地假装已退回。");
    } catch (error) {
      showToast(userErrorToast(toUserFacingError(error)));
    }
  };

  const confirmCorrectAttendanceToValid = async (recordId: string) => {
    const correctionReason = form.correctionReason?.trim();
    const operation = reviewTransitionContextRef.current;
    if (!correctionReason) {
      setFormError("请填写纠正说明；原无效审核记录不会被覆盖。");
      return;
    }
    if (mode === "demo") {
      setRecords((current) =>
        current.map((record) =>
          record.id === recordId
            ? {
                ...applyAttendanceAuditState(record, {
                  auditStatus: "valid",
                  auditRemark: correctionReason,
                }),
                status: "有效",
              }
            : record,
        ),
      );
      reviewTransitionContextRef.current = null;
      closeDialog();
      showToast("Mock 记录已追加有效结论；原无效情景可通过复位数据恢复。");
      return;
    }
    if (!operation || operation.recordId !== recordId) {
      const message =
        "本地操作上下文已失效，本次没有发送写请求。请关闭后从最新记录重新操作。requestId：未生成。";
      await refreshTeacherData();
      setFormError(message);
      showToast(typeof message === "string" ? message : userErrorToast(message));
      return;
    }
    if (!tryAcquireReviewTransitionLock(reviewTransitionLockRef)) return;
    // The ref changes synchronously, before the first await. React state alone
    // cannot stop two click handlers that enter during the same render frame.
    setReviewTransitionPending(true);
    try {
      await transitionInvalidExerciseReviewToValid(
        recordId,
        correctionReason,
        operation,
      );
      await refreshTeacherData();
      reviewTransitionContextRef.current = null;
      closeDialog();
      showToast("已追加有效结论；原无效审核仍保留在历史中。");
    } catch (error) {
      const message: FormErrorState =
        error instanceof ReviewTransitionConsistencyError
          ? "客户端在写入前发现服务端最新审核状态与本操作不一致，已停止追加并刷新真实状态。requestId：未生成（本地一致性检查停止写入）。"
          : toUserFacingError(error);
      // Never paint a local success state. Re-read Backend projections even
      // when only one of the two append operations completed.
      await refreshTeacherData();
      setFormError(message);
      showToast(typeof message === "string" ? message : userErrorToast(message));
    } finally {
      reviewTransitionLockRef.current = false;
      setReviewTransitionPending(false);
    }
  };

  const confirmInvalidAttendance = async (recordId: string) => {
    const record = records.find((item) => item.id === recordId);
    const selectedReason = publicReasonById(form.publicReasonId);
    const auditRemark = form.publicSupplementalNote?.trim() || form.auditRemark?.trim() || "";
    if (!record || !selectedReason || !selectedReason.actions.includes(TEACHER_REVIEW_ACTIONS.MarkInvalid)) {
      setFormError("请选择一项适用于判为无效的固定公开原因。");
      return;
    }
    const invalidReason = selectedReason.zh;
    if (mode === "demo") {
      setRecords((current) =>
        current.map((item) =>
          item.id === recordId
            ? {
                ...applyAttendanceAuditState(item, {
                  auditStatus: "invalid",
                  invalidReason,
                  auditRemark: auditRemark || invalidReason,
                }),
                status: "已调整",
              }
            : item,
        ),
      );
      showToast("Mock 记录已标记为无效，汇总已在本地更新。");
      closeDialog();
      return;
    }
    try {
      await submitExerciseReviewWithRetry(
        recordId,
        (fresh, currentReviewVersion) => ({
          result: "INVALID",
          publicComment: auditRemark || invalidReason,
          reasonCode: null,
          reason: invalidReason,
          expectedReviewVersion: currentReviewVersion,
          expectedVersion: fresh.version,
        }),
      );
      await refreshTeacherData();
      showToast("已标记为无效，汇总有效时长已更新。");
      closeDialog();
    } catch (error) {
      setFormError(toUserFacingError(error));
    }
  };

  const openCheckinStudentRecords = (studentId: string) => {
    setCheckinStudentId(studentId);
    setCheckinDetailView("list");
    setCheckinAuditFilter("all");
    setPendingRecordFocusId(null);
  };

  const notify = (message: string, forced = false) => {
    showToast(
      `${message}${forced ? "；已自动发送不可静默的学生通知。" : "；学生通知已自动生成。"}`,
    );
  };

  const addCourse = async () => {
    const displayName = form.name?.trim() || form.displayName?.trim();
    const semesterId = currentSemester?.id;
    if (!displayName || !semesterId) {
      setFormError("课程名称为必填项。");
      return;
    }
    if (mode === "demo") {
      const id = `mock-course-${Date.now()}`;
      setCourses((current) => [
        ...current,
        {
          id,
          name: displayName,
          semester: semesterDisplayName(currentSemester, "Mock 当前学期"),
          semesterId,
          courseId: id,
          status: "ACTIVE",
          courseTarget: 10,
          otherTarget: 10,
          checkinWindow: { ...initialCourses[0].checkinWindow, excludedDates: [...initialCourses[0].checkinWindow.excludedDates] },
        },
      ]);
      showToast(`Mock 课程“${displayName}”已创建。`);
      closeDialog();
      return;
    }
    setFormError("真实后端尚未实现教师仅按课程名称创建课程的接口；本次未发送旧格式请求。");
  };

  const saveCourseSettings = async (courseId: string) => {
    const courseTarget = Number(form.courseTarget);
    const otherTarget = Number(form.otherTarget);
    if (
      (!Number.isFinite(courseTarget) ||
        !Number.isFinite(otherTarget) ||
        courseTarget < 0 ||
        otherTarget < 0)
    ) {
      setFormError("两类学时目标必须为不小于 0 的数字。");
      return;
    }
    const courseTargetSeconds = courseTarget * 3600;
    const generalTargetSeconds = otherTarget * 3600;
    if (
      !Number.isInteger(courseTargetSeconds) ||
      !Number.isInteger(generalTargetSeconds) ||
      courseTargetSeconds + generalTargetSeconds !== 72000
    ) {
      setFormError("两类学时目标必须合计 20 小时，且精确到秒。");
      return;
    }
    const windowMode =
      form.windowMode === "unavailable" ? "unavailable" : "available";
    const dateRangeStart = form.dateRangeStart?.trim();
    const dateRangeEnd = form.dateRangeEnd?.trim();
    const dailyStartTime = form.dailyStartTime?.trim();
    const dailyEndTime = form.dailyEndTime?.trim();
    const semesterDeadline = form.semesterDeadline?.trim();
    if (
      !dateRangeStart ||
      !dateRangeEnd ||
      !dailyStartTime ||
      !dailyEndTime ||
      !semesterDeadline
    ) {
      setFormError("请完整填写打卡时间窗的日期和每日时段。");
      return;
    }
    if (dateRangeEnd < dateRangeStart) {
      setFormError("打卡结束日期不能早于开始日期。");
      return;
    }
    if (dailyEndTime <= dailyStartTime) {
      setFormError("每日结束时间必须晚于开始时间。");
      return;
    }
    if (semesterDeadline > dateRangeEnd) {
      setFormError("学期截止日期不能晚于打卡结束日期。");
      return;
    }
    const excludedDates = (form.excludedDates ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [date, ...reasonParts] = line.split(",");
        return {
          date: date?.trim() ?? "",
          reason: reasonParts.join(",").trim(),
        };
      });
    if (
      excludedDates.some(
        (item) => !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !item.reason,
      )
    ) {
      setFormError("排除日期请按“YYYY-MM-DD, 原因”每行一条填写。");
      return;
    }
    if (
      new Set(excludedDates.map((item) => item.date)).size !==
      excludedDates.length
    ) {
      setFormError("排除日期不能重复。");
      return;
    }
    if (
      excludedDates.some(
        (item) => item.date < dateRangeStart || item.date > dateRangeEnd,
      )
    ) {
      setFormError("排除日期必须位于打卡日期范围内。");
      return;
    }
    const checkinWindow: CheckinWindow = {
      windowMode,
      dateRangeStart,
      dateRangeEnd,
      dailyStartTime,
      dailyEndTime,
      excludedDates,
      semesterDeadline,
    };
    const target = courses.find((course) => course.id === courseId);
    if (!target) {
      setFormError("找不到该课程，请刷新后重试。");
      return;
    }
    if (mode === "demo") {
      setCourses((current) =>
        current.map((course) =>
          course.id === courseId
            ? { ...course, courseTarget, otherTarget, checkinWindow }
            : course,
        ),
      );
      showToast("Mock 打卡时间窗与学时目标已保存到本地。");
      closeDialog();
      return;
    }
    // Demo rows carry no snapshot version and must never be PATCHed.
    if (typeof target.version !== "number") {
      setFormError("该课程不是后端真实数据（演示模式），无法保存到服务器。");
      return;
    }
    try {
      const updatedSection = await updateClassSectionWindow(courseId, {
        checkInWindowMode:
          windowMode === "unavailable" ? "UNAVAILABLE" : "AVAILABLE",
        checkInStartDate: dateRangeStart,
        checkInEndDate: dateRangeEnd,
        // current API accepts organization-local wall clock, which is exactly
        // what <input type="time"> produces.
        dailyStartTime,
        dailyEndTime,
        // The API stores a deadline instant; the form edits a date, so the
        // day is submitted as its final local second.
        submissionDeadlineAt: new Date(
          `${semesterDeadline}T23:59:59`,
        ).toISOString(),
        // Only the dates are API fields; the local reason text is kept for display.
        excludedDates: excludedDates.map((item) => item.date),
        expectedVersion: target.version,
      });
      await reviseClassProgressTarget(courseId, {
        courseTargetSeconds,
        generalTargetSeconds,
        reason: "教师更新课程学时目标",
        expectedVersion: updatedSection.version,
      });
    } catch (error) {
      setFormError(toUserFacingError(error));
      return;
    }
    setCourses((current) =>
      current.map((course) =>
        course.id === courseId
          ? {
              ...course,
              courseTarget,
              otherTarget,
              checkinWindow,
            }
          : course,
      ),
    );
    await refreshTeacherData();
    showToast("打卡时间窗已保存到后端；20 小时总目标由服务端成绩规则统一裁决。");
    closeDialog();
  };

  const generateInvite = async (courseId: string): Promise<boolean> => {
    const durationMinutes = Math.round(Number(form.inviteDurationMinutes || "30"));
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 120) {
      showToast("邀请有效期须为 5–120 的整数分钟。");
      return false;
    }
    if (mode === "demo") {
      const code = `MOCK-${String(Date.now()).slice(-6)}`;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      setCourses((current) =>
        current.map((course) =>
          course.id === courseId
            ? { ...course, invite: { code, expiresAt, status: "active", durationMinutes } }
            : course,
        ),
      );
      setInviteQr(null);
      showToast(`Mock 邀请码 ${code} 已生成（${durationMinutes} 分钟）。`);
      return true;
    }
    const target = courses.find((course) => course.id === courseId);
    if (typeof target?.version !== "number") {
      showToast("缺少课程版本，无法按 Contract 生成邀请。");
      return false;
    }
    try {
      const created = await createContractCourseInvitation(courseId, {
        durationMinutes,
        expectedCourseVersion: target.version,
      });
      setCourses((current) =>
        current.map((course) =>
          course.id === courseId
            ? {
                ...course,
                invite: {
                  code: created.invitationCode,
                  expiresAt: created.invitation.expiresAt,
                  status: "active",
                  durationMinutes: created.invitation.durationMinutes,
                },
              }
            : course,
        ),
      );
      setInviteQr(null);
      showToast(`已生成新的课程邀请（${created.invitation.durationMinutes} 分钟）；服务端返回的到期时间为 ${created.invitation.expiresAt}。`);
      return true;
    } catch (error) {
      showToast(userErrorToast(toUserFacingError(error)));
      return false;
    }
  };

  const revokeInvite = async (courseId: string) => {
    if (mode !== "demo") {
      if (await generateInvite(courseId)) closeDialog();
      return;
    }
    setCourses((current) =>
      current.map((course) =>
        course.id === courseId && course.invite
          ? {
              ...course,
              invite: { ...course.invite, status: "revoked" },
            }
          : course,
      ),
    );
    showToast("邀请码已撤销，学生将不能再凭此码加入课程。");
    closeDialog();
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  };

  const copyInviteCode = async (invite: Invite) => {
    const copied = await copyText(invite.code);
    showToast(
      copied
        ? `邀请码 ${invite.code} 已复制。`
        : "未能自动复制邀请码，请手动选择后复制。",
    );
  };

  const downloadInviteQr = (course: Course, invite: Invite) => {
    const dataUrl = inviteQr?.code === invite.code ? inviteQr.dataUrl : null;
    if (!dataUrl) {
      showToast("二维码正在生成，请稍候再下载。");
      return;
    }
    const anchor = document.createElement("a");
    const safeCourseName = course.name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "课程";
    anchor.href = dataUrl;
    anchor.download = `${safeCourseName}-${invite.code}-二维码.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showToast("二维码已下载，可投影或发送给学生。");
  };

  const presentInviteQr = () => {
    const target = invitePresentationRef.current;
    if (!target?.requestFullscreen) {
      showToast("当前浏览器不支持全屏展示，请使用下载或打印功能。");
      return;
    }
    void target
      .requestFullscreen()
      .catch(() => showToast("无法进入全屏展示，请检查浏览器权限。"));
  };

  const runStudentAction = async (
    studentId: string,
    action: "remove" | "supplement" | "waiver",
    actionTimestamp: number,
  ) => {
    const student = students.find((item) => item.id === studentId);
    const reason = form.reason?.trim();
    if (!student) return;
    if (mode !== "demo" && action === "waiver") {
      setFormError("该操作没有已批准的后端能力，真实模式不会创建本地减免事实。");
      return;
    }
    if (action === "remove") {
      if (!reason) {
        setFormError("移出课程原因必填，学生将收到课程成员关系变更通知。");
        return;
      }
      if (mode !== "demo") {
        if (!student.enrollmentId || typeof student.version !== "number") {
          setFormError("缺少服务端成员关系版本，请刷新后重试。");
          return;
        }
        try {
          await removeEnrollment(student.enrollmentId, student.version, reason);
          await refreshTeacherData();
          showToast(`已将 ${student.name} 移出课程；原打卡和成绩保留为历史记录。`);
          closeDialog();
        } catch (error) {
          setFormError(toUserFacingError(error));
        }
        return;
      }
      setStudents((current) =>
        current.map((item) =>
          item.id === studentId ? { ...item, status: "removed" } : item,
        ),
      );
      notify(`已将 ${student.name} 移出课程；原打卡和成绩保留为只读历史`);
    } else if (action === "waiver") {
      const hours = Number(form.hours);
      const creditType = form.creditType as "课程相关" | "其他运动";
      const course = courses.find((item) => item.id === student.courseId);
      const isCourseHours = creditType === "课程相关";
      const currentWaiver = isCourseHours
        ? (student.courseWaiverHours ?? 0)
        : (student.otherWaiverHours ?? 0);
      const approvedOffset = exemptions
        .filter(
          (item) => item.studentId === studentId && item.status === "approved",
        )
        .reduce(
          (total, item) =>
            total +
            (isCourseHours
              ? (item.courseOffset ?? 0)
              : (item.otherOffset ?? 0)),
          0,
        );
      const target = isCourseHours
        ? (course?.courseTarget ?? 0)
        : (course?.otherTarget ?? 0);
      const availableHours = Math.max(
        0,
        target - currentWaiver - approvedOffset,
      );
      if (!Number.isFinite(hours) || hours <= 0 || !creditType || !reason) {
        setFormError("减免类别、减免时长和减免原因均为必填项，时长须大于 0。");
        return;
      }
      if (hours > availableHours) {
        setFormError(
          `该类别最多还可减免 ${availableHours.toFixed(1)} 小时，请调整减免时长。`,
        );
        return;
      }
      setStudents((current) =>
        current.map((item) =>
          item.id === studentId
            ? {
                ...item,
                courseWaiverHours: isCourseHours
                  ? currentWaiver + hours
                  : (item.courseWaiverHours ?? 0),
                otherWaiverHours: isCourseHours
                  ? (item.otherWaiverHours ?? 0)
                  : currentWaiver + hours,
              }
            : item,
        ),
      );
      const completedHours = isCourseHours
        ? student.courseHours
        : student.otherHours;
      const remainingHours = Math.max(
        0,
        availableHours - hours - completedHours,
      );
      notify(
        `已为 ${student.name} 减免 ${hours} 小时${creditType}，该类别还需完成 ${remainingHours.toFixed(1)} 小时`,
        true,
      );
    } else {
      const minutes = Math.round(Number(form.makeupMinutes || "30"));
      const sportType = MAKEUP_SPORT_TYPES.some((item) => item.value === form.sport)
        ? (form.sport as (typeof MAKEUP_SPORT_TYPES)[number]["value"])
        : "";
      if (
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 60 ||
        !form.creditType ||
        !sportType ||
        !reason
      ) {
        setFormError("学时类别、1–60 整分钟、运动项目和补录原因均为必填项。");
        return;
      }
      if (mode !== "demo") {
        const course = courses.find((item) => item.id === student.courseId);
        if (!student.enrollmentId || typeof course?.version !== "number") {
          setFormError("缺少成员关系或课程版本，无法补录。");
          return;
        }
        try {
          await createMakeupExerciseRecord(student.courseId, {
            enrollmentId: student.enrollmentId,
            category: form.creditType === "课程相关" ? "COURSE_RELATED" : "OTHER",
            sportType,
            description: reason,
            creditedMinutes: minutes,
            expectedCourseVersion: course.version,
          });
          await refreshTeacherData();
          showToast("已提交教师补录。服务端确认前不会在本地假装已计入。");
          closeDialog();
        } catch (error) {
          setFormError(toUserFacingError(error));
        }
        return;
      }
      const nextRecord: CheckinRecord = {
        id: `local-supplement-${actionTimestamp}`,
        studentId,
        courseId: student.courseId,
        creditType: form.creditType as "课程相关" | "其他运动",
        sport: MAKEUP_SPORT_TYPES.find((item) => item.value === sportType)?.label || sportType,
        startAt: "教师补录",
        endAt: "教师补录",
        durationMinutes: minutes,
        creditedMinutes: minutes,
        originalHours: minutes / 60,
        approvedHours: minutes / 60,
        description: reason,
        submittedAt: new Date().toISOString().slice(0, 10),
        status: "有效",
        risk: "低风险",
        confidence: 1,
        proof: form.proof ? [form.proof] : [],
        locationExpired: false,
        source: "system",
        reviewComment: reason,
        auditStatus: "valid",
      };
      setRecords((current) => [...current, nextRecord]);
      setStudents((current) =>
        current.map((item) =>
          item.id === studentId
            ? {
                ...item,
                courseHours:
                  item.courseHours +
                  (form.creditType === "课程相关" ? minutes / 60 : 0),
                otherHours:
                  item.otherHours +
                  (form.creditType === "其他运动" ? minutes / 60 : 0),
              }
            : item,
        ),
      );
      notify(
        `演示模式已为 ${student.name} 本地记下 ${minutes} 分钟${form.creditType}，不会当成服务端已计入。`,
        true,
      );
    }
    closeDialog();
  };

  const saveGrade = async (gradeId: string) => {
    const grade = grades.find((item) => item.id === gradeId);
    if (!grade) return;
    if (mode !== "demo") {
      if (grade.id.startsWith("pending:") || typeof grade.version !== "number") {
        setFormError("该学生尚无服务端成绩投影，需先由服务端成绩任务生成后才能重新计算。");
        return;
      }
      try {
        await recalculateStudentScore(grade.id, grade.version);
        await refreshTeacherData();
        showToast("服务端已重新计算该学生成绩。发布前学生端不会看到未发布分数。");
        closeDialog();
      } catch (error) {
        setFormError(toUserFacingError(error));
      }
      return;
    }
    const status = form.enduranceStatus as GradeStatus;
    let physicalScore = grade.physicalScore;
    let minutes = grade.minutes;
    let seconds = grade.seconds;
    if (status === "Recorded") {
      minutes = Number(form.minutes);
      seconds = Number(form.seconds);
      if (
        !Number.isInteger(minutes) ||
        !Number.isInteger(seconds) ||
        minutes < 0 ||
        seconds < 0 ||
        seconds > 59
      ) {
        setFormError("请填写有效的耐力跑分钟和秒数。");
        return;
      }
      physicalScore = scoreEndurance(
        minutes * 60 + seconds,
        grade.gender === "男" ? 1000 : 800,
        grade.gradeGroup === "大三/大四",
      );
    } else if (status === "Absent") {
      if (!form.reason?.trim()) {
        setFormError("标记缺考时必须填写缺考原因。");
        return;
      }
      physicalScore = 0;
      minutes = undefined;
      seconds = undefined;
    } else if (status === "NotRecorded") {
      physicalScore = undefined;
      minutes = undefined;
      seconds = undefined;
    } else if (status === "Exempt") {
      physicalScore = grade.physicalScore;
    }
    setGrades((current) =>
      current.map((item) =>
        item.id === gradeId
          ? {
              ...item,
              enduranceStatus: status,
              minutes,
              seconds,
              physicalScore,
            }
          : item,
      ),
    );
    notify(
      grade.published ? "已发布成绩已修改，审计来源已记录" : "学生成绩已保存",
      grade.published,
    );
    closeDialog();
  };

  const publishGrades = async (courseId: string) => {
    if (mode !== "demo") {
      const publishable = grades.filter(
        (grade) =>
          grade.courseId === courseId &&
          !grade.published &&
          !grade.id.startsWith("pending:") &&
          typeof grade.version === "number",
      );
      if (!publishable.length) {
        setFormError("当前没有可发布的服务端成绩；缺失成绩投影的学生不会被伪造为已发布。");
        return;
      }
      try {
        for (const grade of publishable) {
          await publishStudentScore(grade.id, grade.version as number);
        }
        await refreshTeacherData();
        showToast(`已在服务端发布 ${publishable.length} 条成绩。`);
        closeDialog();
      } catch (error) {
        setFormError(toUserFacingError(error));
      }
      return;
    }
    setGrades((current) =>
      current.map((grade) =>
        grade.courseId === courseId ? { ...grade, published: true } : grade,
      ),
    );
    notify("全班成绩已发布", true);
    closeDialog();
  };

  const reviewExemption = async (exemptionId: string | number) => {
    const item = exemptions.find((exemption) => exemption.id === exemptionId);
    const decision = form.decision as "approve" | "reject" | "supplement";
    const comment = form.comment?.trim();
    if (!item || !decision || !comment) {
      setFormError("审核结果和学生可见的审核意见均为必填项。");
      return;
    }
    if (mode !== "demo") {
      if (typeof item.version !== "number") {
        setFormError("缺少申请版本，请刷新后重试。");
        return;
      }
      const contractDecision =
        decision === "approve"
          ? "APPROVE"
          : decision === "reject"
            ? "REJECT"
            : "REQUEST_SUPPLEMENT";
      try {
        await reviewExemptionApplication(String(item.id), {
          decision: contractDecision,
          publicComment: comment,
          expectedVersion: item.version,
        });
        await refreshTeacherData();
        showToast("免测/减免申请审核结果已保存到服务端；该操作不会伪造成绩或抵扣时长。");
        closeDialog();
      } catch (error) {
        setFormError(toUserFacingError(error));
      }
      return;
    }
    const next: Partial<Exemption> = { reviewComment: comment };
    if (decision === "reject") next.status = "rejected";
    if (decision === "supplement") next.status = "supplement_required";
    if (decision === "approve") {
      next.status = "approved";
      if (item.kind === "耐力跑免测") {
        const score = Number(form.score);
        if (!Number.isFinite(score) || score < 0 || score > 100) {
          setFormError("通过耐力跑免测时必须设置 0–100 的内部自定义分数（不向学生披露）。");
          return;
        }
        next.score = score;
        setGrades((current) =>
          current.map((grade) =>
            grade.studentId === item.studentId &&
            grade.courseId === item.courseId
              ? {
                  ...grade,
                  enduranceStatus: "Exempt",
                  physicalScore: score,
                }
              : grade,
          ),
        );
      } else {
        const courseOffset = Number(form.courseOffset || 0);
        const otherOffset = Number(form.otherOffset || 0);
        const course = courses.find(
          (candidate) => candidate.id === item.courseId,
        );
        const maximumOffset =
          (course?.courseTarget ?? 0) + (course?.otherTarget ?? 0);
        if (
          courseOffset < 0 ||
          otherOffset < 0 ||
          courseOffset + otherOffset <= 0 ||
          courseOffset + otherOffset > maximumOffset
        ) {
          setFormError(
            `课程运动与其他运动抵扣之和必须大于 0，且不得超过本课程设置的 ${maximumOffset} 小时。`,
          );
          return;
        }
        next.courseOffset = courseOffset;
        next.otherOffset = otherOffset;
      }
    }
    setExemptions((current) =>
      current.map((exemption) =>
        exemption.id === exemptionId ? { ...exemption, ...next } : exemption,
      ),
    );
    notify(
      decision === "approve"
        ? "申请已审核通过并同步成绩/抵扣结果"
        : decision === "reject"
          ? "申请已驳回，学生可补充材料后重新提交"
          : "已要求学生补充材料",
    );
    closeDialog();
  };

  const revokeOffset = (exemptionId: string | number) => {
    setExemptions((current) =>
      current.map((item) =>
        item.id === exemptionId
          ? {
              ...item,
              courseOffset: 0,
              otherOffset: 0,
              reviewComment: "组织成员资格变更，教师手动撤销抵扣。",
            }
          : item,
      ),
    );
    notify("组织认证抵扣已手动撤销，学生需通过正常打卡补足差额");
  };

  const studentIdentity = (
    student: Student,
    quickActions: StudentQuickAction[] = [],
  ) => (
    <StudentIdentity
      student={studentProfileFor(student)}
      courseMetrics={studentCourseMetricsFor(student)}
      quickActions={quickActions}
      nameDisplay="truncate"
    />
  );

  const selectedCourse =
    dialog && "courseId" in dialog
      ? courses.find((course) => course.id === dialog.courseId)
      : undefined;
  const selectedCourseSummary = selectedCourse
    ? getCourseManagementSummary(selectedCourse)
    : undefined;
  const selectedStudent =
    dialog && "studentId" in dialog
      ? students.find((student) => student.id === dialog.studentId)
      : undefined;
  const selectedRecord =
    dialog?.type === "checkin"
      ? records.find((record) => record.id === dialog.recordId)
      : undefined;
  const selectedInvalidRecord =
    dialog?.type === "checkin-invalid"
      ? records.find((record) => record.id === dialog.recordId)
      : undefined;
  const selectedReturnRecord =
    dialog?.type === "checkin-return-proof"
      ? records.find((record) => record.id === dialog.recordId)
      : undefined;
  const selectedCorrectionRecord =
    dialog?.type === "checkin-correct-valid"
      ? records.find((record) => record.id === dialog.recordId)
      : undefined;
  const selectedGrade =
    dialog?.type === "grade"
      ? grades.find((grade) => grade.id === dialog.gradeId)
      : undefined;
  const selectedExemption =
    dialog?.type === "exemption"
      ? exemptions.find((item) => item.id === dialog.exemptionId)
      : undefined;

  const renderCourses = () => {
    const reconciliationCourse = reconciliationCourses.find(
      (course) => course.id === String(reconciliationCourseId),
    );
    if (reconciliationCourse) {
      return (
        <RosterReconciliationPage
          course={reconciliationCourse}
          courses={reconciliationCourses}
          platformMembers={reconciliationMembers}
          onBack={() => setReconciliationCourseId(null)}
          showToast={showToast}
        />
      );
    }
    const filteredCourses =
      courseView === "all"
        ? courses
        : courses.filter((course) => course.status === "ACTIVE");
    const activeStudentCount = students.filter(
      (student) => student.status === "active",
    ).length;
    const newStudentCount = students.filter(
      (student) =>
        student.status === "active" &&
        joinedWithinLast24Hours(student.joinedAt),
    ).length;
    return (
      <CourseOverviewLayout
        summary={
          <PageSummaryMetrics
            ariaLabel="课程管理核心统计"
            items={[
              { label: "课程", value: courses.length },
              { label: "在班学生", value: activeStudentCount },
              {
                label: "近 24 小时加入",
                value: newStudentCount,
                tone: newStudentCount > 0 ? "success" : "default",
              },
            ]}
          />
        }
        tabs={
          <div className="layout-command-row">
            <StatusTabs
              ariaLabel="课程状态"
              value={courseView}
              onChange={setCourseView}
              options={[
                { value: "all", label: "全部", count: courses.length },
                {
                  value: "active",
                  label: "进行中",
                  count: courses.filter((course) => course.status === "ACTIVE")
                    .length,
                },
              ]}
            />
            <button
              className="primary-button page-primary-action"
              type="button"
              onClick={() => openDialog({ type: "course-new" })}
            >
              ＋ 新建课程
            </button>
          </div>
        }
      >
        <div className="course-grid teacher-course-grid">
          {filteredCourses.map((course) => {
            const summary = getCourseManagementSummary(course);
            const qualificationTone =
              summary.studentCount === 0
                ? "empty"
                : summary.unqualifiedStudentCount === 0
                  ? "complete"
                  : "attention";
            return (
              <article
                className="course-card teacher-course-card"
                key={course.id}
              >
                <div className="course-card-top">
                  <div className="course-card-identity">
                    <h3 title={course.name}>{course.name}</h3>
                    <span>{course.semester}</span>
                  </div>
                  <div className="course-card-head-actions">
                    <Badge tone="green">进行中</Badge>
                  </div>
                </div>
                <div
                  className="course-card-metrics"
                  aria-label={`${course.name} 课程概览`}
                >
                  <span>
                    <small>在班学生</small>
                    <b>{summary.studentCount}</b>
                  </span>
                  <span>
                    <small>未达标人数</small>
                    <b
                      className={
                        summary.unqualifiedStudentCount > 0
                          ? "metric-warning"
                          : "metric-complete"
                      }
                    >
                      {summary.unqualifiedStudentCount}
                    </b>
                  </span>
                  <span>
                    <small>近 24 小时加入</small>
                    <b
                      className={
                        summary.newStudentCount > 0 ? "metric-complete" : ""
                      }
                    >
                      {summary.newStudentCount}
                    </b>
                  </span>
                </div>
                <div className={`course-achievement is-${qualificationTone}`}>
                  <div>
                    <span>学生达标情况</span>
                    <b>{`${summary.qualifiedStudentCount} / ${summary.studentCount} 人已达标`}</b>
                  </div>
                  <strong>{`达标率 ${summary.completionRate}%`}</strong>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label={`达标率 ${summary.completionRate}%`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={summary.completionRate}
                  >
                    <i style={{ width: `${summary.completionRate}%` }} />
                  </div>
                </div>
                <div className="course-card-footer">
                  <button
                    className="course-roster-reconciliation-button"
                    type="button"
                    onClick={() => setReconciliationCourseId(course.id)}
                  >
                    <ListChecks size={15} aria-hidden="true" />
                    名单对齐
                  </button>
                  <button
                    className="course-invite-button"
                    type="button"
                    onClick={() =>
                      openDialog({ type: "invite", courseId: course.id })
                    }
                  >
                    <QrCode size={15} aria-hidden="true" />
                    邀请二维码
                  </button>
                  <button
                    className="course-enter-button"
                    type="button"
                    onClick={() =>
                      openDialog(
                        { type: "course-manage", courseId: course.id },
                        {
                          courseTarget: String(course.courseTarget),
                          otherTarget: String(course.otherTarget),
                          windowMode: course.checkinWindow.windowMode,
                          dateRangeStart: course.checkinWindow.dateRangeStart,
                          dateRangeEnd: course.checkinWindow.dateRangeEnd,
                          dailyStartTime: course.checkinWindow.dailyStartTime,
                          dailyEndTime: course.checkinWindow.dailyEndTime,
                          semesterDeadline:
                            course.checkinWindow.semesterDeadline,
                          excludedDates: course.checkinWindow.excludedDates
                            .map((item) => `${item.date}, ${item.reason}`)
                            .join("\n"),
                        },
                      )
                    }
                  >
                    进入课程 <span>→</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {dataLoading && (
          <EmptyState
            title="没有符合条件的课程"
            description="切换课程状态后可查看其他课程。"
          />
        )}
        {!dataLoading && filteredCourses.length === 0 && (
          <EmptyState
            title="没有符合条件的课程"
            description="切换课程状态后可查看其他课程。"
          />
        )}
      </CourseOverviewLayout>
    );
  };

  const renderRoster = () => {
    const rosterOverview = students.map((student) => ({
      student,
      ...getRosterProgress(student),
    }));
    const activeStudents = rosterOverview.filter(
      ({ student }) => student.status === "active",
    );
    const belowTargetCount = activeStudents.filter(
      (item) => item.totalPercent < 100,
    ).length;
    const completedCount = activeStudents.filter(
      (item) => item.totalPercent >= 100,
    ).length;
    const inactiveCount = rosterOverview.length - activeStudents.length;
    const searchTerm = rosterSearch.trim().toLocaleLowerCase();
    const visible = rosterOverview
      .filter((item) => {
        if (rosterView === "needs_attention")
          return item.student.status === "active" && item.totalPercent < 100;
        if (rosterView === "complete")
          return item.student.status === "active" && item.totalPercent >= 100;
        if (rosterView === "inactive") return item.student.status !== "active";
        return true;
      })
      .filter(
        ({ student }) =>
          courseFilter === "all" || student.courseId === courseFilter,
      )
      .filter(
        ({ student }) =>
          !searchTerm ||
          [
            student.name,
            student.number,
            student.email,
            student.gender,
            student.grade,
            joinMethodLabel(student.joinMethod),
          ].some((value) => value.toLocaleLowerCase().includes(searchTerm)),
      )
      .sort((left, right) => {
        if (rosterSort === "name")
          return left.student.name.localeCompare(right.student.name, "zh-CN");
        if (rosterSort === "progress")
          return right.totalPercent - left.totalPercent;
        return left.totalPercent - right.totalPercent;
      });
    return (
      <ManagementTableLayout
        key="roster"
        summary={
          <div className="layout-command-row">
            <PageSummaryMetrics
              ariaLabel="学生管理核心统计"
              items={[
                { label: "学生总数", value: students.length },
                {
                  label: "未达标人数",
                  value: belowTargetCount,
                  tone: belowTargetCount ? "attention" : "default",
                },
              ]}
            />
          </div>
        }
        tabs={
          <StatusFilterTabs
            ariaLabel="学生列表状态筛选"
            value={rosterView}
            onChange={setRosterView}
            options={[
              { value: "all", label: "全部", count: students.length },
              {
                value: "needs_attention",
                label: "待跟进",
                count: belowTargetCount,
              },
              { value: "complete", label: "已达标", count: completedCount },
              { value: "inactive", label: "非在课成员", count: inactiveCount },
            ]}
          />
        }
        toolbar={
          <FilterToolbar>
            <label className="filter-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={rosterSearch}
                onChange={(event) => setRosterSearch(event.target.value)}
                placeholder="搜索姓名、学号或邮箱"
                aria-label="搜索姓名、学号或邮箱"
              />
            </label>
            <AppSelect
              className="filter-select"
              label="课程"
              value={courseFilter}
              options={[
                { value: "all", label: "全部课程" },
                ...teacherCourses.map((course) => ({
                  value: String(course.id),
                  label: courseLabel(course),
                })),
              ]}
              onChange={(nextValue) =>
                nextValue !== null && setCourseFilter(String(nextValue))
              }
            />
            <AppSelect
              className="filter-select"
              label="排序"
              value={rosterSort}
              options={[
                { value: "attention", label: "优先处理" },
                { value: "progress", label: "完成率从高到低" },
                { value: "name", label: "姓名" },
              ]}
              onChange={(nextValue) =>
                nextValue !== null &&
                setRosterSort(nextValue as typeof rosterSort)
              }
            />
          </FilterToolbar>
        }
      >
        <section className="table-surface" aria-label="课程学生名单">
          <div className="table-result-line">
            <span>显示 {visible.length} 名学生</span>
            {rosterView !== "inactive" && belowTargetCount > 0 && (
              <span className="attention-note">
                {belowTargetCount} 人学时尚未达标
              </span>
            )}
          </div>
          <DataTable className="roster-table" minWidth={1240}>
            <thead>
              <tr>
                <th>学生</th>
                <th>课程</th>
                <th>加入信息</th>
                <th>总学时进度</th>
                <th>成员状态</th>
                <th className="action-column">操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(
                ({
                  student,
                  course,
                  courseWaiver,
                  otherWaiver,
                  courseTarget,
                  otherTarget,
                  totalPercent,
                }) => {
                  return (
                    <tr key={student.id}>
                      <td>
                        <div>
                          {studentIdentity(
                            student,
                            student.status === "active"
                              ? [
                                  {
                                    label: "移出课程",
                                    tone: "danger",
                                    onSelect: () =>
                                      openDialog({
                                        type: "student-action",
                                        studentId: student.id,
                                        action: "remove",
                                      }),
                                  },
                                ]
                              : [],
                          )}
                          <small className="table-sub">{`${student.number} · ${student.gender} · ${student.grade}`}</small>
                        </div>
                      </td>
                      <td>
                        <b
                          className="roster-course-name truncate-text"
                          title={courseLabel(course)}
                        >
                          {courseLabel(course)}
                        </b>
                      </td>
                      <td>
                        <b className="table-primary-text">
                          {joinMethodLabel(student.joinMethod)}
                        </b>
                        <small className="table-sub">
                          {businessDateTime(student.joinedAt) || "—"}
                        </small>
                      </td>
                      <td>
                        <ProgressCell
                          value={student.courseHours + student.otherHours}
                          target={courseTarget + otherTarget}
                          percent={totalPercent}
                          detail={
                            mode === "demo"
                              ? `课程运动 ${student.courseHours.toFixed(1)}/${courseTarget.toFixed(1)}h · 其他运动 ${student.otherHours.toFixed(1)}/${otherTarget.toFixed(1)}h${courseWaiver + otherWaiver > 0 ? ` · 已减免 ${(courseWaiver + otherWaiver).toFixed(1)}h` : ""}`
                              : `累计有效运动 ${(student.courseHours + student.otherHours).toFixed(1)}/${(courseTarget + otherTarget).toFixed(1)}h（服务端总量规则）`
                          }
                        />
                      </td>
                      <td>
                        <div className="roster-status">
                          <Badge
                            tone={
                              student.status === "active" ? "green" : "gray"
                            }
                          >
                            {membershipStatusLabel(student.status)}
                          </Badge>
                          <small>
                            {student.status === "active"
                              ? `总完成率 ${totalPercent}%`
                              : "历史只读"}
                          </small>
                        </div>
                      </td>
                      <td className="action-column">
                        <div className="horizontal-actions roster-row-action">
                          {student.status === "active" ? (
                            <button
                              className="row-primary-action danger-link roster-remove-action"
                              type="button"
                              onClick={() =>
                                openDialog({
                                  type: "student-action",
                                  studentId: student.id,
                                  action: "remove",
                                })
                              }
                            >
                              移出课程
                            </button>
                          ) : (
                            <Badge tone="gray">历史只读</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </DataTable>
          {visible.length === 0 && (
            <EmptyState
              title="未找到符合条件的学生"
              description="调整搜索或筛选条件后重试。"
            />
          )}
        </section>
      </ManagementTableLayout>
    );
  };

  const openCheckinDetail = (record: CheckinRecord, proofIndex = 0) => {
    setActiveCheckinProofIndex(
      Math.min(Math.max(proofIndex, 0), Math.max(record.proof.length - 1, 0)),
    );
    setCheckinImageZoom(1);
    setCheckinVideoPlaying(false);
    openDialog({ type: "checkin", recordId: record.id });
  };

  const resolveCheckinMediaId = (record: CheckinRecord, proofIndex: number) => {
    const mediaIds = record.mediaIds ?? [];
    return mediaIds[proofIndex] ?? mediaIds[0] ?? null;
  };

  const openSecureMedia = async (mediaId: string) => {
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      // Signed URLs expire quickly; obtain a fresh authorization for each click.
      const accessUrl = await openTeacherMedia(mediaId);
      if (popup) {
        popup.location.replace(accessUrl);
      } else {
        showToast("浏览器阻止了新窗口，请允许弹窗后再次点击查看凭证。");
      }
    } catch (error) {
      popup?.close();
      showToast(userErrorToast(toUserFacingError(error)));
    }
  };

  const openCheckinMedia = async (record: CheckinRecord, proofIndex = 0) => {
    const mediaId = resolveCheckinMediaId(record, proofIndex);
    if (!mediaId) {
      showToast("该记录未附带照片或视频。");
      return;
    }
    await openSecureMedia(mediaId);
  };

  const downloadCheckinProof = (proof: string) => {
    void (async () => {
      const record =
        selectedRecord ??
        records.find(
          (item) =>
            (item.proof ?? []).includes(proof) ||
            (item.mediaIds ?? []).length > 0,
        );
      if (!record) {
        showToast("该记录未附带照片或视频。");
        return;
      }
      const index = Math.max(0, (record.proof ?? []).indexOf(proof));
      await openCheckinMedia(record, index >= 0 ? index : 0);
    })();
  };

  const renderCheckins = () => {
    if (!selectedCheckinStudent || !selectedCheckinSummary) {
      // Every row carries the server's review result (teacher-data.ts derives
      // auditStatus from currentReview.result), so the queue is read from that
      // single source. Guessing "unreviewed" from a missing comment would be a
      // second state derivation, which current API forbids.
      const invalidQueueRecords = records.filter(
        (record) => record.auditStatus === "invalid",
      );
      const invalidRecords = records.filter(
        (record) => record.auditStatus === "invalid",
      );
      const showingHistory = checkinReviewFilter === "history";
      const visibleRecords = showingHistory
        ? records
        : invalidQueueRecords;
      const involvedStudentIds = new Set(
        records.map((record) => record.studentId),
      );
      const visibleStudentIds = new Set(
        visibleRecords.map((record) => record.studentId),
      );
      const reviewRows = checkinStudentSummaries
        .filter((summary) => visibleStudentIds.has(summary.student.id))
        .map((summary) => {
          const matchingRecords = visibleRecords.filter(
            (record) => record.studentId === summary.student.id,
          );
          const invalidCount = matchingRecords.filter(
            (record) => record.auditStatus === "invalid",
          ).length;
          const latest = [...matchingRecords].sort((left, right) =>
            right.submittedAt.localeCompare(left.submittedAt),
          )[0];
          return {
            ...summary,
            invalidCount,
            visibleRecordCount: matchingRecords.length,
            latest,
          };
        })
        .sort((left, right) =>
          showingHistory
            ? right.latest.submittedAt.localeCompare(left.latest.submittedAt)
            : right.invalidCount - left.invalidCount,
        );
      return (
        <ReviewWorkbenchLayout
          key="checkins"
          summary={
            <div className="layout-command-row">
              <PageSummaryMetrics
                ariaLabel="打卡审核核心统计"
                items={[
                  // Only three tiles render, so the third one shows whatever
                  // actually needs the teacher: records currently marked invalid.
                  { label: "打卡记录", value: records.length },
                  { label: "涉及学生", value: involvedStudentIds.size },
                  {
                    label: "已标记无效",
                    value: invalidRecords.length,
                    tone: invalidRecords.length ? "attention" : "default",
                  },
                ]}
              />
            </div>
          }
          tabs={
            <StatusFilterTabs
              ariaLabel="打卡记录视图筛选"
              value={checkinReviewFilter}
              onChange={setCheckinReviewFilter}
              options={[
                {
                  value: "all",
                  label: "无效记录",
                  count: invalidQueueRecords.length,
                },
                {
                  value: "history",
                  label: "全部记录",
                  count: records.length,
                },
              ]}
            />
          }
          toolbar={
            <div className="compact-guidance">
              <span aria-hidden="true">i</span>
              <p>
                新提交按 Contract 应为待 AI 初审，现网旧接口仍可能默认有效。退回补证会调用新审核协议；服务未就绪时显示错误，不在本地假装已退回。
              </p>
            </div>
          }
        >
          <section className="table-surface" aria-label="打卡审核列表">
            <div className="table-result-line">
              {/* Keep the sentence a single text node: the locale walker
                  translates per node, so a spliced sentence never matches the
                  whole-sentence English rules. */}
              <span>
                {showingHistory
                  ? `显示 ${visibleRecords.length} 条记录`
                  : `显示 ${visibleRecords.length} 条无效记录`}
              </span>
              <span>涉及 {reviewRows.length} 名学生</span>
            </div>
            <DataTable className="checkin-student-table" minWidth={680}>
              <thead>
                <tr>
                  <th>学生</th>
                  <th>{showingHistory ? "记录" : "无效记录"}</th>
                  <th>剩余学时</th>
                  <th className="action-column">操作</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.map(
                  ({
                    student,
                    remainingHours,
                    invalidCount,
                    visibleRecordCount,
                  }) => {
                    return (
                      <tr key={student.id}>
                        <td>
                          {studentIdentity(student, [
                            {
                              label: "查看打卡记录",
                              tone: "primary",
                              onSelect: () =>
                                openCheckinStudentRecords(student.id),
                            },
                          ])}
                        </td>
                        <td>
                          <b
                            className={
                              showingHistory || invalidCount > 0
                                ? "invalid-count"
                                : "muted-number"
                            }
                          >
                            {showingHistory ? visibleRecordCount : invalidCount}
                          </b>
                          <small className="table-sub">
                            {showingHistory
                              ? "条已提交记录"
                              : invalidCount > 0
                                ? "条待处理"
                                : "暂无待办"}
                          </small>
                        </td>
                        <td>
                          <b
                            className={
                              remainingHours > 0
                                ? "hours-remaining"
                                : "hours-complete"
                            }
                          >
                            {remainingHours.toFixed(1)}h
                          </b>
                          <small className="table-sub">
                            {remainingHours > 0 ? "尚待完成" : "已达标"}
                          </small>
                        </td>
                        <td className="action-column">
                          <button
                            className="row-review-action"
                            type="button"
                            onClick={() =>
                              openCheckinStudentRecords(student.id)
                            }
                          >
                            查看记录 <span>→</span>
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </DataTable>
            {reviewRows.length === 0 && (
              <EmptyState
                title={
                  showingHistory ? "暂无打卡记录" : "当前筛选没有无效记录"
                }
                description={
                  showingHistory
                    ? "学生提交后的记录会保留在此处。"
                    : "切换到全部记录可回看已处理内容。"
                }
              />
            )}
          </section>
        </ReviewWorkbenchLayout>
      );
    }

    const auditFilterOptions: {
      value: CheckinAuditFilter;
      label: string;
      count: number;
    }[] = [
      { value: "all", label: "全部", count: selectedStudentCheckins.length },
      {
        value: "valid",
        label: "有效",
        count: selectedCheckinAuditSummary.validCount,
      },
      {
        value: "invalid",
        label: "无效",
        count: selectedCheckinAuditSummary.invalidCount,
      },
    ];
    return (
      <>
        <div className="checkin-detail-top">
          <button
            className="text-button back-to-checkin-list"
            type="button"
            onClick={() => setCheckinStudentId(null)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            返回学生名单
          </button>
          <div className="checkin-student-summary">
            <div>{studentIdentity(selectedCheckinStudent)}</div>
            <div className="checkin-summary-metrics">
              <span>
                <small>打卡记录</small>
                <b>{`${selectedStudentCheckins.length} 条`}</b>
              </span>
              <span>
                <small>已处理进度</small>
                <b>
                  {selectedCheckinAuditSummary.validCount +
                    selectedCheckinAuditSummary.invalidCount}{" "}
                  / {selectedStudentCheckins.length}
                </b>
              </span>
            </div>
          </div>
        </div>
        <div className="panel checkin-detail-panel">
          <div className="panel-head teacher-panel-head checkin-record-panel-head">
            <div>
              <h2>{selectedCheckinStudent.name}的全部打卡记录</h2>
              {/* Single text node so the whole-sentence English rule (with
                  its singular/plural handling) can match. */}
              <p>
                {`共 ${selectedStudentCheckins.length} 条记录；审核结果已保存到后端，页面切换或刷新后会重新读取最新状态。`}
              </p>
            </div>
            <div className="checkin-detail-toolbar">
              <div
                className="segmented checkin-audit-filter"
                role="tablist"
                aria-label="审核状态筛选"
              >
                {auditFilterOptions.map((option) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={checkinAuditFilter === option.value}
                    className={
                      checkinAuditFilter === option.value ? "selected" : ""
                    }
                    key={option.value}
                    onClick={() => setCheckinAuditFilter(option.value)}
                  >
                    {option.label}
                    <b>{option.count}</b>
                  </button>
                ))}
              </div>
              <div className="segmented" aria-label="打卡记录展示方式">
                <button
                  type="button"
                  className={checkinDetailView === "list" ? "selected" : ""}
                  onClick={() => setCheckinDetailView("list")}
                >
                  列表
                </button>
                <button
                  type="button"
                  className={checkinDetailView === "album" ? "selected" : ""}
                  onClick={() => setCheckinDetailView("album")}
                >
                  相册
                </button>
              </div>
            </div>
          </div>

          <CheckinAuditSummary
            summary={selectedCheckinAuditSummary}
            requiredMinutes={selectedCheckinRequiredMinutes}
          />

          {selectedStudentCheckins.length === 0 ? (
            <EmptyState
              title="该学生尚无打卡记录"
              description="学生提交的运动凭证会按日期出现在此处。"
            />
          ) : visibleSelectedStudentCheckins.length === 0 ? (
            <EmptyState
              title="当前筛选暂无记录"
              description="切换审核状态筛选可查看其他打卡记录。"
            />
          ) : checkinDetailView === "list" ? (
            <div
              className="checkin-record-list"
              aria-label={`${selectedCheckinStudent.name}的打卡记录列表`}
            >
              <div className="checkin-record-list-head" aria-hidden="true">
                <span>打卡时间</span>
                <span>运动凭证</span>
                <span>运动信息</span>
                <span>审核操作</span>
              </div>
              {visibleSelectedStudentCheckins.map((record) => (
                <article
                  id={`checkin-record-${record.id}`}
                  className={`checkin-record-row is-${record.auditStatus}`}
                  key={record.id}
                >
                  <div className="checkin-record-time">
                    <span>运动日期</span>
                    <b>{checkinDateLabel(record)}</b>
                    <div className="checkin-record-time-range">
                      <span>
                        <small>开始</small>
                        <b>{record.startAt.slice(11, 16) || "—"}</b>
                      </span>
                      <i aria-hidden="true">→</i>
                      <span>
                        <small>结束</small>
                        <b>{record.endAt.slice(11, 16) || "—"}</b>
                      </span>
                    </div>
                  </div>
                  <div className="record-proof-links">
                    {record.proof.length ? (
                      record.proof.map((proof, index) => (
                        <button
                          type="button"
                          key={proof}
                          title={proof}
                          onClick={() => {
                            if (mode !== "demo")
                              void openCheckinMedia(record, index);
                            openCheckinDetail(record, index);
                          }}
                        >
                          <span>{isVideoMaterial(proof) ? "▶" : "图"}</span>
                          <span className="record-proof-copy">
                            <b>{proofMaterialLabel(proof)}</b>
                            <small>凭证 {index + 1}</small>
                          </span>
                        </button>
                      ))
                    ) : (
                      <span className="confidence-empty">无凭证</span>
                    )}
                  </div>
                  <div className="checkin-record-info">
                    <div className="checkin-record-activity-head">
                      <b>{record.sport}</b>
                      <span>{record.creditType}</span>
                    </div>
                    <div className="checkin-record-metrics">
                      <span>
                        <small>实际运动</small>
                        <b>{actualDurationLabel(record)}</b>
                      </span>
                      <span className="is-primary">
                        <small>可计入时长</small>
                        <b>
                          {singleRecordCreditedDurationLabel(
                            record.creditedMinutes,
                          )}
                        </b>
                      </span>
                    </div>
                    <small className="checkin-record-submitted">
                      提交时间 {businessDateTime(record.submittedAt) || "—"}
                    </small>
                    <button
                      className="checkin-description"
                      type="button"
                      onClick={() => openCheckinDetail(record)}
                    >
                      {record.description}
                      <span>查看详情 →</span>
                    </button>
                  </div>
                  <AuditStatusSelector
                    record={record}
                    onSelect={selectRecordAuditStatus}
                    onReturn={openReturnForProof}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div
              className="checkin-album"
              aria-label={`${selectedCheckinStudent.name}的打卡凭证相册`}
            >
              {selectedCheckinAlbums.map((group) => (
                <section key={group.month} className="checkin-album-month">
                  <h3>{group.month}</h3>
                  {group.records.map((record) => (
                    <article
                      id={`checkin-record-${record.id}`}
                      className={`checkin-album-record is-${record.auditStatus}`}
                      key={record.id}
                    >
                      <div className="checkin-album-date">
                        <b>{checkinDayLabel(record)}</b>
                        <small>{record.startAt.slice(11, 16)}</small>
                      </div>
                      <div className="checkin-album-content">
                        <div className="proof-cluster">
                          {record.proof.length ? (
                            record.proof.map((proof, index) => (
                              <button
                                type="button"
                                className={`proof-thumbnail proof-thumbnail-${(record.id.length + index) % 5}`}
                                key={proof}
                                title={`查看 ${proof}`}
                                onClick={() => {
                                  if (mode !== "demo")
                                    void openCheckinMedia(record, index);
                                  openCheckinDetail(record, index);
                                }}
                              >
                                <span>
                                  {isVideoMaterial(proof) ? "▶" : "图"}
                                </span>
                                <small>
                                  {proofMaterialLabel(proof)} {" · "}凭证{" "}
                                  {index + 1}
                                </small>
                              </button>
                            ))
                          ) : (
                            <button
                              type="button"
                              className="proof-thumbnail proof-thumbnail-empty"
                              onClick={() => openCheckinDetail(record)}
                            >
                              <span>—</span>
                              <small>无凭证</small>
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          className="album-record-summary"
                          onClick={() => openCheckinDetail(record)}
                        >
                          <span className="album-record-summary-head">
                            <b>{record.sport}</b>
                            <small>{record.creditType}</small>
                          </span>
                          <span className="album-record-metrics">
                            <span>
                              <small>实际运动</small>
                              <b>{actualDurationLabel(record)}</b>
                            </span>
                            <span className="is-primary">
                              <small>可计入时长</small>
                              <b>
                                {singleRecordCreditedDurationLabel(
                                  record.creditedMinutes,
                                )}
                              </b>
                            </span>
                          </span>
                          <small className="album-record-submitted">
                            提交时间 {businessDateTime(record.submittedAt) || "—"}
                          </small>
                          <span className="album-record-detail-link">
                            查看完整记录 →
                          </span>
                        </button>
                      </div>
                      <AuditStatusSelector
                        record={record}
                        onSelect={selectRecordAuditStatus}
                        onReturn={openReturnForProof}
                      />
                    </article>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderGrades = () => {
    const courseGrades = grades.filter(
      (grade) => grade.courseId === gradeCourseId,
    );
    const published =
      courseGrades.length > 0 && courseGrades.every((grade) => grade.published);
    if (mode !== "demo") {
      const generatedGrades = courseGrades.filter(
        (grade) => !grade.id.startsWith("pending:") && grade.scoreStatus,
      );
      const missingGrades = courseGrades.filter((grade) =>
        grade.id.startsWith("pending:"),
      );
      const publishedGrades = generatedGrades.filter(
        (grade) => grade.published,
      );
      const visibleServerGrades = courseGrades.filter((grade) => {
        if (gradeView === "recorded") return !grade.id.startsWith("pending:");
        if (gradeView === "pending") return grade.id.startsWith("pending:");
        if (gradeView === "exception") return grade.published;
        return true;
      });
      const publishableCount = generatedGrades.filter(
        (grade) => !grade.published,
      ).length;
      return (
        <ManagementTableLayout
          summary={
            <div className="layout-command-row grade-command-row">
              <AppSelect
                className="course-context-select"
                label="当前课程"
                value={gradeCourseId}
                options={teacherCourses.map((course) => ({
                  value: course.id,
                  label: courseLabel(course),
                }))}
                onChange={(nextValue) =>
                  nextValue !== null && setGradeCourseId(String(nextValue))
                }
              />
              <button
                className="primary-button page-primary-action"
                type="button"
                disabled={publishableCount === 0}
                onClick={() =>
                  openDialog({ type: "publish-grades", courseId: gradeCourseId })
                }
              >
                {published ? "成绩已发布" : `发布成绩（${publishableCount}）`}
              </button>
            </div>
          }
          tabs={
            <div className="grade-data-controls">
              <StatusTabs
                ariaLabel="服务端成绩状态"
                value={gradeView}
                onChange={setGradeView}
                options={[
                  { value: "all", label: "全部", count: courseGrades.length },
                  {
                    value: "recorded",
                    label: "已生成",
                    count: generatedGrades.length,
                  },
                  {
                    value: "pending",
                    label: "未生成",
                    count: missingGrades.length,
                  },
                  {
                    value: "exception",
                    label: "已发布",
                    count: publishedGrades.length,
                  },
                ]}
              />
              <p className="admin-planned-banner">
                本页只显示后端 StudentScore 投影；导出 API 当前为默认拒绝，因此不提供本地拼接 CSV。
              </p>
              <button
                className="secondary-button"
                type="button"
                disabled
                title="当前接口不能把换算分发给学生，发布仍只形成内部成绩版本。"
              >
                向学生披露换算分、等级或排名
              </button>
              <p className="record-audit-hint">当前接口不能把换算分发给学生，发布仍只形成内部成绩版本。</p>
            </div>
          }
        >
          <section className="table-surface" aria-label="服务端成绩册">
            <DataTable className="grade-table" minWidth={1220}>
              <thead>
                <tr>
                  <th>学生</th>
                  <th>达标状态</th>
                  <th>课程相关有效时长</th>
                  <th>其他有效时长</th>
                  <th>总有效时长</th>
                  <th>最终分数</th>
                  <th>成绩状态</th>
                  <th className="action-column">操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleServerGrades.map((grade) => {
                  const student = students.find(
                    (item) => item.id === grade.studentId,
                  );
                  const generated = !grade.id.startsWith("pending:");
                  return (
                    <tr key={grade.id} className={!generated ? "is-pending-grade" : ""}>
                      <td>{student ? studentIdentity(student) : "后端学生资料不可用"}</td>
                      <td>
                        <Badge tone={grade.qualificationStatus === "QUALIFIED" ? "green" : generated ? "orange" : "gray"}>
                          {qualificationStatusLabel(grade.qualificationStatus)}
                        </Badge>
                      </td>
                      <td className="tabular-number">
                        {durationHoursLabel(grade.validCourseDurationSeconds)}
                      </td>
                      <td className="tabular-number">
                        {durationHoursLabel(grade.validGeneralDurationSeconds)}
                      </td>
                      <td className="tabular-number">
                        {durationHoursLabel(grade.totalValidDurationSeconds)}
                      </td>
                      <td className="tabular-number">
                        {grade.physicalScore ?? "—"}
                      </td>
                      <td>
                        <Badge tone={grade.published ? "green" : generated ? "blue" : "gray"}>
                          {scoreStatusLabel(grade.scoreStatus)}
                        </Badge>
                      </td>
                      <td className="action-column">
                        <button
                          className="row-review-action"
                          type="button"
                          disabled={!generated}
                          onClick={() =>
                            generated &&
                            openDialog({ type: "grade", gradeId: grade.id })
                          }
                        >
                          {generated ? "查看 / 重新计算" : "等待后端生成"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
            {!dataLoading && visibleServerGrades.length === 0 && (
              <EmptyState
                title="当前筛选没有成绩投影"
                description="切换状态，或等待服务端成绩任务生成后再刷新。"
              />
            )}
          </section>
        </ManagementTableLayout>
      );
    }
    const pendingCount = courseGrades.filter(
      (grade) => grade.enduranceStatus === "NotRecorded",
    ).length;
    const absentCount = courseGrades.filter(
      (grade) => grade.enduranceStatus === "Absent",
    ).length;
    const recordedCount = courseGrades.filter(
      (grade) =>
        grade.enduranceStatus === "Recorded" ||
        grade.enduranceStatus === "Exempt",
    ).length;
    const visibleGrades = courseGrades.filter((grade) => {
      if (gradeView === "pending")
        return grade.enduranceStatus === "NotRecorded";
      if (gradeView === "exception") return grade.enduranceStatus === "Absent";
      if (gradeView === "recorded")
        return (
          grade.enduranceStatus === "Recorded" ||
          grade.enduranceStatus === "Exempt"
        );
      return true;
    });
    const gradeStatusLabel = (grade: Grade) =>
      statusLabel(grade.enduranceStatus, "grade");
    return (
      <ManagementTableLayout
        summary={
          <div className="layout-command-row grade-command-row">
            <AppSelect
              className="course-context-select"
              label="当前课程"
              value={gradeCourseId}
              options={teacherCourses.map((course) => ({
                value: course.id,
                label: courseLabel(course),
              }))}
              onChange={(nextValue) =>
                nextValue !== null && setGradeCourseId(String(nextValue))
              }
            />
            <button
              className="primary-button page-primary-action"
              type="button"
              onClick={() =>
                openDialog({ type: "publish-grades", courseId: gradeCourseId })
              }
            >
              {published ? "成绩已发布" : "发布成绩"}
            </button>
          </div>
        }
        tabs={
          <div className="grade-data-controls">
            <StatusTabs
              ariaLabel="成绩状态"
              value={gradeView}
              onChange={setGradeView}
              options={[
                { value: "all", label: "全部", count: courseGrades.length },
                { value: "recorded", label: "已录入", count: recordedCount },
                { value: "pending", label: "待录入", count: pendingCount },
                { value: "exception", label: "缺考", count: absentCount },
              ]}
            />
            <button
              className="secondary-button"
              type="button"
              disabled
              title="当前接口不能把换算分发给学生，发布仍只形成内部成绩版本。"
            >
              向学生披露换算分、等级或排名
            </button>
            <p className="record-audit-hint">当前接口不能把换算分发给学生，发布仍只形成内部成绩版本。</p>
          </div>
        }
      >
        <section className="table-surface" aria-label="成绩册">
          <DataTable className="grade-table grade-table-legacy" minWidth={680}>
            <thead>
              <tr>
                <th>学生</th>
                <th>耐力跑状态</th>
                <th>耐力跑成绩</th>
                <th className="action-column">操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleGrades.map((grade) => {
                const student = students.find(
                  (item) => item.id === grade.studentId,
                );
                const pending = grade.enduranceStatus === "NotRecorded";
                const statusTone = pending
                  ? "orange"
                  : grade.enduranceStatus === "Exempt"
                    ? "gray"
                    : grade.enduranceStatus === "Absent"
                      ? "red"
                      : "green";
                return (
                  <tr
                    className={pending ? "is-pending-grade" : ""}
                    key={grade.id}
                  >
                    <td>
                      {student &&
                        studentIdentity(student, [
                          {
                            label: pending
                              ? "录入成绩"
                              : grade.published
                                ? "编辑成绩"
                                : "查看 / 编辑成绩",
                            tone: pending ? "primary" : "default",
                            onSelect: () =>
                              openDialog(
                                { type: "grade", gradeId: grade.id },
                                {
                                  enduranceStatus: grade.enduranceStatus,
                                  minutes: String(grade.minutes ?? ""),
                                  seconds: String(grade.seconds ?? ""),
                                },
                              ),
                          },
                        ])}
                    </td>
                    <td>
                      <Badge tone={statusTone}>{gradeStatusLabel(grade)}</Badge>
                    </td>
                    <td>
                      <b className="tabular-number">
                        {enduranceScoreLabel(grade)}
                      </b>
                    </td>
                    <td className="action-column">
                      <button
                        className={
                          pending ? "row-primary-action" : "row-review-action"
                        }
                        type="button"
                        onClick={() =>
                          openDialog(
                            { type: "grade", gradeId: grade.id },
                            {
                              enduranceStatus: grade.enduranceStatus,
                              minutes: String(grade.minutes ?? ""),
                              seconds: String(grade.seconds ?? ""),
                            },
                          )
                        }
                      >
                        {pending
                          ? "录入成绩"
                          : grade.published
                            ? "编辑"
                            : "查看 / 编辑"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
          {!dataLoading && visibleGrades.length === 0 && (
            <EmptyState
              title="当前状态没有成绩记录"
              description="切换成绩状态查看其他学生。"
            />
          )}
        </section>
      </ManagementTableLayout>
    );
  };

  const renderExemptions = () => {
    const searchTerm = exemptionSearch.trim().toLocaleLowerCase();
    const statusCount = (status: ExemptionStatus) =>
      exemptions.filter((item) => item.status === status).length;
    const visible = exemptions.filter((item) => {
      const student = students.find(
        (candidate) => candidate.id === item.studentId,
      );
      return (
        (exemptionFilter === "all" || item.status === exemptionFilter) &&
        (exemptionKind === "all" || item.kind === exemptionKind) &&
        (courseFilter === "all" || item.courseId === courseFilter) &&
        (!searchTerm ||
          [
            student?.name ?? "",
            student?.number ?? "",
            item.reason,
            item.organization ?? "",
          ].some((value) => value.toLocaleLowerCase().includes(searchTerm)))
      );
    });
    return (
      <ReviewWorkbenchLayout
        key="exemptions"
        summary={
          <PageSummaryMetrics
            ariaLabel="免测与组织认证核心统计"
            items={[
              {
                label: statusLabel("pending", "exemption"),
                value: statusCount("pending"),
              },
              {
                label: statusLabel("supplement_required", "exemption"),
                value: statusCount("supplement_required"),
                tone: statusCount("supplement_required")
                  ? "attention"
                  : "default",
              },
            ]}
          />
        }
        tabs={
          <StatusFilterTabs
            ariaLabel="认证申请状态筛选"
            value={exemptionFilter}
            onChange={setExemptionFilter}
            options={[
              { value: "all", label: "全部申请", count: exemptions.length },
              {
                value: "pending",
                label: statusLabel("pending", "exemption"),
                count: statusCount("pending"),
              },
              {
                value: "supplement_required",
                label: statusLabel("supplement_required", "exemption"),
                count: statusCount("supplement_required"),
              },
              {
                value: "approved",
                label: statusLabel("approved", "exemption"),
                count: statusCount("approved"),
              },
              {
                value: "rejected",
                label: statusLabel("rejected", "exemption"),
                count: statusCount("rejected"),
              },
            ]}
          />
        }
        toolbar={
          <FilterToolbar ariaLabel="认证申请筛选工具栏">
            <label className="filter-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={exemptionSearch}
                onChange={(event) => setExemptionSearch(event.target.value)}
                placeholder="搜索学生、学号或申请说明"
                aria-label="搜索认证申请"
              />
            </label>
            <AppSelect
              className="filter-select"
              label="申请类型"
              value={exemptionKind}
              options={[
                { value: "all", label: "全部类型" },
                { value: "耐力跑免测", label: "耐力跑免测" },
                { value: "校队认证", label: "校队认证" },
                { value: "社团认证", label: "社团认证" },
              ]}
              onChange={(nextValue) =>
                nextValue !== null &&
                setExemptionKind(nextValue as typeof exemptionKind)
              }
            />
            <AppSelect
              className="filter-select"
              label="课程"
              value={courseFilter}
              options={[
                { value: "all", label: "全部课程" },
                ...teacherCourses.map((course) => ({
                  value: String(course.id),
                  label: courseLabel(course),
                })),
              ]}
              onChange={(nextValue) =>
                nextValue !== null && setCourseFilter(String(nextValue))
              }
            />
          </FilterToolbar>
        }
      >
        <section className="table-surface" aria-label="免测与组织认证申请列表">
          <div className="table-result-line">
            <span>显示 {visible.length} 条申请</span>
            <span>共 {exemptions.length} 条申请</span>
          </div>
          <aside className="grade-publication-notice">
            内部自定义分与抵扣上限仍跟现有接口；换算分不向学生披露。
          </aside>
          <p>
            <button className="secondary-button" type="button" disabled title="当前接口不能向学生披露内部自定义分。">
              向学生披露内部自定义分
            </button>
          </p>
          <DataTable className="exemption-table" minWidth={980}>
            <thead>
              <tr>
                <th>学生</th>
                <th>申请类型</th>
                <th>申请说明</th>
                <th>材料</th>
                <th>提交时间</th>
                <th className="action-column">操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const student = students.find(
                  (candidate) => candidate.id === item.studentId,
                );
                return (
                  <tr key={item.id}>
                    <td>
                      {student &&
                        studentIdentity(student, [
                          {
                            label:
                              item.status === "pending"
                                ? "开始审核"
                                : "查看审核详情",
                            tone:
                              item.status === "pending" ? "primary" : "default",
                            onSelect: () =>
                              openDialog(
                                { type: "exemption", exemptionId: item.id },
                                {
                                  decision:
                                    item.status === "pending"
                                      ? "approve"
                                      : "supplement",
                                },
                              ),
                          },
                        ])}
                    </td>
                    <td>
                      <Badge
                        tone={item.kind === "耐力跑免测" ? "orange" : "blue"}
                      >
                        {item.kind}
                      </Badge>
                    </td>
                    <td>
                      <b
                        className="truncate-text application-reason"
                        title={item.reason}
                      >
                        {item.organization ?? item.reason}
                      </b>
                      {item.organization && (
                        <small
                          className="table-sub truncate-text"
                          title={item.reason}
                        >
                          {item.reason}
                        </small>
                      )}
                    </td>
                    <td>
                      <div
                        className="material-stack"
                        aria-label={`${item.material.length} 份材料`}
                      >
                        {item.material.slice(0, 2).map((file, index) => (
                          <button
                            className={`material-thumb material-thumb-${index + 1}`}
                            title={`预览 ${file}`}
                            type="button"
                            key={file}
                            onClick={() =>
                              openMaterialPreview(
                                file,
                                student?.name ?? "该学生",
                              )
                            }
                          >
                            <span>{materialTypeLabel(file)}</span>
                          </button>
                        ))}
                        {item.material.length > 2 && (
                          <span className="material-more">
                            +{item.material.length - 2}
                          </span>
                        )}
                        <small>{item.material.length} 份</small>
                      </div>
                    </td>
                    <td>
                      <b className="tabular-number">{item.submittedAt}</b>
                    </td>
                    <td className="action-column">
                      {item.status === "approved" &&
                      item.kind !== "耐力跑免测" &&
                      (item.courseOffset || item.otherOffset) ? (
                        <TableActionMenu label="更多">
                          <TableActionMenuItem
                            icon={<Eye />}
                            onClick={() =>
                              openDialog(
                                { type: "exemption", exemptionId: item.id },
                                { decision: "supplement" },
                              )
                            }
                          >
                            查看详情
                          </TableActionMenuItem>
                          {mode === "demo" && (
                            <TableActionMenuItem
                              icon={<Undo2 />}
                              tone="danger"
                              dividerBefore
                              onClick={() => revokeOffset(item.id)}
                            >
                              撤销抵扣
                            </TableActionMenuItem>
                          )}
                        </TableActionMenu>
                      ) : (
                        <button
                          className="row-primary-action"
                          type="button"
                          onClick={() =>
                            openDialog(
                              { type: "exemption", exemptionId: item.id },
                              {
                                decision:
                                  item.status === "pending"
                                    ? "approve"
                                    : "supplement",
                              },
                            )
                          }
                        >
                          {item.status === "pending" ? "开始审核" : "重新处理"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
          {visible.length === 0 && (
            <EmptyState
              title="当前分类没有申请"
              description="新的申请或学生补充材料后会自动出现在对应列表。"
            />
          )}
        </section>
      </ReviewWorkbenchLayout>
    );
  };

  const renderPage = (pageKey: string) =>
    pageKey === "courses"
      ? renderCourses()
      : pageKey === "roster"
        ? renderRoster()
        : pageKey === "checkins"
          ? renderCheckins()
          : pageKey === "grades"
            ? renderGrades()
            : pageKey === "exemptions"
              ? renderExemptions()
              : renderCourses();

  return (
    <>
      {dataError && (
        <section className="teacher-api-error">
          <CircleAlert size={22} aria-hidden="true" />
          <ErrorPanel error={dataError} />
          <button
            className="secondary-button"
            type="button"
            onClick={() => void refreshTeacherData()}
          >
            重试
          </button>
        </section>
      )}
      <TabPageTransition
        activeKey={active}
        direction={direction}
        renderPage={renderPage}
      />

      {dialog?.type === "course-new" && (
        <Dialog
          title="新建课程"
          description="教师可以在当前学期自定义课程名称，创建后自动成为责任教师。"
          close={closeDialog}
          footer={
            <>
              <button
                className="secondary-button"
                type="button"
                onClick={closeDialog}
              >
                取消
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void addCourse()}
              >
                创建课程
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="学期">
              <input
                value={semesterDisplayName(currentSemester, "后端当前学期不可用")}
                disabled
              />
            </Field>
            <Field label="课程名称" required error={userFacingFieldError(formError, "displayName")}>
              <input
                value={form.name ?? ""}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="如 大学体育（一）"
              />
            </Field>
          </div>
          <FormError message={formError} />
        </Dialog>
      )}

      {dialog?.type === "course-manage" && selectedCourse && (
        <Dialog
          wide
          className="course-target-dialog"
          eyebrow=""
          title="课程设置"
          headerContent={
            <div className="course-target-identity">
              <span>当前课程</span>
              <strong>{selectedCourse.name}</strong>
              <small>{selectedCourse.semester}</small>
            </div>
          }
          description={
            <>
              <span>调整当前课程的学时目标和打卡时间窗。</span>
              <span>保存后仅影响本课程，不影响其他课程。</span>
            </>
          }
          close={closeDialog}
          footer={
            <>
              <button
                className="secondary-button course-target-cancel"
                type="button"
                onClick={closeDialog}
              >
                取消
              </button>
              <button
                className="primary-button course-target-save"
                type="button"
                onClick={() => void saveCourseSettings(selectedCourse.id)}
              >
                保存设置
              </button>
            </>
          }
        >
          <section
            className="course-target-section"
            aria-labelledby="course-target-overview-title"
          >
            <div className="course-target-section-head">
              <div>
                <h3 id="course-target-overview-title">课程概览</h3>
                <p>快速确认当前课程状态与已保存目标。</p>
              </div>
            </div>
            <div className="course-target-stat-grid" aria-label="课程目标概览">
              <CourseTargetStatCard
                icon="人"
                label="在班学生"
                value={selectedCourseSummary?.studentCount ?? 0}
              />
              <CourseTargetStatCard
                icon="◎"
                label="无效记录"
                value={selectedCourseSummary?.pendingAuditRecordCount ?? 0}
                tone="orange"
              />
              <CourseTargetStatCard
                icon="◉"
                label="当前目标"
                value={`${selectedCourse.courseTarget + selectedCourse.otherTarget}h`}
                tone="green"
              />
              <CourseTargetStatCard
                icon="▦"
                label="当前学期"
                value={selectedCourse.semester}
                tone="gray"
                compact
              />
            </div>
          </section>

          <div className="course-target-divider" role="separator" />

          <section
            className="course-target-section course-target-config"
            aria-labelledby="course-target-config-title"
          >
            <div className="course-target-section-head">
              <div>
                <h3 id="course-target-config-title">成绩规则</h3>
                <p>
                  {mode === "demo"
                    ? "演示模式可调整两类展示目标。"
                    : "服务端采用 TOTAL_ONLY 规则，不设置课程/自主运动分类配额。"}
                </p>
              </div>
            </div>
            <aside className="grade-publication-notice">
              v8.0 总目标为 1,200 分钟，门槛与周频次由已发布模板锁定。当前接口仍按累计有效运动 20 小时 TOTAL_ONLY 裁决；本页不能改公式，也不能把目标改成 30/45/60 分钟门槛。
            </aside>
            <div className="course-target-setting-list">
              <div className="course-target-setting">
                <label htmlFor="course-published-template">选择已发布模板</label>
                <select id="course-published-template" disabled aria-describedby="course-published-template-help">
                  <option>发布后参数锁定，不能改模板</option>
                </select>
                <p id="course-published-template-help">已发布课程的门槛与周频次锁定。创建课程前请在管理端发布模板并用 createCourse.sportTemplateId。</p>
              </div>
              <div className="course-target-setting">
                <label htmlFor="course-v8-total-minutes">v8.0 总目标</label>
                <div className="course-target-unit-input">
                  <input id="course-v8-total-minutes" type="number" value="1200" disabled aria-describedby="course-v8-total-help" />
                  <span>分钟</span>
                </div>
                <p id="course-v8-total-help">仅作对照显示；服务端仍按 20 小时 TOTAL_ONLY 裁决。</p>
              </div>
            </div>
            {mode === "demo" ? (
              <div className="course-target-setting-list">
              <div className="course-target-setting">
                <label htmlFor="course-target-course-hours">
                  课程相关运动最低学时
                </label>
                <div className="course-target-unit-input">
                  <input
                    id="course-target-course-hours"
                    type="number"
                    min="0"
                    value={form.courseTarget ?? selectedCourse.courseTarget}
                    onChange={(event) =>
                      updateForm("courseTarget", event.target.value)
                    }
                    aria-describedby="course-target-course-help"
                  />
                  <span>小时</span>
                </div>
                <p id="course-target-course-help">{`学生至少需要完成 ${form.courseTarget ?? selectedCourse.courseTarget} 小时课程相关运动。`}</p>
              </div>
              <div className="course-target-setting">
                <label htmlFor="course-target-other-hours">
                  自主运动最低学时
                </label>
                <div className="course-target-unit-input">
                  <input
                    id="course-target-other-hours"
                    type="number"
                    min="0"
                    value={form.otherTarget ?? selectedCourse.otherTarget}
                    onChange={(event) =>
                      updateForm("otherTarget", event.target.value)
                    }
                    aria-describedby="course-target-other-help"
                  />
                  <span>小时</span>
                </div>
                <p id="course-target-other-help">{`学生至少需要完成 ${form.otherTarget ?? selectedCourse.otherTarget} 小时自主运动。`}</p>
              </div>
              </div>
            ) : null}
            <FormError message={formError} />
          </section>

          <div className="course-target-divider" role="separator" />

          <section
            className="course-target-section course-target-config"
            aria-labelledby="course-window-config-title"
          >
            <div className="course-target-section-head">
              <div>
                <h3 id="course-window-config-title">打卡时间窗</h3>
                <p>
                  由本课程责任教师设置；学生仅能在本课程规定的时间窗内提交打卡。
                </p>
              </div>
            </div>
            <div className="form-grid two-columns">
              <AppSelect
                label="打卡状态"
                value={
                  form.windowMode ?? selectedCourse.checkinWindow.windowMode
                }
                options={[
                  { value: "available", label: "允许打卡" },
                  { value: "unavailable", label: "暂停全部打卡" },
                ]}
                onChange={(value) =>
                  updateForm("windowMode", String(value ?? "available"))
                }
              />
              <Field
                label="学期截止日期"
                required
                hint="此日期后不能开始或补交新的打卡记录。"
              >
                <input
                  type="date"
                  value={
                    form.semesterDeadline ??
                    selectedCourse.checkinWindow.semesterDeadline
                  }
                  onChange={(event) =>
                    updateForm("semesterDeadline", event.target.value)
                  }
                />
              </Field>
              <Field label="打卡开始日期" required>
                <input
                  type="date"
                  value={
                    form.dateRangeStart ??
                    selectedCourse.checkinWindow.dateRangeStart
                  }
                  onChange={(event) =>
                    updateForm("dateRangeStart", event.target.value)
                  }
                />
              </Field>
              <Field label="打卡结束日期" required>
                <input
                  type="date"
                  value={
                    form.dateRangeEnd ??
                    selectedCourse.checkinWindow.dateRangeEnd
                  }
                  onChange={(event) =>
                    updateForm("dateRangeEnd", event.target.value)
                  }
                />
              </Field>
              <Field label="每日开始时间" required>
                <input
                  type="time"
                  value={
                    form.dailyStartTime ??
                    selectedCourse.checkinWindow.dailyStartTime
                  }
                  onChange={(event) =>
                    updateForm("dailyStartTime", event.target.value)
                  }
                />
              </Field>
              <Field label="每日结束时间" required>
                <input
                  type="time"
                  value={
                    form.dailyEndTime ??
                    selectedCourse.checkinWindow.dailyEndTime
                  }
                  onChange={(event) =>
                    updateForm("dailyEndTime", event.target.value)
                  }
                />
              </Field>
            </div>
            <FormError message={formError} />
          </section>
        </Dialog>
      )}

      {dialog?.type === "invite" &&
        selectedCourse &&
        (() => {
          const invite = selectedCourse.invite;
          const inviteStatus = invite
            ? getInviteStatus(invite, inviteClock)
            : "invalid";
          const isActiveInvite = inviteStatus === "active";
          const statusTone =
            inviteStatus === "active"
              ? "green"
              : inviteStatus === "expired"
                ? "orange"
                : "red";
          return (
            <Dialog
              wide
              className="course-invite-dialog"
              title={`${courseLabel(selectedCourse)} · 课程邀请`}
              description={
                isActiveInvite
                  ? "将二维码投影给学生端扫码，或复制邀请码在学生端手动输入。学生确认资料且服务端校验成功后会立即成为课程成员。"
                  : "邀请码失效后不能再用于加入课程。有效期 5–120 分钟，到期后仅一次 10 分钟宽限且不得刷新。"
              }
              close={closeDialog}
              footer={
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={closeDialog}
                  >
                    关闭
                  </button>
                  {isActiveInvite && invite && (
                    <>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() =>
                          openDialog({
                            type: "invite-revoke",
                            courseId: selectedCourse.id,
                          })
                        }
                      >
                        撤销邀请码
                      </button>
                    </>
                  )}
                  {!isActiveInvite && (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => void generateInvite(selectedCourse.id)}
                    >
                      <QrCode size={15} aria-hidden="true" />
                      生成新邀请码
                    </button>
                  )}
                </>
              }
            >
              {isActiveInvite && invite ? (
                <div
                  className="course-invite-print-sheet"
                  ref={invitePresentationRef}
                >
                  <div className="course-invite-overview">
                    <div>
                      <span className="course-invite-eyebrow">
                        课程加入邀请码
                      </span>
                      <h3>{selectedCourse.name}</h3>
                      <p>
                        {selectedCourse.semester}
                      </p>
                    </div>
                    <Badge tone={statusTone}>
                      {inviteStatusLabel(inviteStatus)}
                    </Badge>
                  </div>
                  <div className="course-invite-content">
                    <InviteQrCode
                      code={invite.code}
                      alt={`${selectedCourse.name}的课程邀请二维码`}
                      onReady={handleInviteQrReady}
                    />
                    <div className="course-invite-details">
                      <p className="course-invite-instruction">
                        请使用学生端扫描二维码；无法扫码时，可在学生端手动输入邀请码。
                      </p>
                      <div className="course-invite-code-row">
                        <span>邀请码</span>
                        <strong>{invite.code}</strong>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label="复制邀请码"
                          onClick={() => void copyInviteCode(invite)}
                        >
                          <Copy size={17} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="course-invite-expiry">
                        <span>有效期至（北京时间）</span>
                        <strong>{formatInviteExpiry(invite.expiresAt)}</strong>
                        <small>
                          {formatInviteRemaining(invite.expiresAt, inviteClock)}
                        </small>
                      </div>
                      <div className="course-invite-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={presentInviteQr}
                        >
                          <Maximize2 size={16} aria-hidden="true" />
                          全屏投影
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() =>
                            downloadInviteQr(selectedCourse, invite)
                          }
                        >
                          <Download size={16} aria-hidden="true" />
                          下载
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => window.print()}
                        >
                          <Printer size={16} aria-hidden="true" />
                          打印
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="course-invite-note">
                    二维码仅用于定位课程并携带短期加入凭证；学生资料校验成功后直接加入，无需教师审批。已加入成员会立即出现在学生名单中。
                  </p>
                </div>
              ) : (
                <section className="course-invite-inactive">
                  <span>
                    <CircleAlert size={23} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>
                      {invite
                        ? `邀请码${inviteStatusLabel(inviteStatus)}`
                        : mode === "demo"
                          ? "尚未生成邀请码"
                          : "当前邀请码明文不会被重新读取"}
                    </h3>
                    <p>
                      {invite
                        ? "此前展示的二维码已失效。请生成新邀请码后再让学生扫码。"
                        : mode === "demo"
                          ? "生成后可投影二维码、下载或打印，也可将邀请码发送给学生。"
                          : "如需重新展示，请生成新邀请码；服务端会同时使此前的有效邀请码失效。"}
                    </p>
                    <Field label="邀请有效期（分钟）" required>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={form.inviteDurationMinutes ?? "30"}
                        onChange={(event) =>
                          updateForm("inviteDurationMinutes", event.target.value)
                        }
                      />
                    </Field>
                    <p className="field-note">
                      5–120，默认 30。到期后仅允许一次 10 分钟宽限，不能刷新续期。
                    </p>
                  </div>
                </section>
              )}
            </Dialog>
          );
        })()}

      {dialog?.type === "invite-revoke" && selectedCourse && (
        <Dialog
          title={mode === "demo" ? "撤销课程邀请码" : "替换课程邀请码"}
          description={
            mode === "demo"
              ? "撤销后，当前二维码和邀请码将立即失效。"
              : "服务端 API 不提供单独撤销接口。生成新邀请码会在同一服务端事务中使旧邀请码失效，且不会影响已经建立的成员关系。"
          }
          close={closeDialog}
          footer={
            <>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  openDialog({ type: "invite", courseId: selectedCourse.id })
                }
              >
                返回
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => revokeInvite(selectedCourse.id)}
              >
                {mode === "demo" ? "确认撤销" : "生成新码并替换旧码"}
              </button>
            </>
          }
        >
          <section className="course-invite-revoke-summary">
            <QrCode size={21} aria-hidden="true" />
            <div>
              <strong>{courseLabel(selectedCourse)}</strong>
              <span>{selectedCourse.invite?.code ?? "尚未生成邀请码"}</span>
            </div>
          </section>
        </Dialog>
      )}

      {(dialog?.type === "student-action" || dialog?.type === "supplement") &&
        (() => {
          const action =
            dialog.type === "supplement" ? "supplement" : dialog.action;
          const student =
            dialog.type === "supplement"
              ? students.find((item) => item.id === form.studentId)
              : selectedStudent;
          const course = student
            ? courses.find((item) => item.id === student.courseId)
            : undefined;
          const waiverType = form.creditType ?? "课程相关";
          const manualWaiver = student
            ? waiverType === "课程相关"
              ? (student.courseWaiverHours ?? 0)
              : (student.otherWaiverHours ?? 0)
            : 0;
          const approvedOffset = student
            ? exemptions
                .filter(
                  (item) =>
                    item.studentId === student.id && item.status === "approved",
                )
                .reduce(
                  (total, item) =>
                    total +
                    (waiverType === "课程相关"
                      ? (item.courseOffset ?? 0)
                      : (item.otherOffset ?? 0)),
                  0,
                )
            : 0;
          const waiverTarget =
            waiverType === "课程相关"
              ? (course?.courseTarget ?? 0)
              : (course?.otherTarget ?? 0);
          const availableWaiverHours = Math.max(
            0,
            waiverTarget - manualWaiver - approvedOffset,
          );
          const actionTitle =
            action === "remove"
              ? "移出课程"
              : action === "waiver"
                ? "减免运动时长"
                : "补录学生学时";
          const actionDescription =
            action === "remove"
              ? "确认后该成员关系变为“已移出课程”；旧打卡和成绩保留为历史只读。"
              : action === "waiver"
                ? "减免只降低该学生对应类别的完成目标，不修改已有打卡记录。"
                : "教师补录不占用学生每日一次/2h额度，并立即计入统计。";
          return (
            <Dialog
              title={actionTitle}
              description={actionDescription}
              close={closeDialog}
              footer={
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={closeDialog}
                  >
                    取消
                  </button>
                  <button
                    className={
                      action === "remove" ? "danger-button" : "primary-button"
                    }
                    type="button"
                    onClick={() =>
                      student &&
                      runStudentAction(student.id, action, Date.now())
                    }
                  >
                    {action === "remove" ? "确认移出课程" : "确认操作"}
                  </button>
                </>
              }
            >
              <div className="form-grid">
                {dialog.type === "supplement" && (
                  <AppSelect
                    label="学生"
                    required
                    searchable
                    value={form.studentId ?? ""}
                    options={[
                      { value: "", label: "请选择" },
                      ...students
                        .filter((item) => item.status === "active")
                        .map((item) => ({
                          value: String(item.id),
                          label: `${item.name} · ${item.number} · ${courseLabel(courses.find((course) => course.id === item.courseId))}`,
                          keywords: [item.name, item.number],
                        })),
                    ]}
                    onChange={(nextValue) =>
                      updateForm("studentId", String(nextValue ?? ""))
                    }
                  />
                )}
                {student && (
                  <div className="detail-card">
                    {studentIdentity(student)}
                    <p>{courseLabel(course)}</p>
                  </div>
                )}
                {action === "supplement" && (
                  <div className="form-grid two-columns">
                    <AppSelect
                      label="学时类别"
                      required
                      value={form.creditType ?? "课程相关"}
                      options={[
                        { value: "课程相关", label: "课程相关" },
                        { value: "其他运动", label: "其他运动" },
                      ]}
                      onChange={(nextValue) =>
                        updateForm("creditType", String(nextValue ?? ""))
                      }
                    />
                    <p className="record-audit-hint">
                      v8.0 按整分钟计入、单次最多 60 分钟。补录将调用 Contract `createMakeupExerciseRecord`。
                    </p>
                    <Field label="整分钟计入" required>
                      <input
                        id="makeup-whole-minutes"
                        type="number"
                        min="1"
                        max="60"
                        value={form.makeupMinutes ?? "30"}
                        onChange={(event) => updateForm("makeupMinutes", event.target.value)}
                        placeholder="1–60"
                      />
                    </Field>
                    <AppSelect
                      label="运动项目"
                      required
                      value={form.sport ?? ""}
                      options={[
                        { value: "", label: "请选择" },
                        ...MAKEUP_SPORT_TYPES.map((item) => ({
                          value: item.value,
                          label: item.label,
                        })),
                      ]}
                      onChange={(nextValue) =>
                        updateForm("sport", String(nextValue ?? ""))
                      }
                    />
                    <Field label="教师凭证（可选）">
                      <input
                        value={form.proof ?? ""}
                        onChange={(event) =>
                          updateForm("proof", event.target.value)
                        }
                        placeholder="凭证文件名"
                      />
                    </Field>
                  </div>
                )}
                {action === "waiver" && (
                  <div className="form-grid two-columns">
                    <AppSelect
                      label="减免类别"
                      required
                      value={waiverType}
                      options={[
                        { value: "课程相关", label: "课程相关" },
                        { value: "其他运动", label: "其他运动" },
                      ]}
                      onChange={(nextValue) =>
                        updateForm("creditType", String(nextValue ?? ""))
                      }
                    />
                    <Field
                      label="减免时长"
                      required
                      hint={`该类别还可减免 ${availableWaiverHours.toFixed(1)} 小时`}
                    >
                      <input
                        type="number"
                        min="0.1"
                        max={availableWaiverHours}
                        step="0.1"
                        value={form.hours ?? ""}
                        onChange={(event) =>
                          updateForm("hours", event.target.value)
                        }
                      />
                    </Field>
                    <p className="field-note">
                      减免后，学生端将按新的目标计算剩余学时；原有打卡记录和已获得学时保持不变。
                    </p>
                  </div>
                )}
                <Field
                  label={
                    action === "supplement"
                      ? "补录原因"
                      : action === "waiver"
                        ? "减免原因"
                        : "移出课程原因"
                  }
                  required
                >
                  <textarea
                    value={form.reason ?? ""}
                    onChange={(event) =>
                      updateForm("reason", event.target.value)
                    }
                  />
                </Field>
              </div>
              <FormError message={formError} />
            </Dialog>
          );
        })()}

      {dialog?.type === "checkin-return-proof" && selectedReturnRecord && (
        <Dialog
          className="checkin-invalid-dialog"
          eyebrow="Contract 退回补证"
          title={`将“${selectedReturnRecord.sport}”退回一次补证`}
          description="必须选择一项适用于退回补证的固定公开原因。可选一句公开补充说明保留原文。窗口从服务器确认退回时起算。BD-20260904-01 已关闭原待定分类。"
          close={closeDialog}
          footer={
            <>
              <button className="secondary-button" type="button" onClick={closeDialog}>取消</button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void confirmReturnForProof(selectedReturnRecord.id)}
              >
                确认退回补证
              </button>
            </>
          }
        >
          <Field label="补证窗口" required>
            <select
              value={form.proofWindowHours ?? "24"}
              onChange={(event) => updateForm("proofWindowHours", event.target.value)}
            >
              <option value="24">24 小时</option>
              <option value="72">72 小时</option>
            </select>
          </Field>
          <div className="invalid-reason-list" role="radiogroup" aria-label="退回补证公开原因">
            {returnForProofReasons.map((reason) => (
              <button
                type="button"
                role="radio"
                aria-checked={form.publicReasonId === reason.id}
                className={form.publicReasonId === reason.id ? "selected" : ""}
                key={reason.id}
                onClick={() => updateForm("publicReasonId", reason.id)}
              >
                <span aria-hidden="true" />
                {reason.zh}
                <small>{reason.en}</small>
              </button>
            ))}
          </div>
          <Field label="公开补充说明（可选，保留原文）" hint="不能代替固定分类，也不增加其他兜底项。">
            <textarea
              value={form.publicSupplementalNote ?? ""}
              onChange={(event) => updateForm("publicSupplementalNote", event.target.value)}
            />
          </Field>
          <FormError message={formError} />
        </Dialog>
      )}

      {dialog?.type === "checkin-invalid" && selectedInvalidRecord && (
        <Dialog
          className="checkin-invalid-dialog"
          eyebrow={mode === "demo" ? "前端审核原型" : "服务端正式审核"}
          title={`将“${selectedInvalidRecord.sport}”标记为无效`}
          description="必须选择一项适用于判为无效的固定公开原因。可选一句公开补充说明保留原文。不能选择仅适用于退回的分类，也不提供其他兜底项。"
          close={closeDialog}
          footer={
            <>
              <button
                className="secondary-button"
                type="button"
                onClick={closeDialog}
              >
                取消
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() =>
                  confirmInvalidAttendance(selectedInvalidRecord.id)
                }
              >
                确认标记无效
              </button>
            </>
          }
        >
          <div
            className="invalid-reason-list"
            role="radiogroup"
            aria-label="无效原因"
            aria-invalid={Boolean(userFacingFieldError(formError, "reasonCode", "invalidReason", "publicReasonId")) || undefined}
            aria-describedby={formError ? "teacher-form-error" : undefined}
          >
            {markInvalidReasons.map((reason) => (
              <button
                type="button"
                role="radio"
                aria-checked={form.publicReasonId === reason.id}
                className={form.publicReasonId === reason.id ? "selected" : ""}
                key={reason.id}
                onClick={() => updateForm("publicReasonId", reason.id)}
              >
                <span aria-hidden="true" />
                {reason.zh}
                <small>{reason.en}</small>
              </button>
            ))}
          </div>
          <Field
            label="公开补充说明（可选，保留原文）"
            error={userFacingFieldError(formError, "reason", "publicComment", "auditRemark")}
            hint="补充说明不能代替固定分类。"
          >
            <textarea
              maxLength={240}
              value={form.publicSupplementalNote ?? form.auditRemark ?? ""}
              onChange={(event) =>
                updateForm("publicSupplementalNote", event.target.value)
              }
            />
          </Field>
          <FormError message={formError} />
        </Dialog>
      )}

      {dialog?.type === "checkin-correct-valid" && selectedCorrectionRecord && (
        <Dialog
          className="checkin-invalid-dialog"
          eyebrow={mode === "demo" ? "前端审核原型" : "服务端正式审核"}
          title={`将“${selectedCorrectionRecord.sport}”改回有效`}
          description="系统会直接追加一条有效结论；原无效审核会完整保留。"
          close={closeCorrectionDialog}
          closeDisabled={reviewTransitionPending}
          footer={
            <>
              <button
                className="secondary-button"
                type="button"
                disabled={reviewTransitionPending}
                onClick={closeCorrectionDialog}
              >
                取消
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={reviewTransitionPending}
                onClick={() =>
                  void confirmCorrectAttendanceToValid(selectedCorrectionRecord.id)
                }
              >
                {reviewTransitionPending ? "正在提交…" : "确认纠正为有效"}
              </button>
            </>
          }
        >
          <Field
            label="纠正说明"
            required
            error={userFacingFieldError(formError, "correctionReason", "reason")}
            hint="此说明会写入新的有效审核记录，不会覆盖原无效原因。"
          >
            <textarea
              autoFocus
              maxLength={500}
              value={form.correctionReason ?? ""}
              onChange={(event) =>
                updateForm("correctionReason", event.target.value)
              }
              placeholder="请说明为什么需要把该记录重新判定为有效"
            />
          </Field>
          <FormError message={formError} />
        </Dialog>
      )}

      {dialog?.type === "checkin" &&
        selectedRecord &&
        (() => {
          const student = students.find(
            (item) => item.id === selectedRecord.studentId,
          );
          return (
            <Dialog
              drawer
              wide
              className="checkin-detail-dialog"
              eyebrow="打卡记录"
              title={`${student?.name} · ${selectedRecord.sport}打卡详情`}
              description={
                mode === "demo"
                  ? "先查看审核状态和计入时长，再核对原始记录与运动凭证；详情页仅用于查看。"
                  : "先查看审核状态和计入时长，再核对服务端记录与真实运动凭证。"
              }
              headerContent={
                <div className="checkin-detail-header-meta">
                  <Badge
                    tone={selectedRecord.auditStatus === "valid" ? "green" : "red"}
                  >
                    {auditStatusLabels[selectedRecord.auditStatus]}
                  </Badge>
                  <span>提交时间</span>
                  <time>{businessDateTime(selectedRecord.submittedAt) || "—"}</time>
                </div>
              }
              close={closeDialog}
              footer={
                <button
                  className="primary-button"
                  type="button"
                  onClick={closeDialog}
                >
                  完成查看
                </button>
              }
            >
              <section
                className="checkin-detail-overview"
                aria-label="打卡核心信息"
              >
                <div className="checkin-detail-student">
                  <span>学生</span>
                  {student ? (
                    studentIdentity(student)
                  ) : (
                    <strong>未知学生</strong>
                  )}
                </div>
                <div className="checkin-detail-metric is-primary">
                  <span>可计入时长</span>
                  <strong>
                    {singleRecordCreditedDurationLabel(
                      selectedRecord.creditedMinutes,
                    )}
                  </strong>
                  <small>{selectedRecord.creditType}</small>
                </div>
                <div className="checkin-detail-metric">
                  <span>实际运动时间</span>
                  <strong>{actualDurationLabel(selectedRecord)}</strong>
                  <small>以原始开始和结束时间为准</small>
                </div>
              </section>

              <div className="checkin-detail-content">
                <section
                  className="checkin-detail-section checkin-detail-record"
                  aria-labelledby="checkin-record-heading"
                >
                  <header className="checkin-detail-section-head">
                    <span className="eyebrow">原始记录</span>
                    <h3 id="checkin-record-heading">时间与说明</h3>
                  </header>
                  <dl className="checkin-detail-facts">
                    <div>
                      <dt>打卡开始时间</dt>
                      <dd>{businessDateTime(selectedRecord.startAt) || "—"}</dd>
                    </div>
                    <div>
                      <dt>打卡结束时间</dt>
                      <dd>{businessDateTime(selectedRecord.endAt) || "—"}</dd>
                    </div>
                    <div>
                      <dt>提交时间</dt>
                      <dd>{businessDateTime(selectedRecord.submittedAt) || "—"}</dd>
                    </div>
                    <div className="checkin-detail-description">
                      <dt>运动说明</dt>
                      <dd>{selectedRecord.description}</dd>
                    </div>
                  </dl>
                </section>
                <section className="checkin-detail-section checkin-detail-evidence">
                  <CheckinEvidenceReviewer
                    record={selectedRecord}
                    activeProofIndex={activeCheckinProofIndex}
                    imageZoom={checkinImageZoom}
                    videoPlaying={checkinVideoPlaying}
                    onProofChange={(index) => {
                      setActiveCheckinProofIndex(index);
                      setCheckinImageZoom(1);
                      setCheckinVideoPlaying(false);
                    }}
                    onImageZoomChange={setCheckinImageZoom}
                    onVideoPlayingChange={setCheckinVideoPlaying}
                    onDownload={downloadCheckinProof}
                    realMode={mode !== "demo"}
                    onOpen={() =>
                      void openCheckinMedia(selectedRecord, activeCheckinProofIndex)
                    }
                  />
                </section>
              </div>
              <FormError message={formError} />
            </Dialog>
          );
        })()}

      {dialog?.type === "grade" &&
        selectedGrade &&
        (() => {
          const student = students.find(
            (item) => item.id === selectedGrade.studentId,
          );
          const distance = selectedGrade.gender === "男" ? "1000m" : "800m";
          const previewScore =
            form.enduranceStatus === "Recorded" &&
            form.minutes !== "" &&
            form.seconds !== ""
              ? scoreEndurance(
                  Number(form.minutes) * 60 + Number(form.seconds),
                  selectedGrade.gender === "男" ? 1000 : 800,
                  selectedGrade.gradeGroup === "大三/大四",
                )
              : undefined;
          return (
            <Dialog
              title={`${student?.name} · ${mode === "demo" ? "成绩录入" : "服务端成绩"}`}
              description={
                mode === "demo"
                  ? `系统已按性别默认 ${distance}，用时将依据“${selectedGrade.gradeGroup}”换算表生成内部换算分，不向学生披露。`
                  : "内部成绩由服务端按已审核记录与已生效规则计算；换算分不向学生披露，教师端不本地录入分数。"
              }
              close={closeDialog}
              footer={
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={closeDialog}
                  >
                    取消
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => saveGrade(selectedGrade.id)}
                  >
                    {mode === "demo" ? "保存成绩" : "重新计算"}
                  </button>
                </>
              }
            >
              <div className="detail-card">
                {student ? studentIdentity(student) : <strong>未知学生</strong>}
                <p>
                  {mode === "demo"
                    ? `${selectedGrade.gender} · ${selectedGrade.gradeGroup} · ${distance}`
                    : `后端成绩状态：${scoreStatusLabel(selectedGrade.scoreStatus)} · 达标状态：${qualificationStatusLabel(selectedGrade.qualificationStatus)} · 总有效时长：${durationHoursLabel(selectedGrade.totalValidDurationSeconds)} · 最终分数：${selectedGrade.physicalScore ?? "尚未计算"}`}
                </p>
                {mode === "demo" && selectedGrade.published && (
                  <aside className="inline-warning">
                    该成绩已发布；保存修改后会立即更新学生端、发送强制通知并记录审计来源。
                  </aside>
                )}
              </div>
              {mode === "demo" ? (
                <div className="form-grid">
                <AppSelect
                  label="耐力跑状态"
                  required
                  value={form.enduranceStatus ?? "NotRecorded"}
                  disabled={selectedGrade.enduranceStatus === "Exempt"}
                  options={[
                    {
                      value: "NotRecorded",
                      label: statusLabel("NotRecorded", "grade"),
                    },
                    { value: "Recorded", label: "录入用时" },
                    { value: "Absent", label: "标记缺考" },
                    ...(selectedGrade.enduranceStatus === "Exempt"
                      ? [
                          {
                            value: "Exempt",
                            label: statusLabel("Exempt", "grade"),
                          },
                        ]
                      : []),
                  ]}
                  onChange={(nextValue) =>
                    updateForm("enduranceStatus", String(nextValue ?? ""))
                  }
                />
                {form.enduranceStatus === "Recorded" && (
                  <div className="form-grid two-columns">
                    <Field label="分钟" required>
                      <input
                        type="number"
                        min="0"
                        value={form.minutes ?? ""}
                        onChange={(event) =>
                          updateForm("minutes", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="秒" required>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={form.seconds ?? ""}
                        onChange={(event) =>
                          updateForm("seconds", event.target.value)
                        }
                      />
                    </Field>
                    {previewScore !== undefined && (
                      <div className="score-preview">
                        <span>自动换算</span>
                        <b>{previewScore} 分</b>
                      </div>
                    )}
                  </div>
                )}
                {form.enduranceStatus === "Absent" && (
                  <Field label="缺考原因" required>
                    <textarea
                      value={form.reason ?? ""}
                      onChange={(event) =>
                        updateForm("reason", event.target.value)
                      }
                    />
                  </Field>
                )}
                </div>
              ) : (
                <aside className="grade-publication-notice">
                  “重新计算”只请求服务端刷新成绩投影；不会创建本地分数，也不会自动发布。尚无成绩投影的学生会明确显示“未生成”。
                </aside>
              )}
              <FormError message={formError} />
            </Dialog>
          );
        })()}

      {dialog?.type === "publish-grades" && selectedCourse && (
        <Dialog
          title={`发布 ${courseLabel(selectedCourse)} 成绩`}
          description="只发布当前课程中已由服务端生成且尚未发布的成绩投影；缺失投影的学生不会被伪造为已发布。"
          close={closeDialog}
          footer={
            <>
              <button
                className="secondary-button"
                type="button"
                onClick={closeDialog}
              >
                取消
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => publishGrades(selectedCourse.id)}
              >
                确认发布
              </button>
            </>
          }
        >
          <aside className="grade-publication-notice">
            发布请求逐条使用服务端版本控制。页面不会声称已经发送服务端 API 未保证的通知。
          </aside>
        </Dialog>
      )}

      {dialog?.type === "exemption" &&
        selectedExemption &&
        (() => {
          const student = students.find(
            (item) => item.id === selectedExemption.studentId,
          );
          return (
            <Dialog
              drawer
              wide
              title={`审核 ${student?.name} 的${selectedExemption.kind}`}
              description="审核意见会展示给学生；社团负责人不参与系统审核。"
              close={closeDialog}
              footer={
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={closeDialog}
                  >
                    取消
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => reviewExemption(selectedExemption.id)}
                  >
                    确认审核
                  </button>
                </>
              }
            >
              <div className="detail-card">
                {student ? studentIdentity(student) : <strong>未知学生</strong>}
                <p>
                  {selectedExemption.organization ?? selectedExemption.reason}
                </p>
                <p>{selectedExemption.reason}</p>
                <EvidenceMaterials
                  files={selectedExemption.material}
                  onPreview={(file) => {
                    if (mode === "demo") {
                      openMaterialPreview(
                        file,
                        student?.name ?? "该学生",
                      );
                      return;
                    }
                    const mediaId =
                      selectedExemption.mediaIds?.[
                        selectedExemption.material.indexOf(file)
                      ];
                    if (mediaId) void openSecureMedia(mediaId);
                    else showToast("该申请未附带可访问的服务端凭证。");
                  }}
                />
              </div>
              <div className="form-grid">
                <AppSelect
                  label="审核结果"
                  required
                  error={userFacingFieldError(formError, "decision")}
                  value={form.decision ?? ""}
                  options={[
                    { value: "", label: "请选择" },
                    { value: "approve", label: "通过" },
                    { value: "reject", label: "驳回" },
                    { value: "supplement", label: "要求补材料" },
                  ]}
                  onChange={(nextValue) =>
                    updateForm("decision", String(nextValue ?? ""))
                  }
                />
                {mode === "demo" &&
                  form.decision === "approve" &&
                  selectedExemption.kind === "耐力跑免测" && (
                    <Field
                      label="免测分数"
                      required
                      hint="根据实际情况自定义，不固定为 100 分"
                    >
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.score ?? ""}
                        onChange={(event) =>
                          updateForm("score", event.target.value)
                        }
                      />
                    </Field>
                  )}
                {mode === "demo" &&
                  form.decision === "approve" &&
                  selectedExemption.kind !== "耐力跑免测" && (
                    <div className="form-grid two-columns">
                      <Field label="课程运动抵扣" required>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={form.courseOffset ?? "0"}
                          onChange={(event) =>
                            updateForm("courseOffset", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="其他运动抵扣" required>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={form.otherOffset ?? "0"}
                          onChange={(event) =>
                            updateForm("otherOffset", event.target.value)
                          }
                        />
                      </Field>
                      <p className="field-note">
                        两类合计不得超过 20
                        小时；学生端按抵扣后的目标计算剩余学时。
                      </p>
                    </div>
                  )}
                {mode !== "demo" && form.decision === "approve" && (
                  <aside className="grade-publication-notice">
                    审核通过只改变申请状态；服务端不会因此自动生成分数或抵扣时长。
                  </aside>
                )}
                <Field label="审核意见" required error={userFacingFieldError(formError, "publicComment", "comment")}>
                  <textarea
                    value={form.comment ?? ""}
                    onChange={(event) =>
                      updateForm("comment", event.target.value)
                    }
                    placeholder={
                      form.decision === "supplement"
                        ? "请明确需要补充的材料"
                        : "请说明审核依据和处理结果"
                    }
                  />
                </Field>
              </div>
              <FormError message={formError} />
            </Dialog>
          );
        })()}

      {materialPreview &&
        (() => {
          const image = isImageMaterial(materialPreview.file);
          return (
            <Dialog
              wide
              title={`预览 ${materialPreview.file}`}
              description={`${materialPreview.studentName} 提交的证明材料，仅限本次审核使用。`}
              close={() => setMaterialPreview(null)}
              footer={
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setMaterialPreview(null)}
                >
                  关闭预览
                </button>
              }
            >
              <div className="evidence-preview-layout">
                <div
                  className={`evidence-preview-canvas ${image ? "evidence-preview-image" : "evidence-preview-document"}`}
                >
                  <span className="evidence-preview-type">
                    {materialTypeLabel(materialPreview.file)}
                  </span>
                  <div className="evidence-preview-sheet">
                    <b>{image ? "学生上传图片" : "学生上传文件"}</b>
                    <span>{image ? "证明材料预览" : "证明材料 · 第 1 页"}</span>
                    <i />
                    <i />
                    <i />
                  </div>
                  <small>只读预览</small>
                </div>
                <aside className="evidence-preview-info">
                  <span>文件信息</span>
                  <dl>
                    <div>
                      <dt>文件名</dt>
                      <dd>{materialPreview.file}</dd>
                    </div>
                    <div>
                      <dt>提交人</dt>
                      <dd>{materialPreview.studentName}</dd>
                    </div>
                  </dl>
                </aside>
              </div>
            </Dialog>
          );
        })()}
    </>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <span>✓</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function FormError({ message }: { message: FormErrorState }) {
  if (!message) return null;
  if (typeof message !== "string") return <ErrorPanel id="teacher-form-error" error={message} />;
  return (
    <p id="teacher-form-error" className="form-error teacher-form-error" role="alert">
      {message}
    </p>
  );
}
