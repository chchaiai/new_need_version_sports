import { makeId } from "./admin-domain";
import type {
  AdminState,
  AdminUser,
  EnduranceRule,
  GradeGroup,
  HelpArticle,
  RunType,
  SupportTicket,
} from "./admin-types";

const createdAt = "2026-02-20T09:00:00.000Z";

function user(
  input: Omit<AdminUser, "id" | "tokenVersion" | "createdAt" | "updatedAt"> & {
    id: string;
  },
): AdminUser {
  return {
    tokenVersion: 0,
    createdAt,
    updatedAt: "2026-07-29T08:30:00.000Z",
    ...input,
  };
}

const users: AdminUser[] = [
  user({
    id: "admin-001",
    account: "A2026001",
    email: "admin@bnbu.edu.cn",
    role: "admin",
    name: "系统管理员",
    college: "信息技术中心",
    status: "ACTIVE",
    assignedCourseCount: 0,
  }),
  user({
    id: "teacher-001",
    account: "T2024007",
    email: "ruoning.chen@bnbu.edu.cn",
    role: "teacher",
    name: "陈若宁",
    college: "体育部",
    status: "ACTIVE",
    assignedCourseCount: 3,
  }),
  user({
    id: "teacher-002",
    account: "T2023012",
    email: "zhiyuan.wang@bnbu.edu.cn",
    role: "teacher",
    name: "王致远",
    college: "体育部",
    status: "RECOVERY_REQUIRED",
    assignedCourseCount: 2,
  }),
  user({
    id: "teacher-003",
    account: "T2025003",
    email: "yao.lin@bnbu.edu.cn",
    role: "teacher",
    name: "林瑶",
    college: "体育部",
    status: "ACTIVE",
    assignedCourseCount: 1,
  }),
  user({
    id: "teacher-004",
    account: "T2022008",
    email: "ming.zhao@bnbu.edu.cn",
    role: "teacher",
    name: "赵明",
    college: "体育部",
    status: "DISABLED",
    assignedCourseCount: 0,
  }),
  user({
    id: "student-001",
    account: "2024110247",
    email: "2024110247@mail.bnbu.edu.cn",
    role: "student",
    name: "李欣然",
    college: "文化与创意学院",
    className: "文创2402",
    gender: "female",
    gradeLevel: "sophomore",
    admissionYear: 2024,
    status: "ACTIVE",
    assignedCourseCount: 0,
  }),
  user({
    id: "student-002",
    account: "2024110831",
    email: "2024110831@mail.bnbu.edu.cn",
    role: "student",
    name: "周子墨",
    college: "工商管理学院",
    className: "工商2404",
    gender: "male",
    gradeLevel: "sophomore",
    admissionYear: 2024,
    status: "ACTIVE",
    assignedCourseCount: 0,
    verificationLock: {
      failedAttempts: 5,
      lockedUntil: "2026-07-31T18:15:00.000Z",
    },
  }),
  user({
    id: "student-003",
    account: "2024110512",
    email: "2024110512@mail.bnbu.edu.cn",
    role: "student",
    name: "林乐怡",
    college: "理工科技学院",
    className: "理工2401",
    gender: "female",
    gradeLevel: "sophomore",
    admissionYear: 2024,
    status: "PENDING",
    assignedCourseCount: 0,
  }),
  user({
    id: "student-004",
    account: "2024110261",
    email: "2024110261@mail.bnbu.edu.cn",
    role: "student",
    name: "赵可心",
    college: "文化与创意学院",
    className: "文创2401",
    gender: "female",
    gradeLevel: "sophomore",
    admissionYear: 2024,
    status: "PENDING",
    assignedCourseCount: 0,
  }),
  user({
    id: "student-005",
    account: "2024110335",
    email: "2024110335@mail.bnbu.edu.cn",
    role: "student",
    name: "何雨桐",
    college: "工商管理学院",
    className: "工商2402",
    gender: "female",
    gradeLevel: "sophomore",
    admissionYear: 2024,
    status: "ACTIVE",
    assignedCourseCount: 0,
  }),
  user({
    id: "student-006",
    account: "2023110724",
    email: "2023110724@mail.bnbu.edu.cn",
    role: "student",
    name: "郭思远",
    college: "理工科技学院",
    className: "理工2303",
    gender: "male",
    gradeLevel: "junior",
    admissionYear: 2023,
    status: "ACTIVE",
    assignedCourseCount: 0,
  }),
  user({
    id: "student-007",
    account: "2024110618",
    email: "2024110618@mail.bnbu.edu.cn",
    role: "student",
    name: "吴雨菲",
    college: "理工科技学院",
    className: "理工2403",
    gender: "female",
    gradeLevel: "sophomore",
    admissionYear: 2024,
    status: "PENDING",
    assignedCourseCount: 0,
  }),
  user({
    id: "student-008",
    account: "2023110472",
    email: "2023110472@mail.bnbu.edu.cn",
    role: "student",
    name: "王嘉宇",
    college: "工商管理学院",
    className: "工商2301",
    gender: "male",
    gradeLevel: "junior",
    admissionYear: 2023,
    status: "ACTIVE",
    assignedCourseCount: 0,
  }),
  user({
    id: "student-009",
    account: "2025110103",
    email: "2025110103@mail.bnbu.edu.cn",
    role: "student",
    name: "高嘉雯",
    college: "文化与创意学院",
    className: "文创2501",
    gender: "female",
    gradeLevel: "freshman",
    admissionYear: 2025,
    status: "ACTIVE",
    assignedCourseCount: 0,
    verificationLock: {
      failedAttempts: 5,
      lockedUntil: "2026-07-31T19:30:00.000Z",
    },
  }),
];

