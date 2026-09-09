// Node-only test inputs. Product modules never import this file.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const contract = readFileSync(new URL("../../../contracts/openapi.yaml", import.meta.url));
const sha = createHash("sha256").update(contract).digest("hex");
if (sha !== "0528389bb8b72714d9a4af35ffc66c87503560d41c58ad968b1713b39ff3da2d") {
  throw new Error("Test inputs require the fixed Phase 6 Contract.");
}
export const publishedCases = JSON.parse(readFileSync(
  new URL("../../../contracts/validation/p7_cr14/fixtures.json", import.meta.url), "utf8",
)).cases;

export function publishedFixture(name) {
  const row = publishedCases.find((item) => item.name === name);
  if (!row || !row.expectedValid) throw new Error("Missing published positive fixture: " + name);
  return structuredClone(row.payload);
}

export function recordWithReview(name = "prior-workflow/review/valid") {
  const record = publishedFixture("prior-workflow/record/full_pending_response");
  record.currentReview = publishedFixture(name);
  record.currentMaterial.materialVersionId = record.currentReview.materialVersionId;
  if (record.currentReview.processingStage !== "MATERIAL_PROCESSING") {
    record.currentMaterial.readiness = "READY";
    record.currentMaterial.transferCompletedAt = record.currentReview.updatedAt;
  }
  if (record.currentReview.roundNo === 2) {
    record.currentMaterial.versionNo = 2;
    record.currentMaterial.previousMaterialVersionId = "00000000-0000-4000-8000-000000000002";
    record.currentMaterial.returnActionId = "00000000-0000-4000-8000-000000000003";
    record.currentMaterial.transferDueAt = null;
  }
  return record;
}

export function studentCourseFixture() {
  const rule = publishedFixture("prior-courses/rule/frozen");
  return {
    courseId: rule.courseId,
    semester: {
      semesterId: rule.semesterId, academicYear: "2026-2027", termType: "FIRST",
      displayName: "2026-2027 第一学期", startDate: "2026-08-31",
      endDate: "2027-01-15", status: "CURRENT",
    },
    name: "测试课程", description: null,
    responsibleTeacher: { teacherId: "00000000-0000-4000-8000-000000000003", name: "测试教师" },
    checkinOpensAt: "2026-08-31T00:00:00Z", checkinClosesAt: "2027-01-15T15:59:59Z",
    targets: { courseRelatedTargetMinutes: rule.courseRelatedTargetMinutes,
      otherTargetMinutes: rule.otherTargetMinutes, totalTargetMinutes: 1200 },
    publishedRule: rule,
  };
}
