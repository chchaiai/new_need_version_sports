import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceFiles = [
  "app/app-select.tsx",
  "app/checkin-audit.ts",
  "app/layout.tsx",
  "app/page.tsx",
  "app/portal-app.tsx",
  "app/roster-reconciliation.tsx",
  "app/scrollbar-manager.tsx",
  "app/student-profile.tsx",
  "app/teacher-tab-page-transition.tsx",
  "app/teacher-ui.tsx",
  "app/teacher-workspace.tsx",
  "app/use-student-profile.ts",
];

const businessDataLiterals = new Set([
  "赵可心", "何雨桐", "郭思远", "陈若宁", "李欣然", "周子墨", "王致远", "林乐怡", "王嘉宇", "陈昊然", "许嘉宁", "高嘉雯", "吴雨菲",
  "文化与创意学院", "工商管理学院", "理工科技学院", "BNBU 男子篮球校队", "悦跑社", "陈若宁 · T2024007",
  "昨晚校园跑无法提交", "运动完成后页面一直提示网络异常，想咨询是否可以补录。", "免测通过后成绩状态未更新", "免测申请通过后，成绩页仍显示未录入，希望协助核对同步状态。", "已受理，正在核对免测审批记录和成绩同步队列。", "校队认证抵扣如何计算", "想确认校队认证通过后还需完成多少课程运动。", "学生验证码多次验证失败", "学生多次尝试验证码登录后被锁定，请协助检查账号状态。", "已定位到验证码限流规则，正在由技术团队处理。",
  "校园跑", "游泳", "核心力量训练", "骑行", "按校园外圈完成连续跑步。", "完成自由泳与蛙泳练习。", "完成一小时核心力量训练。", "绿道往返骑行。", "右膝半月板术后恢复期", "本学期参加校队常规训练", "日常训练成员",
  "跑步轨迹.jpg", "结束视频.mp4", "泳池凭证.jpg", "训练照片.heic", "骑行记录.png", "医学诊断证明.jpg", "康复建议.png", "在队证明.pdf", "社团证明.jpg", "训练计划.pdf",
  "仅用于本地界面审查的合成课程。", "羽毛球基础", "国庆假期", "测试学生甲", "测试学生乙", "测试学生丙", "测试学生丁", "2026级", "2025级",
  "完成校园环线慢跑与拉伸。", "凭证完整。", "健身训练", "器械训练记录。", "凭证无法证明完整运动过程。", "请重新提交完整运动凭证。", "完成耐力游泳训练。", "完成双打练习。", "免测抵扣", "经批准的其他运动学时抵扣。",
  "本地审查用合成申请。", "合成证明材料.jpg", "测试跑步社", "需要补充训练签到记录。", "合成社团证明.png", "请补充本学期训练签到。", "本地审查用已批准样例。", "合成批准材料.jpg", "合成材料完整。",
  "教", "管", "陈", "生",
]);

