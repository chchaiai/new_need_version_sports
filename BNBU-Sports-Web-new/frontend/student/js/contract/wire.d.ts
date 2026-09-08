export type WireSchema = "ExerciseRecord" | "RecordReviewSummary" | "PublicReviewReason" | "StudentCourseProgress" | "StudentCourse";
export function assertContractWire<T>(schema: WireSchema, value: T): T;
export function isContractExerciseRecord(value: unknown): boolean;
export function isContractStudentProgress(value: unknown): boolean;
