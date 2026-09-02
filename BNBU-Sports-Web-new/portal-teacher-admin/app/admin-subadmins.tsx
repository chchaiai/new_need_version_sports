"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminLocale, AdminRoute } from "./admin-types";
import type { WorkspaceMode } from "./portal-app";
import {
  AdminBadge,
  AdminConfirm,
  AdminDialog,
  AdminEmpty,
  AdminField,
  AdminSectionHeading,
  formatAdminDate,
} from "./admin-components";

const STORAGE_KEY = "bnbu-admin-subadmins-v1";

const permissionOptions: ReadonlyArray<{
  id: AdminRoute;
  zh: string;
  en: string;
  zhDescription: string;
  enDescription: string;
  risk: "standard" | "high";
}> = [
  { id: "courses", zh: "课程查看", en: "Course viewing", zhDescription: "只读查看课程、学生和打卡汇总", enDescription: "Read-only course, student and check-in summaries", risk: "standard" },
  { id: "semesters", zh: "学期管理", en: "Semester management", zhDescription: "创建、修改、切换和归档学期", enDescription: "Create, update, switch and archive semesters", risk: "high" },
  { id: "accounts", zh: "用户与账号", en: "Users and accounts", zhDescription: "管理教师和普通用户账号", enDescription: "Manage teacher and ordinary user accounts", risk: "standard" },
  { id: "support", zh: "学生问题反馈", en: "Student issue feedback", zhDescription: "受理、回复、转交和关闭反馈", enDescription: "Triage, reply, transfer and close feedback", risk: "standard" },
  { id: "rules", zh: "全局规则", en: "Global rules", zhDescription: "维护运动计分与换算规则", enDescription: "Maintain sport scoring and conversion rules", risk: "high" },
  { id: "system", zh: "系统模式", en: "System mode", zhDescription: "切换正常、只读和维护状态", enDescription: "Switch normal, read-only and maintenance modes", risk: "high" },
  { id: "help", zh: "帮助中心", en: "Help center", zhDescription: "编辑和发布帮助内容", enDescription: "Edit and publish help content", risk: "standard" },
  { id: "audit", zh: "审计查询", en: "Audit queries", zhDescription: "只读查询管理员操作记录", enDescription: "Read-only administrator activity queries", risk: "standard" },
];

const permissionIds = new Set(permissionOptions.map((item) => item.id));

const permissionTemplates: ReadonlyArray<{
  id: string;
  zh: string;
  en: string;
  zhDescription: string;
  enDescription: string;
  permissions: AdminRoute[];
}> = [
  { id: "student-service", zh: "学生服务", en: "Student services", zhDescription: "处理反馈并维护帮助内容", enDescription: "Handle feedback and maintain help content", permissions: ["support", "help", "audit"] },
  { id: "academic-operations", zh: "教务运营", en: "Academic operations", zhDescription: "查看课程并管理学期与普通账号", enDescription: "View courses and manage semesters and accounts", permissions: ["courses", "semesters", "accounts"] },
  { id: "rules-and-system", zh: "规则与系统", en: "Rules and system", zhDescription: "维护规则、系统状态与审计记录", enDescription: "Maintain rules, system mode and audit records", permissions: ["rules", "system", "audit"] },
  { id: "readonly-review", zh: "只读核查", en: "Read-only review", zhDescription: "查看课程与审计记录", enDescription: "Review courses and audit records", permissions: ["courses", "audit"] },
];

type StoredSubAdmin = {
  id: string;
  account: string;
  name: string;
  email: string;
  department: string;
  passwordSalt: string;
  passwordVerifier: string;
  permissions: AdminRoute[];
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
};

type EditorBase = {
  account: string;
  name: string;
  email: string;
  department: string;
  permissions: AdminRoute[];
};

type CreateEditorState = EditorBase & {
  mode: "create";
  initialPassword: string;
  confirmInitialPassword: string;
};

