"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { AppSelect } from "./app-select";
import { enduranceTableKey, validateEnduranceTable } from "./admin-domain";
import { adminCopy, adminLabel } from "./admin-i18n";
import {
  deleteEnduranceRule,
  saveEnduranceRule,
} from "./admin-service";
import { LimitedReviewGrantDialog, SportTemplatePublishDialog } from "./admin-v8-governance";
import { useAdminStore } from "./admin-store";
import type { AdminLocale, EnduranceRule, EnduranceRuleInput, EnduranceTier, Gender, GradeGroup, RunType } from "./admin-types";
import { AdminBadge, AdminConfirm, AdminDialog, AdminEmpty, AdminField, AdminInlineError, AdminSectionHeading } from "./admin-components";
import { ErrorPanel } from "./error-panel";

function RuleDialog({ locale, tableKey, rule, close }: { locale: AdminLocale; tableKey: string; rule?: EnduranceRule; close: () => void }) {
  const { state, busyKey, error, clearError, run } = useAdminStore();
  const tableRules = state?.enduranceRules.filter((item) => enduranceTableKey(item) === tableKey).sort((left, right) => left.maxSeconds - right.maxSeconds) ?? [];
  const [gender, gradeGroup, runType] = tableKey.split(":") as [Gender, GradeGroup, RunType];
  const last = tableRules.at(-1);
  const initial: EnduranceRuleInput = rule ? { ...rule } : {
    gender, gradeGroup, runType,
    minSeconds: (last?.maxSeconds ?? -1) + 1,
    maxSeconds: (last?.maxSeconds ?? -1) + 30,
    score: Math.max(0, (last?.score ?? 60) - 10),
    tier: "fail",
    note: "",
  };
  const [form, setForm] = useState<EnduranceRuleInput>(initial);
  const key = `endurance.${rule ? "update" : "create"}.${rule?.id ?? tableKey}`;
  useEffect(() => () => clearError(), [clearError]);
  const update = <K extends keyof EnduranceRuleInput>(field: K, value: EnduranceRuleInput[K]) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async () => {
    const result = await run(key, () => saveEnduranceRule(form), adminCopy(locale, "rule_saved"));
    if (result) close();
  };
  return (
    <AdminDialog locale={locale} title={adminCopy(locale, rule ? "edit_rule" : "add_rule")} close={close} dirty={JSON.stringify(form) !== JSON.stringify(initial)} footer={<>
      <button className="secondary-button" type="button" onClick={close}>{adminCopy(locale, "cancel")}</button>
      <button className="primary-button" type="button" disabled={busyKey === key} onClick={() => void submit()}>{busyKey === key ? adminCopy(locale, "processing") : adminCopy(locale, "save")}</button>
    </>}>
      <div className="admin-form-grid two-columns">
        <AdminField locale={locale} label={adminCopy(locale, "min_seconds")} required><input type="number" min="0" value={form.minSeconds} onChange={(event) => update("minSeconds", Number(event.target.value))} /></AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "max_seconds")} required><input type="number" min="0" value={form.maxSeconds} onChange={(event) => update("maxSeconds", Number(event.target.value))} /></AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "score")} required><input type="number" min="0" max="100" value={form.score} onChange={(event) => update("score", Number(event.target.value))} /></AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "tier")} required><AppSelect label={adminCopy(locale, "tier")} value={form.tier} options={(["excellent", "good", "pass", "fail"] as EnduranceTier[]).map((value) => ({ value, label: adminLabel(locale, "enduranceTier", value) }))} onChange={(value) => value && update("tier", value as EnduranceTier)} /></AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "note")} className="full-width"><textarea value={form.note} onChange={(event) => update("note", event.target.value)} /></AdminField>
      </div>
      {error?.userFacingError
        ? <ErrorPanel error={error.userFacingError} locale={locale} />
        : <AdminInlineError message={error?.message} />}
    </AdminDialog>
  );
}