function enduranceRules(): EnduranceRule[] {
  const tables: Array<{
    gender: "male" | "female";
    gradeGroup: GradeGroup;
    runType: RunType;
    offset: number;
  }> = [
    {
      gender: "male",
      gradeGroup: "freshman_sophomore",
      runType: "1000m",
      offset: 0,
    },
    {
      gender: "male",
      gradeGroup: "junior_senior",
      runType: "1000m",
      offset: 10,
    },
    {
      gender: "female",
      gradeGroup: "freshman_sophomore",
      runType: "800m",
      offset: -10,
    },
    {
      gender: "female",
      gradeGroup: "junior_senior",
      runType: "800m",
      offset: 0,
    },
  ];
  const result: EnduranceRule[] = [];
  tables.forEach((table, tableIndex) => {
    const fullScoreMaximum = 239 + table.offset;
    for (let score = 100; score >= 0; score -= 1) {
      const scoreOffset = 100 - score;
      const min = score === 100
        ? 0
        : fullScoreMaximum + 1 + (scoreOffset - 1) * 3;
      const max = score === 100
        ? fullScoreMaximum
        : score === 0
          ? 600
          : min + 2;
      const tier: EnduranceRule["tier"] = score >= 95
        ? "excellent"
        : score >= 92
          ? "good"
          : score >= 60
            ? "pass"
            : "fail";
      result.push({
        id: `rule-${tableIndex + 1}-${scoreOffset + 1}`,
        gender: table.gender,
        gradeGroup: table.gradeGroup,
        runType: table.runType,
        minSeconds: min,
        maxSeconds: max,
        score,
        tier,
        note: score === 100 ? "国家学生体质健康标准满分区间" : "",
        updatedAt: "2026-07-18T03:12:00.000Z",
      });
    }
  });
  return result;
}

