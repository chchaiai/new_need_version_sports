"use client";

import { useEffect, useState } from "react";
import { AppSelect } from "./app-select";
import { AdminDialog, AdminField, AdminInlineError } from "./admin-components";
import { adminCopy } from "./admin-i18n";
import { createLimitedReviewGrant, getAiOcrServiceStatus, listLimitedReviewGrants, publishSportTemplate, revokeLimitedReviewGrant, updateAiOcrServiceConfig } from "./admin-service";
import { toUserFacingError } from "./api-client";
import { ErrorPanel } from "./error-panel";
import type { AdminLocale } from "./admin-types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseRecordIds(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SportTemplatePublishDialog({
  locale,
  demo,
  close,
}: {
  locale: AdminLocale;
  demo: boolean;
  close: () => void;
}) {
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState<"30" | "45" | "60">("30");
  const [weekly, setWeekly] = useState<"2" | "3" | "4">("2");
  const [courseMinutes, setCourseMinutes] = useState("600");
  const [otherMinutes, setOtherMinutes] = useState("600");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof toUserFacingError> | string>("");

  const submit = async () => {
    const courseRelatedTargetMinutes = Number(courseMinutes);
    const otherTargetMinutes = Number(otherMinutes);
    if (!name.trim()) {
      setError(adminCopy(locale, "template_name_required"));
      return;
    }
    if (
      !Number.isInteger(courseRelatedTargetMinutes) ||
      courseRelatedTargetMinutes < 0 ||
      courseRelatedTargetMinutes > 1200 ||
      !Number.isInteger(otherTargetMinutes) ||
      otherTargetMinutes < 0 ||
      otherTargetMinutes > 1200
    ) {
      setError(adminCopy(locale, "template_minutes_invalid"));
      return;
    }
    if (demo) {
      setError(adminCopy(locale, "template_demo_blocked"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await publishSportTemplate({
        name: name.trim(),
        minCreditThresholdMinutes: Number(threshold) as 30 | 45 | 60,
        weeklySessionFrequency: Number(weekly) as 2 | 3 | 4,
        courseRelatedTargetMinutes,
        otherTargetMinutes,
      });
      close();
    } catch (nextError) {
      setError(toUserFacingError(nextError, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminDialog
      locale={locale}
      title={adminCopy(locale, "publish_sport_template")}
      description={adminCopy(locale, "template_publish_hint")}
      close={close}
      dirty
      footer={
        <>
          <button className="secondary-button" type="button" onClick={close}>
            {adminCopy(locale, "cancel")}
          </button>
          <button className="primary-button" type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? adminCopy(locale, "processing") : adminCopy(locale, "publish_sport_template")}
          </button>
        </>
      }
    >
      <div className="admin-form-grid two-columns">
        <AdminField locale={locale} label={adminCopy(locale, "template_name")} required className="full-width">
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
        </AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "template_threshold")} required>
          <AppSelect
            label={adminCopy(locale, "template_threshold")}
            value={threshold}
            options={[
              { value: "30", label: "30" },
              { value: "45", label: "45" },
              { value: "60", label: "60" },
            ]}
            onChange={(value) => value && setThreshold(String(value) as "30" | "45" | "60")}
          />
        </AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "template_weekly")} required>
          <AppSelect
            label={adminCopy(locale, "template_weekly")}
            value={weekly}
            options={[
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
            ]}
            onChange={(value) => value && setWeekly(String(value) as "2" | "3" | "4")}
          />
        </AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "template_course_minutes")} required>
          <input type="number" min="0" max="1200" value={courseMinutes} onChange={(event) => setCourseMinutes(event.target.value)} />
        </AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "template_other_minutes")} required>
          <input type="number" min="0" max="1200" value={otherMinutes} onChange={(event) => setOtherMinutes(event.target.value)} />
        </AdminField>
      </div>
      {typeof error === "object" && error ? <ErrorPanel error={error} locale={locale} /> : <AdminInlineError message={typeof error === "string" ? error : ""} />}
    </AdminDialog>
  );
}

