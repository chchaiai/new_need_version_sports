import type {
  OfficialRosterSnapshot,
  OfficialRosterStudent,
} from "./roster-reconciliation-types";

/**
 * Synthetic roster snapshots for the explicit `?mock=teacher` preview only.
 * The real workspace never reads this module as a business data source.
 */
const students: OfficialRosterStudent[] = [
  {
    id: "demo-official-pe-a",
    courseId: "demo-section-pe101-01",
    studentNumber: "TEST2026001",
    name: "测试学生甲",
    gender: "女",
    grade: "2026级",
    major: "传播学",
    administrativeClass: "传播2601",
    courseName: "大学体育（一）",
    sourceRow: 2,
  },
  {
    id: "demo-official-pe-b",
    courseId: "demo-section-pe101-01",
    studentNumber: "TEST2026002",
    name: "测试学生乙",
    gender: "女",
    grade: "2026级",
    major: "计算机科学",
    administrativeClass: "计科2602",
    courseName: "大学体育（一）",
    sourceRow: 3,
  },
  {
    id: "demo-official-pe-d",
    courseId: "demo-section-pe101-01",
    studentNumber: "TEST2026004",
    name: "测试学生丁",
    gender: "未知",
    grade: "2025级",
    major: "数据科学",
    administrativeClass: "数科2501",
    courseName: "大学体育（一）",
    sourceRow: 4,
  },
  {
    id: "demo-official-pe-e",
    courseId: "demo-section-pe101-01",
    studentNumber: "TEST2026005",
    name: "测试学生戊",
    gender: "男",
    grade: "2026级",
    major: "工商管理",
    administrativeClass: "工商2601",
    courseName: "大学体育（一）",
    sourceRow: 5,
  },
  {
    id: "demo-official-badminton-d",
    courseId: "demo-section-badminton-02",
    studentNumber: "TEST2026004",
    name: "测试学生丁",
    gender: "未知",
    grade: "2025级",
    major: "数据科学",
    administrativeClass: "数科2501",
    courseName: "羽毛球基础",
    sourceRow: 2,
  },
  {
    id: "demo-official-badminton-c",
    courseId: "demo-section-badminton-02",
    studentNumber: "TEST2026003",
    name: "测试学生丙",
    gender: "其他",
    grade: "2026级",
    major: "应用经济学",
    administrativeClass: "经管2601",
    courseName: "羽毛球基础",
    sourceRow: 3,
  },
  {
    id: "demo-official-badminton-f",
    courseId: "demo-section-badminton-02",
    studentNumber: "TEST2026006",
    name: "测试学生己",
    gender: "女",
    grade: "2026级",
    major: "金融数学",
    administrativeClass: "金数2601",
    courseName: "羽毛球基础",
    sourceRow: 4,
  },
];

function snapshot(
  courseId: string,
  importedAt: string,
): OfficialRosterSnapshot {
  const rosterStudents = students
    .filter((student) => student.courseId === courseId)
    .map((student) => ({ ...student }));
  return {
    version: {
      id: `demo-roster-${courseId}-v1`,
      courseId,
      versionNumber: 1,
      importedAt,
      totalRows: rosterStudents.length,
      validRows: rosterStudents.length,
      invalidRows: 0,
      duplicatedRows: 0,
      isCurrent: true,
      source: "FILE",
      status: "VALIDATED",
      version: 1,
    },
    students: rosterStudents,
  };
}

export function createInitialMockRosterSnapshots(): OfficialRosterSnapshot[] {
  return [
    snapshot("demo-section-pe101-01", "2026-08-25T09:30:00+08:00"),
    snapshot("demo-section-badminton-02", "2026-08-25T09:45:00+08:00"),
  ];
}
