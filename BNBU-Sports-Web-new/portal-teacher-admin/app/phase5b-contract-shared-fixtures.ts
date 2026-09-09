import type { components } from "./phase5b-contract.generated";

type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];

export const phase5bRuleTemplateVersion = {
  templateVersionId: "79000000-0000-4000-8000-000000000001",
  formulaVersion: "P4Z-A-08-v1",
  label: {
    zh: "标准 1200 分钟模板",
    en: "Standard 1200-minute template",
  },
  totalTargetMinutes: 1200,
  singleRecordCapMinutes: 60,
  dailyCountLimit: 1,
  defaultThresholdMinutes: 30,
  defaultWeeklyCountLimit: 3,
  thresholdChoices: [30, 45, 60],
  weeklyCountChoices: [2, 3, 4],
  status: "PUBLISHED",
  versionNo: 1,
  publishedAt: "2026-08-31T00:00:00Z",
} satisfies Schema<"RuleTemplateVersion">;

export const phase5bCourseAllowedInterval = {
  startsAt: "2026-08-31T00:00:00Z",
  endsAtExclusive: "2027-01-15T15:59:59Z",
} satisfies Schema<"CourseAllowedInterval">;

export function buildPhase5bPublishedRule(
  courseId: string,
  semesterId: string,
  ruleVersionId: string,
): Schema<"CourseRuleVersion"> {
  return {
    ruleVersionId,
    courseId,
    semesterId,
    template: phase5bRuleTemplateVersion,
    courseRelatedTargetMinutes: 720,
    otherTargetMinutes: 480,
    thresholdMinutes: 30,
    weeklyCountLimit: 3,
    allowedIntervals: [phase5bCourseAllowedInterval],
    regularCutoffAt: "2027-01-08T15:59:59Z",
    plannedSettlementAt: "2027-01-15T15:59:59Z",
    closeoutEndsAt: "2027-01-22T15:59:59Z",
    publishedAt: "2026-08-31T00:00:00Z",
    reminderScheduledAt: "2026-12-25T15:59:59Z",
    versionNo: 1,
  };
}

export const phase5bCourseRuleConfiguration = {
  templateVersionId: phase5bRuleTemplateVersion.templateVersionId,
  courseRelatedTargetMinutes: 720,
  otherTargetMinutes: 480,
  thresholdMinutes: 30,
  weeklyCountLimit: 3,
  allowedIntervals: [phase5bCourseAllowedInterval],
  regularCutoffAt: "2027-01-08T15:59:59Z",
  plannedSettlementAt: "2027-01-15T15:59:59Z",
} satisfies Schema<"CourseRuleConfiguration">;

export function buildPhase5bCourseStatisticsScope(courseId: string): Schema<"CourseStatisticsScope"> {
  return {
    scopeId: "7a000000-0000-4000-8000-000000000001",
    snapshotId: "7b000000-0000-4000-8000-000000000001",
    courseId,
    kind: "CURRENT_ACTIVE_MEMBERS",
    memberCount: 32,
    membershipScopeVersion: "membership-v1",
    settlementVersionId: null,
  };
}

export const phase5bProgressCategories = [
  {
    category: "COURSE_RELATED",
    targetMinutes: 720,
    activeCertificationMinutes: 60,
    cappedCompletedMinutes: 360,
    countedCertificationMinutes: 60,
    countedRecordMinutes: 300,
    remainingMinutes: 360,
  },
  {
    category: "OTHER",
    targetMinutes: 480,
    activeCertificationMinutes: 0,
    cappedCompletedMinutes: 180,
    countedCertificationMinutes: 0,
    countedRecordMinutes: 180,
    remainingMinutes: 300,
  },
] satisfies Schema<"ProgressCategory">[];

