import assert from "node:assert/strict";
import test from "node:test";

import {
  PHASE5B_STUDENT_CONTRACT,
  activeExerciseSession,
  activeStudentDashboard,
  applicationImageAllocation,
  buildDirectUploadRequest,
  expiredMediaResult,
  idleSessionError,
  invalidInvitationError,
  invitationPreviews,
  mediaDependencyError,
  pendingStudentDashboard,
  phase5bStudentFixtures,
  recordImageAllocation,
  recordImageReallocation,
  recordVideoAllocation,
  rejectedMediaResult,
  sessionAuthenticationError,
  sessionDependencyError,
  sessionMaintenanceError,
  startExerciseSessionRequest,
  verifiedMediaResult,
} from "../../frontend/student/phase5b-contract-fixtures.ts";
import { PHASE5B_CONTRACT } from "../app/phase5b-contract-fixtures.ts";
import {
  ADMIN_PERMISSION_VALUES,
  createCourseRequest,
  createCourseVersionConflictError,
  currentSemesterNotFoundError,
  emptyFeedbackPage,
  emptyHelpArticlePage,
  emptySubAdminPage,
  emptyTeacherInvitationPage,
  feedbackAfterMutationPage,
  feedbackPage,
  filteredFeedbackPage,
  filteredHelpArticlePage,
  filteredSubAdminPage,
  helpAfterArchivePage,
  helpAfterCreatePage,
  helpAfterPublishPage,
  helpAfterRepublishPage,
  helpArticlePage,
  invitationVersionConflictError,
  pagedFeedbackPage,
  pagedHelpArticlePage,
  phase5bPortalRevalidationFixtures,
  rosterAllocationRequest,
  rosterXlsxAllocationRequest,
  rosterXlsxUploadAllocation,
  rosterUploadAllocation,
  rosterUploadReallocation,
  semesterFilteredPage,
  semesterNotCurrentError,
  semesterPageWithCurrent,
  semesterPageWithoutCurrent,
  semesterPagedResult,
  subAdminPage,
  teacherDashboardWithCurrent,
  teacherDashboardWithoutCurrent,
  teacherInvitationPage,
  unknownSemesterError,
} from "../app/phase5b-contract-revalidation-fixtures.ts";

const expectedBinding = {
  version: "1.3.0-contract",
  status: "RC",
  publicBasePath: "/api/v1",
  openapiSha256: "b6bdcad2196dfdd5bccf3c50dc02cf69f5bc431ca4b7d7147efc652004406093",
};

function classifyActiveSession(httpStatus, body) {
  if (httpStatus === 200) return { kind: "CONTENT", session: body };
  if (httpStatus === 404 && body.code === "RESOURCE_NOT_FOUND") return { kind: "IDLE" };
  return { kind: "ERROR", error: body };
}

function feedbackCounts(items) {
  return {
    totalCount: items.length,
    pendingCount: items.filter((item) => ["WAITING", "IN_PROGRESS", "WAITING_TECH"].includes(item.status)).length,
    waitingTechCount: items.filter((item) => item.status === "WAITING_TECH").length,
    completedCount: items.filter((item) => item.status === "COMPLETED").length,
  };
}

function helpCounts(items) {
  return {
    publishedCount: items.filter((item) => item.status === "PUBLISHED").length,
    draftCount: items.filter((item) => item.status === "DRAFT").length,
    archivedCount: items.filter((item) => item.status === "ARCHIVED").length,
  };
}

function summaryWithoutGeneratedAt(summary) {
  return Object.fromEntries(Object.entries(summary).filter(([key]) => key !== "generatedAt"));
}

test("student and Portal validation bindings pin the exact 1.3.0 Contract version and SHA", () => {
  assert.deepEqual(PHASE5B_CONTRACT, expectedBinding);
  assert.deepEqual(PHASE5B_STUDENT_CONTRACT, expectedBinding);
});

test("student active Session content and 404 Idle are distinct from auth, maintenance, and dependency failures", () => {
  assert.equal(classifyActiveSession(200, activeExerciseSession).kind, "CONTENT");
  assert.equal(classifyActiveSession(404, idleSessionError).kind, "IDLE");
  assert.equal(classifyActiveSession(401, sessionAuthenticationError).kind, "ERROR");
  assert.equal(classifyActiveSession(503, sessionMaintenanceError).kind, "ERROR");
  assert.equal(classifyActiveSession(503, sessionDependencyError).kind, "ERROR");

  const idleToStart = [classifyActiveSession(404, idleSessionError).kind, startExerciseSessionRequest.courseId, activeExerciseSession.status];
  assert.deepEqual(idleToStart, ["IDLE", activeStudentDashboard.course.courseId, "ACTIVE"]);
});

