export type WireSchema = "ExerciseRecord" | "RecordReviewSummary" | "PublicReviewReason" | "StudentCourseProgress" | "StudentCourse" |
  "StudentReference" | "CurrentStudentReference" | "DeletedStudentReference" | "Enrollment" | "StudentApplication" |
  "FeedbackTicket" | "SettlementReportRow" | "CourseChangeImpact" | "AssessmentRosterRow";
export function assertContractWire<T>(schema: WireSchema, value: T): T;
export function isContractExerciseRecord(value: unknown): boolean;
export function isContractStudentProgress(value: unknown): boolean;
export type StudentIdentityDisplay = { id: string; label: string; studentNumber: string | null; deleted: boolean; canOpenCurrentProfile: boolean };
export function studentIdentityDisplay(value: unknown, english?: boolean): StudentIdentityDisplay;
export function requireCurrentStudent(value: unknown): import("../../phase5b-contract.generated").components["schemas"]["StudentSummary"];