type UpdateEditorState = EditorBase & {
  mode: "update";
  id: string;
};

type EditorState = CreateEditorState | UpdateEditorState;

const emptyEditor = (): CreateEditorState => ({
  mode: "create",
  account: "",
  name: "",
  email: "",
  department: "",
  initialPassword: "",
  confirmInitialPassword: "",
  permissions: [],
});

function readStoredAccounts(): StoredSubAdmin[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const accounts: StoredSubAdmin[] = [];
    parsed.forEach((item) => {
      if (!item || typeof item !== "object") return false;
      const value = item as Partial<StoredSubAdmin>;
      const valid = (
        typeof value.id === "string" &&
        typeof value.account === "string" &&
        typeof value.name === "string" &&
        typeof value.passwordSalt === "string" &&
        typeof value.passwordVerifier === "string" &&
        Array.isArray(value.permissions) &&
        (value.status === "ACTIVE" || value.status === "DISABLED") &&
        typeof value.createdAt === "string" &&
        typeof value.updatedAt === "string"
      );
      if (!valid) return;
      accounts.push({
        id: value.id as string,
        account: value.account as string,
        name: value.name as string,
        email: typeof value.email === "string" ? value.email : "",
        department: typeof value.department === "string" ? value.department : "",
        passwordSalt: value.passwordSalt as string,
        passwordVerifier: value.passwordVerifier as string,
        permissions: (value.permissions as AdminRoute[]).filter((permission) => permissionIds.has(permission)),
        status: value.status as "ACTIVE" | "DISABLED",
        createdAt: value.createdAt as string,
        updatedAt: value.updatedAt as string,
      });
    });
    return accounts;
  } catch {
    return [];
  }
}

function persistAccounts(accounts: StoredSubAdmin[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return window.btoa(binary);
}

async function createPasswordVerifier(password: string) {
  if (!window.crypto?.subtle) throw new Error("CRYPTO_UNAVAILABLE");
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const material = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: 210_000,
    },
    material,
    256,
  );
  return {
    passwordSalt: toBase64(salt),
    passwordVerifier: toBase64(new Uint8Array(bits)),
  };
}