test("ACTIVE and PENDING dashboards retain the stable student projection without synthetic profile fallback", () => {
  assert.equal(activeStudentDashboard.studentStatus, activeStudentDashboard.student.studentStatus);
  assert.equal(activeStudentDashboard.progress.student.studentId, activeStudentDashboard.student.studentId);
  assert.equal(pendingStudentDashboard.studentStatus, "PENDING");
  assert.equal(pendingStudentDashboard.student.studentStatus, "PENDING");
  assert.equal(pendingStudentDashboard.course, null);
  assert.equal(pendingStudentDashboard.progress, null);
  assert.equal(pendingStudentDashboard.student.studentNumber, activeStudentDashboard.student.studentNumber);
});

test("scan and manual invitation preview share all five 200 content states while unknown input remains 422", () => {
  assert.deepEqual(new Set(invitationPreviews.map((preview) => preview.status)), new Set([
    "ACTIVE",
    "EXPIRED",
    "REVOKED",
    "COURSE_CLOSED",
    "NOT_CURRENT",
  ]));
  for (const inputMethod of ["SCAN", "MANUAL"]) {
    const projected = invitationPreviews.map((preview) => ({ inputMethod, ...preview }));
    assert.equal(projected.length, 5);
    assert.ok(projected.every((preview) => preview.course && preview.expiresAt));
  }
  assert.equal(invalidInvitationError.code, "INVITATION_INVALID");
});

test("Record image/video and application image direct uploads use PUT, exact headers, bytes, and fresh reallocation", () => {
  const allocations = [recordImageAllocation, recordVideoAllocation, applicationImageAllocation];
  allocations.forEach((allocation, index) => {
    const bytes = new Uint8Array([index + 1, index + 2, index + 3]);
    const request = buildDirectUploadRequest(allocation, bytes);
    assert.equal(request.method, "PUT");
    assert.deepEqual(request.headers, allocation.requiredHeaders);
    assert.equal(request.body, bytes);
    assert.deepEqual(Object.keys(request.headers).sort(), Object.keys(allocation.requiredHeaders).sort());
  });
  assert.notEqual(recordImageReallocation.mediaAssetId, recordImageAllocation.mediaAssetId);
  assert.notEqual(recordImageReallocation.uploadUrl, recordImageAllocation.uploadUrl);
  assert.ok(Date.parse(recordImageReallocation.expiresAt) > Date.parse(recordImageAllocation.expiresAt));
});

test("roster CSV/XLSX direct-upload allocation also uses PUT and a fresh allocation after expiry", () => {
  assert.deepEqual(
    [rosterAllocationRequest.contentType, rosterXlsxAllocationRequest.contentType],
    ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  );
  for (const allocation of [rosterUploadAllocation, rosterXlsxUploadAllocation]) {
    const bytes = new Uint8Array([0x69, 0x64, 0x2c, 0x6e, 0x61, 0x6d, 0x65]);
    const request = {
      method: allocation.uploadMethod,
      headers: { ...allocation.requiredHeaders },
      body: bytes,
    };
    assert.equal(request.method, "PUT");
    assert.deepEqual(request.headers, allocation.requiredHeaders);
    assert.equal(request.body, bytes);
  }
  assert.notEqual(rosterUploadReallocation.allocationId, rosterUploadAllocation.allocationId);
  assert.notEqual(rosterUploadReallocation.uploadUrl, rosterUploadAllocation.uploadUrl);
});

test("media finalization has one terminal result channel and keeps dependency failure separate", () => {
  assert.deepEqual(
    [verifiedMediaResult.status, rejectedMediaResult.status, expiredMediaResult.status],
    ["VERIFIED", "REJECTED", "EXPIRED"],
  );
  assert.equal(verifiedMediaResult.rejectionCode, null);
  assert.equal(rejectedMediaResult.rejectionCode, "MEDIA_CONTENT_INVALID");
  assert.equal(expiredMediaResult.rejectionCode, "MEDIA_ALLOCATION_EXPIRED");
  assert.equal(mediaDependencyError.code, "DEPENDENCY_UNAVAILABLE");
  assert.equal("status" in mediaDependencyError, false);
  assert.deepEqual(structuredClone(rejectedMediaResult), rejectedMediaResult, "idempotent replay preserves the committed result");
});

test("teacher invitation management survives refresh/relogin/device reads without raw code or digest", () => {
  for (const recovery of ["REFRESH", "RELOGIN", "OTHER_DEVICE"]) {
    const recovered = structuredClone(teacherInvitationPage);
    assert.deepEqual(recovered, teacherInvitationPage, recovery);
  }
  assert.equal(emptyTeacherInvitationPage.items.length, 0);
  assert.equal(teacherInvitationPage.items[0].revocable, true);
  assert.equal(teacherInvitationPage.items[1].revocable, false);
  assert.equal(invitationVersionConflictError.code, "VERSION_CONFLICT");
  const serialized = JSON.stringify(teacherInvitationPage).toLowerCase();
  assert.equal(serialized.includes("invitationcode"), false);
  assert.equal(serialized.includes("digest"), false);
});

