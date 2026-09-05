// Empty runtime state for the real student workspace.

export function emptyWorkspace() {
  return {
    student: { id: "", name: "", email: "", college: "", className: "", status: "PENDING", gender: "", gradeLevel: "", admissionYear: null, currentAcademicYear: "", gradeCalculatedAt: "", accountStatus: "ACTIVE" },
    courses: [],
    progress: { id: "", name: "", college: "", className: "", course: 0, general: 0, rawCourse: 0, rawGeneral: 0, totalValidHours: 0, exam: 0, attendance: 0, physical: 0, status: "请先登录", source: "empty", organizationCredit: null },
    hourRule: { total: 20.0, courseRequired: 10.0, generalRequired: 10.0, dailyLimit: 2.0 },
    records: [],
    grades: { studentId: "", studentName: "", visibleBlocks: [], totalScore: null, totalDisplay: "未开放", isPassed: null, courseGradeStatus: "rules_not_published", displayConfigVersion: 0, sourceTrace: "", enduranceRunTimeSeconds: null, enduranceRunStatus: "not_recorded", enduranceRunScore: null },
    memberships: [],
    notices: [],
    teachers: [],
    exemptions: [],
    checkInTimeWindow: { windowMode: "unavailable", dateRangeStart: null, dateRangeEnd: null, dailyStartTime: "", dailyEndTime: "", excludedDates: [], semesterDeadline: null },
    courseJoinRequest: null,
    proofTodos: [],
    creditPolicy: null,
  };
}

export function hourText(value) {
  const n = Number(value) || 0;
  return n % 1 === 0 ? `${n}h` : `${n.toFixed(1)}h`;
}
