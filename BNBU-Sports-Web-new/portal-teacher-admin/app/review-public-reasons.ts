/** V8.1 check-in public reasons. Labels follow docs/business/00-overview.md §12.2.
 *  These ids are UI keys only; they are not Contract 1.2.0 wire enums. */

export const TEACHER_REVIEW_ACTIONS = {
  ReturnForSupplement: "ReturnForSupplement",
  MarkInvalid: "MarkInvalid",
} as const;

export type TeacherReviewAction =
  (typeof TEACHER_REVIEW_ACTIONS)[keyof typeof TEACHER_REVIEW_ACTIONS];

export type PublicReasonId =
  | "UnclearEvidence"
  | "MissingRequiredEvidence"
  | "EvidenceDoesNotMatchSession"
  | "InconsistentEvidence"
  | "AuthenticityRequiresClarification"
  | "ConfirmedReuseOrMisuse";

export type PublicReasonOption = {
  id: PublicReasonId;
  zh: string;
  en: string;
  actions: TeacherReviewAction[];
};

export const PUBLIC_REASON_CATALOG: PublicReasonOption[] = [
  {
    id: "UnclearEvidence",
    zh: "材料不清晰",
    en: "Unclear evidence",
    actions: [
      TEACHER_REVIEW_ACTIONS.ReturnForSupplement,
      TEACHER_REVIEW_ACTIONS.MarkInvalid,
    ],
  },
  {
    id: "MissingRequiredEvidence",
    zh: "必需材料缺失（含要求的前后照）",
    en: "Missing required evidence",
    actions: [
      TEACHER_REVIEW_ACTIONS.ReturnForSupplement,
      TEACHER_REVIEW_ACTIONS.MarkInvalid,
    ],
  },
  {
    id: "EvidenceDoesNotMatchSession",
    zh: "材料与本次运动不符",
    en: "Evidence does not match this session",
    actions: [
      TEACHER_REVIEW_ACTIONS.ReturnForSupplement,
      TEACHER_REVIEW_ACTIONS.MarkInvalid,
    ],
  },
  {
    id: "InconsistentEvidence",
    zh: "材料信息矛盾",
    en: "Inconsistent evidence",
    actions: [
      TEACHER_REVIEW_ACTIONS.ReturnForSupplement,
      TEACHER_REVIEW_ACTIONS.MarkInvalid,
    ],
  },
  {
    id: "AuthenticityRequiresClarification",
    zh: "材料真实性待核实",
    en: "Evidence authenticity requires clarification",
    actions: [TEACHER_REVIEW_ACTIONS.ReturnForSupplement],
  },
  {
    id: "ConfirmedReuseOrMisuse",
    zh: "经核实存在重复使用或冒用材料",
    en: "Confirmed reuse or misuse of evidence",
    actions: [TEACHER_REVIEW_ACTIONS.MarkInvalid],
  },
];

export const SYSTEM_OVERDUE_REASON = {
  zh: "补证逾期",
  en: "Supplementary evidence deadline missed",
} as const;

export function reasonsForAction(action: TeacherReviewAction): PublicReasonOption[] {
  return PUBLIC_REASON_CATALOG.filter((reason) => reason.actions.includes(action));
}

export function publicReasonById(id: string | null | undefined): PublicReasonOption | null {
  return PUBLIC_REASON_CATALOG.find((reason) => reason.id === id) ?? null;
}