export function LimitedReviewGrantDialog({
  locale,
  demo,
  close,
}: {
  locale: AdminLocale;
  demo: boolean;
  close: () => void;
}) {
  const [courseId, setCourseId] = useState("");
  const [granteeTeacherId, setGranteeTeacherId] = useState("");
  const [recordIdsText, setRecordIdsText] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof toUserFacingError> | string>("");

  const submit = async () => {
    const recordIds = parseRecordIds(recordIdsText);
    if (!UUID_PATTERN.test(courseId.trim()) || !UUID_PATTERN.test(granteeTeacherId.trim()) || recordIds.length === 0 || recordIds.some((id) => !UUID_PATTERN.test(id))) {
      setError(adminCopy(locale, "grant_ids_invalid"));
      return;
    }
    if (demo) {
      setError(adminCopy(locale, "grant_demo_blocked"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createLimitedReviewGrant({
        courseId: courseId.trim(),
        granteeTeacherId: granteeTeacherId.trim(),
        recordIds,
        note: note.trim() || null,
      });
      close();
    } catch (nextError) {
      setError(toUserFacingError(nextError, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminDialog
      locale={locale}
      title={adminCopy(locale, "limited_review_grant")}
      description={adminCopy(locale, "grant_publish_hint")}
      close={close}
      dirty
      footer={
        <>
          <button className="secondary-button" type="button" onClick={close}>
            {adminCopy(locale, "cancel")}
          </button>
          <button className="primary-button" type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? adminCopy(locale, "processing") : adminCopy(locale, "limited_review_grant")}
          </button>
        </>
      }
    >
      <div className="admin-form-grid">
        <AdminField locale={locale} label={adminCopy(locale, "grant_course_id")} required>
          <input value={courseId} onChange={(event) => setCourseId(event.target.value)} />
        </AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "grant_teacher_id")} required>
          <input value={granteeTeacherId} onChange={(event) => setGranteeTeacherId(event.target.value)} />
        </AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "grant_record_ids")} required>
          <textarea value={recordIdsText} onChange={(event) => setRecordIdsText(event.target.value)} />
        </AdminField>
        <AdminField locale={locale} label={adminCopy(locale, "note")}>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
        </AdminField>
      </div>
      {typeof error === "object" && error ? <ErrorPanel error={error} locale={locale} /> : <AdminInlineError message={typeof error === "string" ? error : ""} />}
    </AdminDialog>
  );
}

type LimitedReviewGrantItem = {
  grantId: string;
  courseId: string;
  granteeTeacherId: string;
  status: "ACTIVE" | "REVOKED";
  version: number;
  recordIds: readonly string[];
};

