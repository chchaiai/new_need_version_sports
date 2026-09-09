import {
  validateExerciseRecord, validateRecordReviewSummary, validatePublicReviewReason,
  validateStudentCourseProgress, validateStudentCourse,
  validateStudentReference, validateCurrentStudentReference, validateDeletedStudentReference, validateEnrollment,
  validateStudentApplication, validateFeedbackTicket, validateSettlementReportRow, validateCourseChangeImpact,
  validateAssessmentRosterRow,
} from "./validators.generated.js";

const validators = {
  ExerciseRecord: validateExerciseRecord,
  RecordReviewSummary: validateRecordReviewSummary,
  PublicReviewReason: validatePublicReviewReason,
  StudentCourseProgress: validateStudentCourseProgress,
  StudentCourse: validateStudentCourse,
  StudentReference: validateStudentReference, CurrentStudentReference: validateCurrentStudentReference,
  DeletedStudentReference: validateDeletedStudentReference, Enrollment: validateEnrollment,
  StudentApplication: validateStudentApplication, FeedbackTicket: validateFeedbackTicket,
  SettlementReportRow: validateSettlementReportRow, CourseChangeImpact: validateCourseChangeImpact,
  AssessmentRosterRow: validateAssessmentRosterRow,
};

/** Preserve input bytes/values; report schema locations, never student payload values. */
export function assertContractWire(schema, value) {
  const validate = validators[schema];
  if (!validate) throw new Error("Unknown Contract schema: " + schema);
  if (!validate(value)) {
    const error = new Error("CONTRACT_WIRE_INVALID:" + schema);
    error.name = "ContractWireValidationError";
    error.issues = (validate.errors || []).map(({ instancePath, schemaPath, keyword }) => ({
      instancePath, schemaPath, keyword,
    }));
    throw error;
  }
  return value;
}

/** Display identity, not a synthetic StudentSummary. The strict guard rejects mixed branches/PII. */
export function studentIdentityDisplay(value, english = false) {
  const reference = assertContractWire("StudentReference", value);
  switch (reference.kind) {
    case "CURRENT_STUDENT":
      return { id: reference.student.studentId, label: reference.student.name,
        studentNumber: reference.student.studentNumber, deleted: false, canOpenCurrentProfile: true };
    case "DELETED_STUDENT":
      return { id: reference.studentId, label: english ? "Deleted student" : "已注销学生",
        studentNumber: null, deleted: true, canOpenCurrentProfile: false };
    default: throw new Error("CONTRACT_STUDENT_REFERENCE_UNKNOWN");
  }
}

export function requireCurrentStudent(value) {
  assertContractWire("StudentReference", value);
  if (value.kind !== "CURRENT_STUDENT") throw new Error("CONTRACT_CURRENT_STUDENT_REQUIRED");
  return value.student;
}

// Route by protocol identity before validation. A damaged 1.3 record must not
// fall back to the legacy mapper just because one of its required fields is absent.
export function isContractExerciseRecord(value) {
  if (!value || typeof value !== "object") return false;
  return !Object.hasOwn(value, "id") || ["recordId", "currentMaterial", "ruleVersionId", "activityType", "student"].some(
    (key) => Object.hasOwn(value, key),
  ) || ["processingStage", "materialVersionId"].some(
    (key) => Object.hasOwn(value.currentReview || {}, key),
  );
}

export function isContractStudentProgress(value) {
  return Boolean(value && typeof value === "object" &&
    ["state", "checkpoint", "observedAt", "unavailableReason"].some((key) => Object.hasOwn(value, key)));
}