export function AdminSubadmins({ locale, mode }: { locale: AdminLocale; mode: WorkspaceMode }) {
  const [accounts, setAccounts] = useState<StoredSubAdmin[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<StoredSubAdmin | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAccounts(mode === "demo" ? readStoredAccounts() : []);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeCount = useMemo(
    () => accounts.filter((account) => account.status === "ACTIVE").length,
    [accounts],
  );
  const editorDirty = useMemo(() => {
    if (!editor) return false;
    if (editor.mode === "create") {
      return Boolean(
        editor.account ||
        editor.name ||
        editor.email ||
        editor.department ||
        editor.initialPassword ||
        editor.confirmInitialPassword ||
        editor.permissions.length !== 0
      );
    }
    const original = accounts.find((account) => account.id === editor.id);
    if (!original) return true;
    return Boolean(
      editor.account !== original.account ||
      editor.name !== original.name ||
      editor.email !== original.email ||
      editor.department !== original.department ||
      editor.permissions.length !== original.permissions.length ||
      editor.permissions.some((permission, index) => permission !== original.permissions[index])
    );
  }, [accounts, editor]);

  const selectedPermissionDetails = useMemo(
    () => permissionOptions.filter((permission) => editor?.permissions.includes(permission.id)),
    [editor],
  );
  const selectedHighRiskPermissions = selectedPermissionDetails.filter((permission) => permission.risk === "high");

  const labelForPermission = (permission: AdminRoute) => {
    const option = permissionOptions.find((item) => item.id === permission);
    return locale === "en" ? option?.en : option?.zh;
  };

  const openCreate = () => {
    if (mode !== "demo") return;
    setError("");
    setShowPassword(false);
    setNotice("");
    setEditor(emptyEditor());
  };

  const openEdit = (account: StoredSubAdmin) => {
    setError("");
    setShowPassword(false);
    setEditor({
      mode: "update",
      id: account.id,
      account: account.account,
      name: account.name,
      email: account.email,
      department: account.department,
      permissions: [...account.permissions],
    });
  };

  const updateEditor = <K extends keyof EditorState>(
    key: K,
    value: EditorState[K],
  ) => {
    setEditor((current) => (current ? { ...current, [key]: value } : current));
    setError("");
  };

  const updateCreatePassword = (
    key: "initialPassword" | "confirmInitialPassword",
    value: string,
  ) => {
    setEditor((current) => current?.mode === "create" ? { ...current, [key]: value } : current);
    setError("");
  };

  const togglePermission = (permission: AdminRoute) => {
    if (!editor) return;
    updateEditor(
      "permissions",
      editor.permissions.includes(permission)
        ? editor.permissions.filter((item) => item !== permission)
        : [...editor.permissions, permission],
    );
  };

  const applyTemplate = (permissions: AdminRoute[]) => {
    updateEditor("permissions", [...permissions]);
  };

  const save = async () => {
    if (!editor || busy) return;
    if (mode !== "demo") {
      setError(locale === "en" ? "The server-side administrator API is not available." : "服务端分管理员接口尚未开放。");
      return;
    }
    const account = editor.account.trim();
    const name = editor.name.trim();
    const email = editor.email.trim();
    const department = editor.department.trim();
    const isCreate = editor.mode === "create";
    const editingId = editor.mode === "update" ? editor.id : undefined;
    if (!account || !name || !email) {
      setError(locale === "en" ? "Account, name and university email are required." : "账号、姓名和学校邮箱均为必填项。");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(locale === "en" ? "Enter a valid university email address." : "请输入有效的学校邮箱地址。");
      return;
    }
    if (
      accounts.some(
        (item) =>
          item.id !== editingId &&
          item.account.toLocaleLowerCase() === account.toLocaleLowerCase(),
      )
    ) {
      setError(locale === "en" ? "This account already exists." : "该分管理员账号已经存在。");
      return;
    }
    if (
      accounts.some(
        (item) => item.id !== editingId && item.email.toLocaleLowerCase() === email.toLocaleLowerCase(),
      )
    ) {
      setError(locale === "en" ? "This university email is already in use." : "该学校邮箱已绑定其他分管理员。");
      return;
    }
    if (editor.permissions.length === 0) {
      setError(locale === "en" ? "Select at least one permission." : "请至少选择一个可用权限。");
      return;
    }
    if (editor.mode === "create" && !editor.initialPassword) {
      setError(locale === "en" ? "Set an initial password." : "请设置初始密码。");
      return;
    }
    if (
      editor.mode === "create" &&
      editor.initialPassword !== editor.confirmInitialPassword
    ) {
      setError(locale === "en" ? "The passwords do not match." : "两次输入的密码不一致。");
      return;
    }

    setBusy(true);
    try {
      const now = new Date().toISOString();
      const credential = editor.mode === "create"
        ? await createPasswordVerifier(editor.initialPassword)
        : null;
      const next = editor.mode === "update"
        ? accounts.map((item) =>
            item.id === editor.id
              ? {
                  ...item,
                  account,
                  name,
                  email,
                  department,
                  permissions: [...editor.permissions],
                  updatedAt: now,
                }
              : item,
          )
        : [
            ...accounts,
            {
              id: window.crypto.randomUUID(),
              account,
              name,
              email,
              department,
              permissions: [...editor.permissions],
              status: "ACTIVE" as const,
              createdAt: now,
              updatedAt: now,
              ...(credential as {
                passwordSalt: string;
                passwordVerifier: string;
              }),
            },
          ];
      persistAccounts(next);
      setAccounts(next);
      setEditor(null);
      setNotice(locale === "en" ? (isCreate ? "Created" : "Updated") : (isCreate ? "创建成功" : "更新成功"));
    } catch {
      setError(
        locale === "en"
          ? "This browser could not securely save the preview configuration."
          : "当前浏览器无法安全保存此预览配置。",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = (id: string) => {
    if (mode !== "demo") return;
    const now = new Date().toISOString();
    const next = accounts.map((item) =>
      item.id === id
        ? {
            ...item,
            status: item.status === "ACTIVE" ? ("DISABLED" as const) : ("ACTIVE" as const),
            updatedAt: now,
          }
        : item,
    );
    try {
      persistAccounts(next);
      setAccounts(next);
      setError("");
    } catch {
      setError(locale === "en" ? "Unable to save the status." : "无法保存账号状态。");
    }
  };

  const deleteAccount = () => {
    if (!deleteCandidate || mode !== "demo") return;
    const next = accounts.filter((item) => item.id !== deleteCandidate.id);
    try {
      persistAccounts(next);
      setAccounts(next);
      setDeleteCandidate(null);
      setError("");
      setNotice(locale === "en" ? "Deleted" : "删除成功");
    } catch {
      setError(locale === "en" ? "Unable to delete this preview account." : "无法删除该预览账号。");
    }
  };

  return (
    <div className="admin-page-stack admin-subadmins-page">
      {mode === "real" && (
        <aside className="admin-readonly-banner" role="note">
          <span aria-hidden="true">API</span>
          <b>{locale === "en"
            ? "The server-side sub-administrator API is not available. This page will not save browser-only accounts as real administrators."
            : "服务端分管理员接口尚未开放；正式模式不会把浏览器本地账号冒充真实管理员。"}</b>
        </aside>
      )}

      <section className="admin-summary-grid admin-subadmin-summary">
        <div>
          <span>{locale === "en" ? "Sub-administrators" : "分管理员总数"}</span>
          <b>{accounts.length}</b>
        </div>
        <div>
          <span>{locale === "en" ? "Active" : "已启用"}</span>
          <b>{activeCount}</b>
        </div>
        <div>
          <span>{locale === "en" ? "Assignable permissions" : "可分配业务权限"}</span>
          <b>{permissionOptions.length}</b>
        </div>
      </section>

      <section className="admin-surface admin-table-surface">
        <AdminSectionHeading
          title={locale === "en" ? "Sub-administrator accounts" : "分管理员账号"}
          description={
            locale === "en"
              ? "Create an independent account and assign only the business responsibilities it needs."
              : "创建独立账号，并且只分配该管理员实际需要的业务职责。"
          }
          action={
            <div className="admin-subadmin-heading-actions">
              {notice ? (
                <span className="admin-subadmin-feedback" role="status">
                  <span aria-hidden="true">✓</span>
                  {notice}
                </span>
              ) : null}
              <button className="primary-button" type="button" disabled={mode !== "demo"} onClick={openCreate}>
                {locale === "en" ? "Add sub-administrator" : "新增分管理员"}
              </button>
            </div>
          }
        />
        {error && !editor ? <p className="admin-inline-error">{error}</p> : null}
        {accounts.length === 0 ? (
          <AdminEmpty locale={locale} />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{locale === "en" ? "Administrator" : "管理员身份"}</th>
                  <th>{locale === "en" ? "Department" : "所属部门"}</th>
                  <th>{locale === "en" ? "Responsibilities" : "业务权限"}</th>
                  <th>{locale === "en" ? "Status" : "状态"}</th>
                  <th>{locale === "en" ? "Updated" : "更新时间"}</th>
                  <th>{locale === "en" ? "Actions" : "操作"}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <b>{account.name}</b>
                      <small className="table-sub"><code>{account.account}</code> · {account.email || (locale === "en" ? "Email not completed" : "邮箱待补充")}</small>
                    </td>
                    <td>{account.department || (locale === "en" ? "Not specified" : "未填写")}</td>
                    <td>
                      <b>{account.permissions.length}</b>
                      <small className="table-sub">
                        {account.permissions.map(labelForPermission).filter(Boolean).join("、")}
                      </small>
                    </td>
                    <td>
                      <AdminBadge tone={account.status === "ACTIVE" ? "green" : "gray"}>
                        {account.status === "ACTIVE"
                          ? locale === "en" ? "Active" : "启用"
                          : locale === "en" ? "Disabled" : "停用"}
                      </AdminBadge>
                    </td>
                    <td>{formatAdminDate(locale, account.updatedAt, true)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => openEdit(account)}>
                          {locale === "en" ? "Edit" : "编辑"}
                        </button>
                        <button type="button" onClick={() => toggleStatus(account.id)}>
                          {account.status === "ACTIVE"
                            ? locale === "en" ? "Disable" : "停用"
                            : locale === "en" ? "Enable" : "启用"}
                        </button>
                        <button className="is-danger" type="button" onClick={() => setDeleteCandidate(account)}>
                          {locale === "en" ? "Delete" : "删除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteCandidate && (
        <AdminConfirm
          locale={locale}
          title={locale === "en" ? "Delete sub-administrator" : "删除分管理员"}
          description={locale === "en" ? "Confirm the exact account before removing it." : "请先核对准确账号，再确认删除。"}
          close={() => setDeleteCandidate(null)}
          confirm={deleteAccount}
          confirmLabel={locale === "en" ? "Delete account" : "确认删除"}
          danger
        >
          <div className="admin-subadmin-delete-confirmation">
            <div className="admin-confirm-object">
              <b>{deleteCandidate.name}</b>
              <code>{deleteCandidate.account}</code>
              <span>{deleteCandidate.email}</span>
            </div>
            <p>
              {locale === "en"
                ? "This removes the account from the current Mock preview. In a real system, completed business and audit history must remain available."
                : "删除后，该账号会从当前 Mock 预览中移除。正式系统仍必须保留已完成的业务记录和审计历史。"}
            </p>
          </div>
        </AdminConfirm>
      )}

      {editor && (
        <AdminDialog
          locale={locale}
          title={editor.mode === "update"
            ? locale === "en" ? "Edit sub-administrator" : "编辑分管理员"
            : locale === "en" ? "Add sub-administrator" : "新增分管理员"}
          description={
            editor.mode === "create"
              ? locale === "en"
                ? "Assign a temporary initial credential and least-privilege responsibilities."
                : "分配临时初始凭据，并按最小必要原则设置业务职责。"
              : locale === "en"
                ? "Update profile and responsibilities only; personal passwords are not editable here."
                : "仅更新资料和业务职责；此处不提供个人密码编辑。"
          }
          close={() => setEditor(null)}
          dirty={editorDirty}
          wide
          footer={
            <>
              <button className="secondary-button" type="button" onClick={() => setEditor(null)}>
                {locale === "en" ? "Cancel" : "取消"}
              </button>
              <button className="primary-button" type="button" disabled={busy} onClick={() => void save()}>
                {busy
                  ? locale === "en" ? "Saving…" : "保存中…"
                  : editor.mode === "update"
                    ? locale === "en" ? "Save changes" : "保存更改"
                    : locale === "en" ? "Create sub-administrator" : "创建分管理员"}
              </button>
            </>
          }
        >
          <div className="admin-subadmin-editor-layout">
            <div className="admin-subadmin-editor-main">
              <section className="admin-subadmin-editor-section">
                <header><span>1</span><div><h3>{locale === "en" ? "Account details" : "基本资料"}</h3><p>{locale === "en" ? "Identify the administrator and keep a verified university email for recovery." : "确认管理员身份，并保留学校邮箱用于身份核验与找回。"}</p></div></header>
                <div className="admin-form-grid two-columns">
                  <AdminField locale={locale} label={locale === "en" ? "Account" : "账号"} required hint={editor.mode === "update" ? (locale === "en" ? "The account cannot be changed after creation." : "账号创建后不可修改。") : undefined}>
                    <input
                      autoComplete="off"
                      disabled={editor.mode === "update"}
                      value={editor.account}
                      onChange={(event) => updateEditor("account", event.target.value)}
                    />
                  </AdminField>
                  <AdminField locale={locale} label={locale === "en" ? "Name" : "姓名"} required>
                    <input autoComplete="name" value={editor.name} onChange={(event) => updateEditor("name", event.target.value)} />
                  </AdminField>
                  <AdminField locale={locale} label={locale === "en" ? "University email" : "学校邮箱"} required>
                    <input type="email" autoComplete="email" value={editor.email} onChange={(event) => updateEditor("email", event.target.value)} />
                  </AdminField>
                  <AdminField locale={locale} label={locale === "en" ? "Department" : "所属部门"} hint={locale === "en" ? "Optional; used for account filtering." : "选填，用于后续筛选管理员。"}>
                    <input autoComplete="organization" value={editor.department} onChange={(event) => updateEditor("department", event.target.value)} />
                  </AdminField>
                </div>
              </section>

              {editor.mode === "create" ? (
                <section className="admin-subadmin-editor-section">
                  <header><span>2</span><div><h3>{locale === "en" ? "Temporary initial password" : "临时初始密码"}</h3><p>{locale === "en" ? "Only a non-empty password and matching confirmation are required. The new administrator must change it at first sign-in." : "只要求非空且两次输入一致；新管理员首次登录后必须先修改本人临时密码。"}</p></div></header>
                  <div className="admin-form-grid two-columns">
                    <AdminField locale={locale} label={locale === "en" ? "Initial password" : "初始密码"} required>
                      <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={editor.initialPassword} onChange={(event) => updateCreatePassword("initialPassword", event.target.value)} />
                    </AdminField>
                    <AdminField locale={locale} label={locale === "en" ? "Confirm initial password" : "确认初始密码"} required>
                      <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={editor.confirmInitialPassword} onChange={(event) => updateCreatePassword("confirmInitialPassword", event.target.value)} />
                    </AdminField>
                  </div>
                  <label className="admin-password-toggle">
                    <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
                    <b>{locale === "en" ? "Show the temporary password" : "显示临时密码"}</b>
                  </label>
                </section>
              ) : (
                <aside className="admin-overview-permission-note" role="note">
                  <b>{locale === "en" ? "Personal password excluded" : "个人密码不在编辑范围"}</b>
                  <span>{locale === "en" ? "The account holder changes or resets their own password. This update sends profile, permissions, and version only." : "账号本人通过本人改密或邮箱自助重置；本次更新只发送资料、权限和版本。"}</span>
                </aside>
              )}

              <section className="admin-permission-editor admin-subadmin-editor-section">
                <header><span>{editor.mode === "create" ? "3" : "2"}</span><div><h3>{locale === "en" ? "Business responsibilities" : "业务权限"}</h3><p>{locale === "en" ? "Start from a responsibility template or customize the minimum permissions needed." : "可以从职责模板开始，再按最小必要原则调整权限。"}</p></div></header>
                <aside className="admin-overview-permission-note" role="note">
                  <b>{locale === "en" ? "System overview is automatically available" : "系统概览自动可见"}</b>
                  <span>{locale === "en" ? "Sub-administrator settings can never be delegated." : "“分管理员设置”始终不能下放。"}</span>
                </aside>
                <div className="admin-permission-templates" aria-label={locale === "en" ? "Responsibility templates" : "职责模板"}>
                  {permissionTemplates.map((template) => (
                    <button type="button" key={template.id} onClick={() => applyTemplate(template.permissions)}>
                      <b>{locale === "en" ? template.en : template.zh}</b>
                      <small>{locale === "en" ? template.enDescription : template.zhDescription}</small>
                    </button>
                  ))}
                </div>
                <div className="admin-permission-editor-toolbar">
                  <b>{locale === "en" ? "Custom permissions" : "自定义权限"}</b>
                  <button type="button" onClick={() => updateEditor("permissions", [])}>{locale === "en" ? "Clear" : "清空"}</button>
                </div>
                <div className="admin-permission-grid">
                  {permissionOptions.map((permission) => {
                    const selected = editor.permissions.includes(permission.id);
                    return (
                      <button className={selected ? "selected" : ""} type="button" key={permission.id} aria-pressed={selected} onClick={() => togglePermission(permission.id)}>
                        <span>{locale === "en" ? permission.en : permission.zh}</span>
                        <small>{locale === "en" ? permission.enDescription : permission.zhDescription}</small>
                        {permission.risk === "high" ? <em>{locale === "en" ? "High risk" : "高风险"}</em> : null}
                        <b aria-hidden="true">{selected ? "✓" : "+"}</b>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="admin-subadmin-confirmation" aria-label={locale === "en" ? "Creation summary" : "创建确认"}>
              <span className="admin-confirmation-step">{editor.mode === "create" ? "4" : "3"}</span>
              <p>{editor.mode === "create" ? (locale === "en" ? "Creation confirmation" : "创建确认") : (locale === "en" ? "Update confirmation" : "更新确认")}</p>
              <h3>{editor.name.trim() || (locale === "en" ? "Unnamed administrator" : "待填写姓名")}</h3>
              <dl>
                <div><dt>{locale === "en" ? "Account" : "账号"}</dt><dd><code>{editor.account.trim() || "—"}</code></dd></div>
                <div><dt>{locale === "en" ? "University email" : "学校邮箱"}</dt><dd>{editor.email.trim() || "—"}</dd></div>
                <div><dt>{locale === "en" ? "Department" : "所属部门"}</dt><dd>{editor.department.trim() || (locale === "en" ? "Not specified" : "未填写")}</dd></div>
                {editor.mode === "create" ? <div><dt>{locale === "en" ? "Temporary password" : "临时密码"}</dt><dd>{editor.initialPassword ? (locale === "en" ? "Entered · first-change required" : "已填写 · 首次登录必须修改") : (locale === "en" ? "Not entered" : "未填写")}</dd></div> : null}
              </dl>
              <div className="admin-confirmation-permissions">
                <b>{locale === "en" ? `${selectedPermissionDetails.length} responsibilities` : `${selectedPermissionDetails.length} 项业务权限`}</b>
                {selectedPermissionDetails.length ? selectedPermissionDetails.map((permission) => <span key={permission.id}>{locale === "en" ? permission.en : permission.zh}</span>) : <small>{locale === "en" ? "Select at least one responsibility." : "请至少选择一项业务权限。"}</small>}
              </div>
              {selectedHighRiskPermissions.length ? (
                <div className="admin-confirmation-risk" role="note">
                  <b>{locale === "en" ? "High-risk permissions included" : "包含高风险权限"}</b>
                  <span>{selectedHighRiskPermissions.map((permission) => locale === "en" ? permission.en : permission.zh).join("、")}</span>
                </div>
              ) : null}
              <small className="admin-confirmation-boundary">{editor.mode === "create" ? (locale === "en" ? "The assigned password is temporary and mustChangePassword starts true." : "分配的是临时密码，mustChangePassword 初始为 true。") : (locale === "en" ? "UpdateSubAdminRequest contains no password or credential field." : "UpdateSubAdminRequest 不包含密码或凭据字段。")}</small>
            </aside>
          </div>
          {error ? <p className="admin-inline-error" role="alert">{error}</p> : null}
        </AdminDialog>
      )}
    </div>
  );
}