export const phase5bProgressTotals = {
  actualDurationSeconds: 32_400,
  categories: phase5bProgressCategories,
  completionRatio: 0.45,
  countedCertificationMinutes: 60,
  countedRecordMinutes: 480,
  displayPercent: 45,
  invalidActualMinutes: 0,
  pendingRecordCount: 0,
  targetMet: false,
  totalCompletedMinutes: 540,
  totalTargetMinutes: 1200,
  validFormulaExcludedMinutes: 0,
  validUncountedEligibleMinutes: 0,
} satisfies Schema<"ProgressTotals">;

export function buildPhase5bStatisticsCheckpoint(
  courseId: string,
  enrollmentId: string,
  ruleVersionId: string,
  selectedRecordIds: readonly string[],
): Schema<"StatisticsCheckpoint"> {
  return {
    checkpointId: "7c000000-0000-4000-8000-000000000001",
    courseId,
    enrollmentId,
    policyVersion: "P4Z-A-08-v1",
    computedAt: "2026-09-01T00:20:00Z",
    selectedRecordIds,
    sources: {
      ruleVersionId,
      membershipScopeVersion: "membership-v1",
      recordFactSetVersion: "records-v1",
      reviewCandidateSetVersion: "reviews-v1",
      certificationSetVersion: "certs-v1",
      previousCheckpointId: null,
    },
    totals: phase5bProgressTotals,
  };
}

export function buildPhase5bStudentCourseProgress(
  courseId: string,
  enrollmentId: string,
  student: Schema<"StudentSummary">,
  ruleVersionId: string,
  selectedRecordIds: readonly string[],
  observedAt = "2026-09-01T00:20:00Z",
): Schema<"StudentCourseProgress"> {
  return {
    courseId,
    enrollmentId,
    student: { kind: "CURRENT_STUDENT", student },
    state: "CURRENT",
    observedAt,
    unavailableReason: null,
    checkpoint: buildPhase5bStatisticsCheckpoint(courseId, enrollmentId, ruleVersionId, selectedRecordIds),
  };
}

export function buildPhase5bMaterialVersion(
  recordId: string,
  mediaAssetId: string,
  materialVersionId = "78000000-0000-4000-8000-000000000001",
): Schema<"MaterialVersion"> {
  return {
    materialVersionId,
    recordId,
    batchId: "78000000-0000-4000-8000-000000000002",
    acceptedAt: "2026-08-31T03:15:00Z",
    items: [
      {
        mediaAssetId,
        checksumSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        phase: "GENERAL",
        position: 1,
      },
    ],
    previousMaterialVersionId: null,
    readiness: "READY",
    returnActionId: null,
    transferCompletedAt: "2026-08-31T03:14:00Z",
    transferDueAt: "2026-08-31T03:45:00Z",
    version: 1,
    versionNo: 1,
  };
}

export const phase5bUnclearEvidenceReason = {
  code: "UNCLEAR_EVIDENCE",
  label: {
    zh: "材料不清晰",
    en: "Unclear evidence",
  },
} satisfies Schema<"PublicReviewReason">;

export function buildPhase5bRecordReviewSummary(
  materialVersionId: string,
  result: Schema<"ReviewResult"> = "VALID",
): Schema<"RecordReviewSummary"> {
  return {
    materialVersionId,
    processingStage: result,
    publicComment: null,
    publicReason: null,
    result,
    reviewCaseId: "78000000-0000-4000-8000-000000000003",
    roundNo: 1,
    sequenceNumber: 1,
    supplementReturnUsed: false,
    supplementTimer: null,
    teacherSla: null,
    updatedAt: "2026-08-31T03:15:00Z",
    version: 1,
  };
}

export function invitationPreviewUnavailableReason(
  status: Schema<"CourseInvitationPreview">["status"],
): Schema<"CourseInvitationPreview">["unavailableReason"] {
  if (status === "ACTIVE") return null;
  if (status === "EXPIRED") return "EXPIRED";
  if (status === "REVOKED") return "REVOKED";
  if (status === "COURSE_CLOSED") return "COURSE_CLOSED";
  return "NOT_CURRENT";
}