const helpArticles: HelpArticle[] = [
  {
    id: "HA-001",
    titleZh: "如何提交运动打卡？",
    titleEn: "How do I submit an activity check-in?",
    bodyZh:
      "进入打卡页，确认当前课程与时间窗，完成运动后上传至少一份凭证并提交。",
    bodyEn:
      "Open Check-in, confirm the class and time window, then upload at least one item of evidence after the activity and submit.",
    keywords: ["打卡", "check-in", "凭证", "evidence"],
    category: "checkin",
    status: "published",
    sortWeight: 100,
    publishedAt: "2026-03-02T08:00:00.000Z",
    updatedAt: "2026-07-24T09:10:00.000Z",
  },
  {
    id: "HA-002",
    titleZh: "验证码连续输错后怎么办？",
    titleEn: "What happens after repeated verification-code failures?",
    bodyZh:
      "连续输错 5 次后账号锁定 15 分钟。可以等待自动解锁，或联系管理员核验后提前解锁。",
    bodyEn:
      "After five consecutive failures, the account is locked for 15 minutes. Wait for automatic unlock or contact an administrator for verified early unlock.",
    keywords: ["验证码", "锁定", "verification code", "locked"],
    category: "login",
    status: "published",
    sortWeight: 90,
    publishedAt: "2026-03-05T08:00:00.000Z",
    updatedAt: "2026-07-21T02:20:00.000Z",
  },
  {
    id: "HA-003",
    titleZh: "如何申请耐力跑免测？",
    titleEn: "How do I apply for an endurance-run exemption?",
    bodyZh: "在申请页选择耐力跑免测，按要求提交医学材料并等待授课教师审核。",
    bodyEn:
      "Choose Endurance-run exemption under Applications, provide the required medical documents, and wait for your teacher's review.",
    keywords: ["免测", "医学材料", "exemption", "medical"],
    category: "exemption",
    status: "published",
    sortWeight: 80,
    publishedAt: "2026-04-12T08:00:00.000Z",
    updatedAt: "2026-07-20T06:10:00.000Z",
  },
  {
    id: "HA-004",
    titleZh: "维护期间的未提交运动会丢失吗？",
    titleEn: "Will an unsubmitted activity be lost during maintenance?",
    bodyZh: "不会。计时结果保留在本地，系统恢复写入后可继续提交。",
    bodyEn:
      "No. The timing result remains on the device and can be submitted after write access is restored.",
    keywords: ["维护", "草稿", "maintenance", "draft"],
    category: "maintenance",
    status: "draft",
    sortWeight: 70,
    updatedAt: "2026-07-28T04:00:00.000Z",
  },
  {
    id: "HA-005",
    titleZh: "校队或社团认证如何抵扣学时？",
    titleEn: "How does team or club verification offset credits?",
    bodyZh:
      "认证通过后，由授课教师根据课程规则分配课程运动或自主运动抵扣学时。",
    bodyEn:
      "After verification, the teacher allocates the offset to course activity or independent activity according to the class rules.",
    keywords: ["校队", "社团", "抵扣", "team", "club", "offset"],
    category: "organization",
    status: "archived",
    sortWeight: 60,
    publishedAt: "2026-03-18T08:00:00.000Z",
    updatedAt: "2026-07-18T08:00:00.000Z",
  },
  {
    id: "HA-006",
    titleZh: "如何扫码或使用邀请码加入课程？",
    titleEn: "How do I join a class with a QR code or invitation code?",
    bodyZh:
      "扫描授课教师展示的课程二维码后，请先核对课程名称、班级、教师和学期，再填写姓名、学号、性别和年级并确认加入。服务端校验成功后会立即建立有效课程成员关系并进入学生首页，无需等待教师审核。无法扫码时，可在学生端输入邀请码；二维码过期或被撤销时，请向教师获取新的邀请。",
    bodyEn:
      "After scanning the class QR code shown by your teacher, confirm the course, section, teacher, and semester, then enter your name, student ID, gender, and grade. Successful server validation creates an active membership immediately and opens the student home screen without teacher approval. If scanning is unavailable, enter the invitation code in the student app; ask for a new invitation if the code has expired or been revoked.",
    keywords: [
      "扫码",
      "二维码",
      "邀请码",
      "加入课程",
      "QR code",
      "invitation code",
      "join class",
    ],
    category: "enrollment",
    status: "published",
    sortWeight: 95,
    publishedAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-02T08:00:00.000Z",
  },
];

const tickets: SupportTicket[] = [
  {
    id: "SR-82914",
    requester: "赵可心",
    account: "2024110261",
    category: "BUG",
    subject: "昨晚校园跑无法提交",
    content: "运动完成后页面一直提示网络异常，想咨询是否可以补录。",
    source: "student",
    submittedAt: "2026-07-31T10:05:00.000Z",
    status: "pending",
    replies: [],
  },
  {
    id: "SR-82913",
    requester: "何雨桐",
    account: "2024110335",
    category: "BUG",
    subject: "免测通过后成绩状态未更新",
    content: "免测申请通过后，成绩页仍显示未录入，希望协助核对同步状态。",
    source: "student",
    submittedAt: "2026-07-30T15:20:00.000Z",
    status: "in_progress",
    replies: [
      {
        id: "reply-1",
        author: "系统管理员",
        message: "已受理，正在核对免测审批记录和成绩同步队列。",
        createdAt: "2026-07-30T16:10:00.000Z",
      },
    ],
  },
  {
    id: "SR-82909",
    requester: "郭思远",
    account: "2023110724",
    category: "SUGGESTION",
    subject: "校队认证抵扣如何计算",
    content: "想确认校队认证通过后还需完成多少课程运动。",
    source: "student",
    submittedAt: "2026-07-30T11:08:00.000Z",
    status: "pending",
    replies: [],
  },
  {
    id: "SR-82902",
    requester: "陈若宁",
    account: "T2024007",
    category: "BUG",
    subject: "学生验证码多次验证失败",
    content: "学生多次尝试验证码登录后被锁定，请协助检查账号状态。",
    source: "teacher",
    submittedAt: "2026-07-27T16:42:00.000Z",
    status: "technical",
    replies: [
      {
        id: "reply-2",
        author: "系统管理员",
        message: "已定位到验证码限流规则，正在由技术团队处理。",
        createdAt: "2026-07-27T17:30:00.000Z",
      },
    ],
  },
];