function EndurancePanel({ locale }: { locale: AdminLocale }) {
  const { state, busyKey, error, run, mode } = useAdminStore();
  const tableOptions = [
    { gender: "male" as const, gradeGroup: "freshman_sophomore" as const, runType: "1000m" as const },
    { gender: "male" as const, gradeGroup: "junior_senior" as const, runType: "1000m" as const },
    { gender: "female" as const, gradeGroup: "freshman_sophomore" as const, runType: "800m" as const },
    { gender: "female" as const, gradeGroup: "junior_senior" as const, runType: "800m" as const },
  ];
  const [tableKey, setTableKey] = useState(enduranceTableKey(tableOptions[0]));
  const [editing, setEditing] = useState<EnduranceRule | "new" | null>(null);
  const [deleting, setDeleting] = useState<EnduranceRule | null>(null);
  const [publishingTemplate, setPublishingTemplate] = useState(false);
  const [grantingReview, setGrantingReview] = useState(false);
  if (!state) return null;
  const rules = state.enduranceRules.filter((rule) => enduranceTableKey(rule) === tableKey).sort((left, right) => left.minSeconds - right.minSeconds);
  const issues = validateEnduranceTable(rules);
  const optionLabel = (item: typeof tableOptions[number]) => `${adminLabel(locale, "gender", item.gender)} · ${adminLabel(locale, "gradeGroup", item.gradeGroup)} · ${item.runType}`;
  const deleteKey = deleting ? `endurance.delete.${deleting.id}` : "";
  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await run(deleteKey, () => deleteEnduranceRule(deleting.id), adminCopy(locale, "rule_deleted"));
    if (result) setDeleting(null);
  };
  return (
    <section className="admin-surface admin-table-surface">
      <AdminSectionHeading title={adminCopy(locale, "endurance_table")} description={adminCopy(locale, "rules_scope_hint")} action={<div className="admin-subadmin-heading-actions"><button className="secondary-button" type="button" onClick={() => setPublishingTemplate(true)}>{adminCopy(locale, "publish_sport_template")}</button><button className="secondary-button" type="button" onClick={() => setGrantingReview(true)}>{adminCopy(locale, "limited_review_grant")}</button><button className="primary-button" type="button" onClick={() => setEditing("new")}>{adminCopy(locale, "add_rule")}</button></div>} />
      <div className="admin-filter-row"><AppSelect label={adminCopy(locale, "table_selection")} value={tableKey} options={tableOptions.map((item) => ({ value: enduranceTableKey(item), label: optionLabel(item) }))} onChange={(value) => value && setTableKey(String(value))} /><AdminBadge tone={issues.length ? "red" : "green"}>{issues.length ? adminCopy(locale, "table_invalid", { count: issues.length }) : adminCopy(locale, "table_valid")}</AdminBadge></div>
      {rules.length === 0 ? <AdminEmpty locale={locale} /> : <>
        <div className="table-wrap endurance-table-wrap"><table className="admin-table"><thead><tr><th>{adminCopy(locale, "min_seconds")}</th><th>{adminCopy(locale, "max_seconds")}</th><th>{adminCopy(locale, "score")}</th><th>{adminCopy(locale, "tier")}</th><th>{adminCopy(locale, "note")}</th><th>{adminCopy(locale, "actions")}</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td>{rule.minSeconds}</td><td>{rule.maxSeconds}</td><td><b>{rule.score}</b></td><td><AdminBadge tone={rule.tier === "fail" ? "red" : rule.tier === "pass" ? "orange" : "green"}>{adminLabel(locale, "enduranceTier", rule.tier)}</AdminBadge></td><td>{rule.note || adminCopy(locale, "not_available")}</td><td><div className="admin-row-actions"><button type="button" onClick={() => setEditing(rule)}>{adminCopy(locale, "edit")}</button><button className="is-danger" type="button" onClick={() => setDeleting(rule)}>{adminCopy(locale, "delete")}</button></div></td></tr>)}</tbody></table></div>
        <div className="endurance-table-more" aria-hidden="true"><ChevronDown />{adminCopy(locale, "scroll_more")}</div>
      </>}
      {error?.userFacingError
        ? <ErrorPanel error={error.userFacingError} locale={locale} />
        : <AdminInlineError message={error?.message} />}
      {editing && <RuleDialog locale={locale} tableKey={tableKey} rule={editing === "new" ? undefined : editing} close={() => setEditing(null)} />}
      {deleting && <AdminConfirm locale={locale} title={adminCopy(locale, "delete_rule_title")} description={adminCopy(locale, "delete_rule_body")} close={() => setDeleting(null)} confirm={() => void confirmDelete()} confirmLabel={adminCopy(locale, "delete")} busy={busyKey === deleteKey} danger><div className="admin-confirm-object"><b>{adminCopy(locale, "seconds_range", { min: deleting.minSeconds, max: deleting.maxSeconds })}</b><span>{deleting.score} · {adminLabel(locale, "enduranceTier", deleting.tier)}</span></div></AdminConfirm>}
      {publishingTemplate && <SportTemplatePublishDialog locale={locale} demo={mode === "demo"} close={() => setPublishingTemplate(false)} />}
      {grantingReview && <LimitedReviewGrantDialog locale={locale} demo={mode === "demo"} close={() => setGrantingReview(false)} />}
    </section>
  );
}

export function AdminRules({ locale }: { locale: AdminLocale }) {
  return (
    <div className="admin-page-stack">
      <EndurancePanel locale={locale} />
    </div>
  );
}