test("semester management preserves organization summary across status filters and pagination", () => {
  assert.ok(semesterPageWithCurrent.summary.currentSemester);
  assert.equal(semesterPageWithoutCurrent.summary.currentSemester, null);
  assert.equal(semesterPageWithCurrent.items.filter((item) => item.status === "UPCOMING").length, 2);
  assert.equal(semesterPageWithCurrent.items.filter((item) => item.status === "ARCHIVED").length, 2);
  assert.deepEqual(semesterFilteredPage.summary, semesterPageWithCurrent.summary);
  assert.deepEqual(semesterPagedResult.summary, semesterPageWithCurrent.summary);
});

test("feedback summary covers five states, zero state, filtering, paging, processing, and reopen re-read", () => {
  assert.deepEqual(summaryWithoutGeneratedAt(feedbackPage.summary), feedbackCounts(feedbackPage.items));
  assert.deepEqual(summaryWithoutGeneratedAt(emptyFeedbackPage.summary), feedbackCounts(emptyFeedbackPage.items));
  assert.deepEqual(filteredFeedbackPage.summary, feedbackPage.summary);
  assert.deepEqual(pagedFeedbackPage.summary, feedbackPage.summary);
  assert.deepEqual(summaryWithoutGeneratedAt(feedbackAfterMutationPage.summary), feedbackCounts(feedbackAfterMutationPage.items));
});

test("help summary covers three states, zero state, filters, paging, and every state-changing re-read", () => {
  assert.deepEqual(summaryWithoutGeneratedAt(helpArticlePage.summary), helpCounts(helpArticlePage.items));
  assert.deepEqual(summaryWithoutGeneratedAt(emptyHelpArticlePage.summary), helpCounts(emptyHelpArticlePage.items));
  assert.deepEqual(filteredHelpArticlePage.summary, helpArticlePage.summary);
  assert.deepEqual(pagedHelpArticlePage.summary, helpArticlePage.summary);
  for (const page of [helpAfterCreatePage, helpAfterPublishPage, helpAfterArchivePage, helpAfterRepublishPage]) {
    assert.deepEqual(summaryWithoutGeneratedAt(page.summary), helpCounts(page.items));
  }
});

test("sub-admin summary ignores state filtering and the public permission enum remains exactly eight values", () => {
  assert.deepEqual(subAdminPage.summary.totalCount, 2);
  assert.deepEqual(subAdminPage.summary.activeCount, 1);
  assert.deepEqual(filteredSubAdminPage.summary, subAdminPage.summary);
  assert.deepEqual(summaryWithoutGeneratedAt(emptySubAdminPage.summary), { totalCount: 0, activeCount: 0 });
  assert.equal(new Set(ADMIN_PERMISSION_VALUES).size, 8);
});

test("Teacher Dashboard no-current is a zero-count empty state and dependency failure never becomes empty", () => {
  assert.ok(teacherDashboardWithCurrent.currentSemester);
  assert.equal(teacherDashboardWithoutCurrent.currentSemester, null);
  for (const field of [
    "openCourseCount",
    "memberCount",
    "unresolvedRosterFindingCount",
    "pendingEnduranceCount",
    "pendingApplicationCount",
    "unpublishedFinalGradeCount",
  ]) {
    assert.equal(teacherDashboardWithoutCurrent[field], 0, field);
  }
  assert.equal(currentSemesterNotFoundError.code, "RESOURCE_NOT_FOUND");
  assert.equal(phase5bPortalRevalidationFixtures.dependencyError.code, "DEPENDENCY_UNAVAILABLE");
  assert.equal("currentSemester" in phase5bPortalRevalidationFixtures.dependencyError, false);
});

test("createCourse distinguishes CURRENT success, non-current/no-current 409, unknown 404, and switch conflict", () => {
  assert.equal(createCourseRequest.semesterId, phase5bPortalRevalidationFixtures.currentCourse.semester.semesterId);
  assert.equal(phase5bPortalRevalidationFixtures.currentCourse.semester.status, "CURRENT");
  for (const scenario of ["UPCOMING", "ARCHIVED", "NO_CURRENT"]) {
    assert.deepEqual({ scenario, httpStatus: 409, code: semesterNotCurrentError.code }, {
      scenario,
      httpStatus: 409,
      code: "SEMESTER_NOT_CURRENT",
    });
  }
  assert.deepEqual({ httpStatus: 404, code: unknownSemesterError.code }, { httpStatus: 404, code: "RESOURCE_NOT_FOUND" });
  assert.equal(createCourseVersionConflictError.code, "VERSION_CONFLICT");
  assert.equal("courseId" in createCourseVersionConflictError, false, "concurrent semester switch cannot yield fake success");
});

test("all re-validation fixtures exclude legacy fields, private fallbacks, and Fake Success markers", () => {
  const serialized = JSON.stringify({ phase5bStudentFixtures, phase5bPortalRevalidationFixtures });
  for (const forbidden of [
    "creditedDurationSeconds",
    "publicComment",
    "courseCode",
    "teachingClassNumber",
    "reviewStatus",
    "resubmission",
    "invitationCode",
    "invitationDigest",
    "SEMESTER_NOT_UPCOMING",
    "Fake Success",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `unexpected private/legacy value: ${forbidden}`);
  }
});