export function LimitedReviewGrantListDialog({
  locale,
  demo,
  close,
}: {
  locale: AdminLocale;
  demo: boolean;
  close: () => void;
}) {
  const [items, setItems] = useState<LimitedReviewGrantItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof toUserFacingError> | string>("");

  const load = async () => {
    if (demo) {
      setError(adminCopy(locale, "grant_demo_blocked"));
      setItems([]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const page = await listLimitedReviewGrants() as { items?: LimitedReviewGrantItem[] };
      setItems(Array.isArray(page.items) ? [...page.items] : []);
    } catch (nextError) {
      setItems([]);
      setError(toUserFacingError(nextError, locale));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, [demo, locale]);

  const revoke = async (grant: LimitedReviewGrantItem) => {
    if (demo) {
      setError(adminCopy(locale, "grant_demo_blocked"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await revokeLimitedReviewGrant(grant.grantId, { expectedVersion: grant.version });
      await load();
    } catch (nextError) {
      setError(toUserFacingError(nextError, locale));
      setBusy(false);
    }
  };

  return (
    <AdminDialog
      locale={locale}
      title={adminCopy(locale, "grant_list")}
      description={adminCopy(locale, "grant_list_hint")}
      close={close}
      dirty={false}
      footer={
        <button className="secondary-button" type="button" onClick={close}>
          {adminCopy(locale, "cancel")}
        </button>
      }
    >
      {items.length === 0 ? <p className="admin-quiet-empty">{adminCopy(locale, "grant_list_empty")}</p> : (
        <div className="admin-health-list">
          {items.map((grant) => (
            <div key={grant.grantId}>
              <b translate="no">{grant.grantId}</b>
              <small translate="no">{grant.courseId}</small>
              <span>{grant.status === "ACTIVE" ? adminCopy(locale, "grant_status_active") : adminCopy(locale, "grant_status_revoked")}</span>
              {grant.status === "ACTIVE" ? (
                <button className="text-button" type="button" disabled={busy} onClick={() => void revoke(grant)}>
                  {adminCopy(locale, "grant_revoke")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {typeof error === "object" && error ? <ErrorPanel error={error} locale={locale} /> : <AdminInlineError message={typeof error === "string" ? error : ""} />}
    </AdminDialog>
  );
}

export function AiOcrServiceDialog({
  locale,
  demo,
  close,
}: {
  locale: AdminLocale;
  demo: boolean;
  close: () => void;
}) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [note, setNote] = useState("");
  const [version, setVersion] = useState<number | null>(null);
  const [backlogCount, setBacklogCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof toUserFacingError> | string>("");

  const load = async () => {
    if (demo) {
      setError(adminCopy(locale, "ai_ocr_demo_blocked"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const status = await getAiOcrServiceStatus() as {
        aiEnabled?: boolean;
        ocrEnabled?: boolean;
        note?: string | null;
        version?: number;
        backlogCount?: number;
      };
      setAiEnabled(Boolean(status.aiEnabled));
      setOcrEnabled(Boolean(status.ocrEnabled));
      setNote(status.note ?? "");
      setVersion(typeof status.version === "number" ? status.version : null);
      setBacklogCount(typeof status.backlogCount === "number" ? status.backlogCount : null);
    } catch (nextError) {
      setError(toUserFacingError(nextError, locale));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, [demo, locale]);

  const submit = async () => {
    if (demo) {
      setError(adminCopy(locale, "ai_ocr_demo_blocked"));
      return;
    }
    if (typeof version !== "number") {
      setError(adminCopy(locale, "ai_ocr_hint"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await updateAiOcrServiceConfig({
        aiEnabled,
        ocrEnabled,
        note: note.trim() || null,
        expectedVersion: version,
      }) as { version?: number; backlogCount?: number };
      if (typeof next.version === "number") setVersion(next.version);
      if (typeof next.backlogCount === "number") setBacklogCount(next.backlogCount);
    } catch (nextError) {
      setError(toUserFacingError(nextError, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminDialog
      locale={locale}
      title={adminCopy(locale, "ai_ocr_service")}
      description={adminCopy(locale, "ai_ocr_hint")}
      close={close}
      dirty
      footer={
        <>
          <button className="secondary-button" type="button" onClick={close}>
            {adminCopy(locale, "cancel")}
          </button>
          <button className="primary-button" type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? adminCopy(locale, "processing") : adminCopy(locale, "save")}
          </button>
        </>
      }
    >
      <div className="admin-form-grid">
        <label>
          <input type="checkbox" checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)} />
          {adminCopy(locale, "ai_enabled")}
        </label>
        <label>
          <input type="checkbox" checked={ocrEnabled} onChange={(event) => setOcrEnabled(event.target.checked)} />
          {adminCopy(locale, "ocr_enabled")}
        </label>
        <AdminField locale={locale} label={adminCopy(locale, "note")}>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
        </AdminField>
        <p className="admin-quiet-empty">
          {adminCopy(locale, "ai_ocr_backlog")}: {backlogCount ?? adminCopy(locale, "not_available")}
        </p>
      </div>
      {typeof error === "object" && error ? <ErrorPanel error={error} locale={locale} /> : <AdminInlineError message={typeof error === "string" ? error : ""} />}
    </AdminDialog>
  );
}