export function createInitialAdminState(): AdminState {
  return {
    schemaVersion: 2,
    revision: 1,
    currentAdminId: "admin-001",
    semesters: [
      {
        id: "semester-2026-2",
        name: "2025-2026 第二学期",
        academicYear: "2025-2026",
        term: "second",
        startDate: "2026-02-23",
        endDate: "2026-07-31",
        status: "current",
        courseCount: 3,
        studentCount: 126,
        updatedAt: "2026-02-20T09:00:00.000Z",
      },
      {
        id: "semester-2026-summer",
        name: "2025-2026 暑期学期",
        academicYear: "2025-2026",
        term: "summer",
        startDate: "2026-07-20",
        endDate: "2026-08-28",
        status: "upcoming",
        courseCount: 0,
        studentCount: 0,
        updatedAt: "2026-07-12T05:00:00.000Z",
      },
      {
        id: "semester-2027-1",
        name: "2026-2027 第一学期",
        academicYear: "2026-2027",
        term: "first",
        startDate: "2026-09-07",
        endDate: "2027-01-15",
        status: "upcoming",
        courseCount: 0,
        studentCount: 0,
        updatedAt: "2026-07-24T03:00:00.000Z",
      },
      {
        id: "semester-2026-1",
        name: "2025-2026 第一学期",
        academicYear: "2025-2026",
        term: "first",
        startDate: "2025-09-08",
        endDate: "2026-01-16",
        status: "archived",
        courseCount: 6,
        studentCount: 242,
        updatedAt: "2026-01-20T02:00:00.000Z",
      },
      {
        id: "semester-2025-2",
        name: "2024-2025 第二学期",
        academicYear: "2024-2025",
        term: "second",
        startDate: "2025-02-24",
        endDate: "2025-07-25",
        status: "archived",
        courseCount: 7,
        studentCount: 281,
        updatedAt: "2025-07-28T02:00:00.000Z",
      },
    ],
    users,
    recoveryRequests: [
      {
        id: "REC-1007",
        userId: "student-004",
        requestedEmail: "kexin.zhao@outlook.com",
        requestedPhone: "+86 138 0000 2610",
        submittedAt: "2026-07-31T08:14:00.000Z",
        status: "pending",
      },
      {
        id: "REC-1006",
        userId: "student-007",
        requestedEmail: "yufei.wu@gmail.com",
        submittedAt: "2026-07-30T13:32:00.000Z",
        status: "pending",
      },
      {
        id: "REC-1002",
        userId: "student-003",
        requestedEmail: "leyi.lin@example.com",
        submittedAt: "2026-07-22T09:18:00.000Z",
        status: "rejected",
        reviewedAt: "2026-07-23T03:20:00.000Z",
        verificationMethod: "视频核验",
        reviewReason: "证件信息无法匹配",
      },
    ],
    enduranceRules: enduranceRules(),
    systemMode: {
      mode: "NORMAL",
      reason: "计划维护结束，恢复全部服务",
      changedAt: "2026-07-18T03:12:00.000Z",
      changedBy: "系统管理员",
    },
    maintenanceAnnouncements: [
      {
        id: "ANN-20260718",
        kind: "recovery",
        titleZh: "系统服务已恢复",
        titleEn: "Service restored",
        messageZh: "计划维护已完成，全部功能恢复正常。",
        messageEn:
          "Scheduled maintenance is complete and all features are available.",
        startsAt: "2026-07-18T03:12:00.000Z",
        publishedAt: "2026-07-18T03:12:00.000Z",
        publishedBy: "系统管理员",
      },
    ],
    helpArticles,
    auditLogs: [
      {
        id: "AL-1279",
        actorId: "admin-001",
        actorName: "系统管理员",
        action: "system_mode.change",
        resourceType: "system",
        resourceId: "global",
        requestId: "req_admin_82741",
        metadata: {
          before: "MAINTENANCE",
          after: "NORMAL",
          reason: "计划维护结束，恢复全部服务",
          announcementId: "notice-1",
        },
        createdAt: "2026-07-18T03:12:00.000Z",
      },
      {
        id: "AL-1278",
        actorId: "admin-001",
        actorName: "系统管理员",
        action: "system_mode.change",
        resourceType: "system",
        resourceId: "global",
        requestId: "req_admin_82740",
        metadata: {
          before: "NORMAL",
          after: "MAINTENANCE",
          reason: "发布维护公告后进入计划维护",
          announcementId: "notice-1",
        },
        createdAt: "2026-07-18T02:45:00.000Z",
      },
      {
        id: "AL-1284",
        actorId: "admin-001",
        actorName: "系统管理员",
        action: "user.unlock_vcode",
        resourceType: "user",
        resourceId: "2024110831",
        requestId: "req_admin_82931",
        metadata: { before: "locked", after: "active", reason: "身份核验通过" },
        createdAt: "2026-07-31T09:31:22.000Z",
      },
      {
        id: "AL-1283",
        actorId: "teacher-001",
        actorName: "陈若宁",
        action: "record.adjust",
        resourceType: "record",
        resourceId: "SR-82914",
        requestId: "req_teacher_82920",
        metadata: {
          beforeMinutes: 120,
          afterMinutes: 90,
          reason: "暂停时间未扣除",
        },
        createdAt: "2026-07-31T08:55:07.000Z",
      },
      {
        id: "AL-1282",
        actorId: "admin-001",
        actorName: "系统管理员",
        action: "help_article.publish",
        resourceType: "help_article",
        resourceId: "HA-003",
        requestId: "req_admin_82842",
        metadata: { before: "draft", after: "published" },
        createdAt: "2026-07-30T17:42:36.000Z",
      },
      {
        id: "AL-1281",
        actorId: "teacher-001",
        actorName: "陈若宁",
        action: "exemption.approve",
        resourceType: "exemption",
        resourceId: "EX-1058",
        requestId: "req_teacher_82791",
        metadata: { before: "pending", after: "approved" },
        createdAt: "2026-07-30T16:18:03.000Z",
      },
    ],
    tickets,
    gradeCorrections: [
      {
        id: "GCR-204",
        teacherId: "teacher-001",
        teacherName: "陈若宁",
        semesterId: "semester-2026-1",
        courseName: "大学体育（一）· 04班",
        studentAccount: "2024110247",
        reason: "原耐力跑成绩录入时分钟与秒数颠倒",
        status: "pending",
        submittedAt: "2026-07-30T07:50:00.000Z",
      },
      {
        id: "GCR-199",
        teacherId: "teacher-003",
        teacherName: "林瑶",
        semesterId: "semester-2026-1",
        courseName: "羽毛球 · 02班",
        studentAccount: "2024110831",
        reason: "复核后确认原始成绩缺少一次有效打卡",
        status: "corrected",
        submittedAt: "2026-07-25T06:20:00.000Z",
        reviewedAt: "2026-07-26T03:10:00.000Z",
        reviewReason: "材料完整，临时开放至修正完成",
      },
    ],
    notifications: [
      {
        id: "notice-1",
        kind: "maintenance",
        audience: "all",
        title: "系统服务已恢复",
        message: "计划维护已完成，全部功能恢复正常。",
        createdAt: "2026-07-18T03:12:00.000Z",
      },
    ],
    health: {
      apiStatus: "UP",
      apiLatencyMs: 38,
      databaseStatus: "UP",
      databaseLatencyMs: 12,
      notificationQueueStatus: "UP",
      notificationBacklog: 0,
      objectStorageStatus: "UP",
      objectStorageLatencyMs: 18,
      mediaStorageStatus: "UP",
      mediaStorageLatencyMs: 21,
      checkedAt: "2026-07-31T09:40:00.000Z",
      requestId: "demo-health-request",
      status: "UP",
    },
  };
}

export function cloneInitialAdminState() {
  const state = createInitialAdminState();
  state.auditLogs = state.auditLogs.map((log) => ({
    ...log,
    id: log.id || makeId("AL"),
  }));
  return state;
}
