import {
  validateExerciseRecord, validateRecordReviewSummary, validatePublicReviewReason,
  validateStudentCourseProgress, validateStudentCourse,
} from "./validators.generated.js";

const validators = {
  ExerciseRecord: validateExerciseRecord,
  RecordReviewSummary: validateRecordReviewSummary,
  PublicReviewReason: validatePublicReviewReason,
  StudentCourseProgress: validateStudentCourseProgress,
  StudentCourse: validateStudentCourse,
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