function readDictionary(source) {
  const file = ts.createSourceFile("app/language.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const keys = new Map();
  const emptyValues = [];

  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "englishText" && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const property of node.initializer.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const key = ts.isStringLiteralLike(property.name) || ts.isIdentifier(property.name)
          ? property.name.text
          : undefined;
        if (!key) continue;
        const lines = keys.get(key) ?? [];
        lines.push(file.getLineAndCharacterOfPosition(property.getStart(file)).line + 1);
        keys.set(key, lines);
        if (!ts.isStringLiteralLike(property.initializer) || !property.initializer.text.trim()) emptyValues.push(key);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  return { keys, emptyValues };
}

function isRuntimeFormatted(value) {
  return /^(今天|昨天) \d{1,2}:\d{2}(?::\d{2})?$/.test(value)
    || /^\d+ 小时前$/.test(value)
    || /^\d+ 天前$/.test(value)
    || /^\d{1,2}月\d{1,2}日$/.test(value)
    || /^\d{2}班$/.test(value);
}

test("keeps translation resources unique and covers all static system text", async () => {
  const language = await readFile(new URL("../app/language.tsx", import.meta.url), "utf8");
  const { keys: dictionary, emptyValues } = readDictionary(language);
  const normalizedDictionary = new Set(
    [...dictionary.keys()].map((key) => key.replace(/\s+/g, " ").trim()),
  );
  const duplicateKeys = [...dictionary].filter(([, lines]) => lines.length > 1);

  assert.equal(duplicateKeys.length, 0, `Duplicate i18n keys: ${duplicateKeys.map(([key]) => key).join(", ")}`);
  assert.deepEqual(emptyValues, [], `Missing English translations: ${emptyValues.join(", ")}`);
  assert.ok(dictionary.size >= 800, "Expected the application-wide English resource coverage to stay comprehensive.");

  const unmapped = [];
  for (const filename of sourceFiles) {
    const source = await readFile(new URL(`../${filename}`, import.meta.url), "utf8");
    const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function inspect(value, node) {
      const text = value.replace(/\s+/g, " ").trim();
      if (!text || !/[\p{Script=Han}]/u.test(text)) return;
      if (normalizedDictionary.has(text) || businessDataLiterals.has(text) || isRuntimeFormatted(text)) return;
      const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
      unmapped.push(`${filename}:${line + 1} ${text}`);
    }

    function visit(node) {
      if (ts.isStringLiteralLike(node)) inspect(node.text, node);
      if (ts.isJsxText(node)) inspect(node.text, node);
      ts.forEachChild(node, visit);
    }

    visit(file);
  }

  assert.deepEqual(unmapped, []);
});

test("keeps portals, accessibility attributes, enum labels, and reverse switching in the i18n boundary", async () => {
  const [language, adminI18n, adminWorkspace, select, ui, profile, portal, workspace] = await Promise.all([
    readFile(new URL("../app/language.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin-i18n.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app-select.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/teacher-ui.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/student-profile.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/portal-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/teacher-workspace.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(language, /\[aria-label\], \[placeholder\], \[title\], \[alt\]/);
  assert.match(language, /function translateToChinese/);
  assert.match(language, /function formatIsoDateTime/);
  assert.match(language, /const statusSourceLabels/);
  assert.match(language, /"BNBU 校园体育": "BNBU CAMPUS SPORTS"/);
  assert.match(language, /有效: "Valid"/);
  assert.match(language, /跑步: "Running"/);
  assert.match(language, /\^打开\(\.\*\)的用户信息\$/);
  assert.match(language, /record\$\{count === "1" \? "" : "s"\}/);
  assert.match(select, /querySelector<HTMLElement>\("\.localized-content"\) \?\? document\.body/);
  assert.match(ui, /querySelector<HTMLElement>\("\.localized-content"\) \?\? document\.body/);
  assert.match(profile, /querySelector<HTMLElement>\("\.localized-content"\) \?\? document\.body/);
  assert.match(portal, /adminLabel\(locale, "systemMode", adminContext\.systemMode\)/);
  assert.match(
    portal,
    /locale === "en"[\s\S]*?`Open \$\{displayUser\.name\}'s profile`/,
  );
  assert.match(adminI18n, /PENDING: \["已退班", "Withdrawn"\]/);
  assert.doesNotMatch(adminI18n, /READ_ONLY: \["只读模式", "Read-only mode"\]/);
  assert.match(adminWorkspace, /className="admin-i18n-boundary"/);
  assert.doesNotMatch(adminWorkspace, /className="admin-i18n-boundary"\s+translate="no"/);
  assert.match(workspace, /valid: statusLabel\("valid", "audit"\)/);
  assert.match(workspace, /invalid: statusLabel\("invalid", "audit"\)/);
  assert.doesNotMatch(workspace, /pending: statusLabel\("pending", "audit"\)/);
  assert.match(workspace, /function membershipStatusLabel/);
  assert.doesNotMatch(workspace, /statusLabel\([^\n]+"enrollment"/);
  assert.doesNotMatch(language, /enrollment: \{ PENDING:/);
  assert.doesNotMatch(portal, /BEIJING NORMAL · HONG KONG BAPTIST UNIVERSITY/);
  assert.doesNotMatch(portal, /How to submit a sports check-in\?/);
  const sportsBrand = portal.match(/function SportsBrand\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(language, /closest\('\[translate="no"\]'\)/);
  assert.match(sportsBrand, /translate="no"/);
  assert.match(sportsBrand, /aria-label="SPORTS"/);
  assert.match(sportsBrand, />\s*SPORTS\s*</);
  assert.doesNotMatch(sportsBrand, /体育/);
});
