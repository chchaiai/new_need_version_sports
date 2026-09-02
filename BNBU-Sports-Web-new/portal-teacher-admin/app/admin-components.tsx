"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { adminCopy, adminErrorCopy } from "./admin-i18n";
import type { AdminLocale } from "./admin-types";
import { BUSINESS_TIME_ZONE } from "./business-time";
import { FormField } from "./form-field";

export type AdminTone = "blue" | "green" | "orange" | "red" | "gray";

export function AdminBadge({ children, tone = "blue" }: { children: ReactNode; tone?: AdminTone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function AdminLoading({ locale }: { locale: AdminLocale }) {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-spinner" aria-hidden="true" />
      <p>{adminCopy(locale, "loading")}</p>
      <div className="admin-skeleton-grid" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}

export function AdminLoadError({ locale, message, retry }: { locale: AdminLocale; message: string; retry: () => void }) {
  return (
    <div className="admin-empty-state is-error" role="alert">
      <span aria-hidden="true">!</span>
      <h2>{adminCopy(locale, "load_error")}</h2>
      <p>{message}</p>
      <button className="primary-button" type="button" onClick={retry}>{adminCopy(locale, "retry")}</button>
    </div>
  );
}

export function AdminEmpty({ locale, filtered = false }: { locale: AdminLocale; filtered?: boolean }) {
  return (
    <div className="admin-empty-state">
      <span aria-hidden="true">⌕</span>
      <h3>{adminCopy(locale, filtered ? "no_results" : "empty")}</h3>
      {filtered && <p>{adminCopy(locale, "no_results_hint")}</p>}
    </div>
  );
}

export function AdminPagination({
  locale,
  page,
  totalPages,
  total,
  onPage,
}: {
  locale: AdminLocale;
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="admin-pagination">
      <span>{adminCopy(locale, "pagination", { page, pages: totalPages, total })}</span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>{adminCopy(locale, "previous")}</button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{adminCopy(locale, "next")}</button>
      </div>
    </div>
  );
}

export function AdminField({
  locale,
  label,
  required = false,
  errorCode,
  error,
  hint,
  children,
  className = "",
}: {
  locale: AdminLocale;
  label: string;
  required?: boolean;
  errorCode?: string;
  error?: ReactNode;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <FormField
      className={`admin-field ${className}`.trim()}
      label={label}
      required={required}
      hint={hint}
      error={error ?? (errorCode ? adminErrorCopy(locale, errorCode) : undefined)}
    >
      {children}
    </FormField>
  );
}

export function AdminDialog({
  locale,
  title,
  description,
  close,
  children,
  footer,
  dirty = false,
  wide = false,
}: {
  locale: AdminLocale;
  title: string;
  description?: string;
  close: () => void;
  children: ReactNode;
  footer: ReactNode;
  dirty?: boolean;
  wide?: boolean;
}) {
  const titleId = useId();
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const requestClose = () => dirty ? setDiscardPrompt(true) : close();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (discardPrompt) setDiscardPrompt(false);
      else requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="modal-backdrop admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section className={`modal admin-dialog ${wide ? "is-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal-head">
          <div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div>
          <button className="icon-button" type="button" aria-label={adminCopy(locale, "close")} onClick={requestClose}>×</button>
        </header>
        <div className="admin-dialog-body">{children}</div>
        <footer className="modal-footer">{footer}</footer>
      </section>
      {discardPrompt && (
        <section className="admin-discard-dialog" role="alertdialog" aria-modal="true">
          <h3>{adminCopy(locale, "unsaved_title")}</h3>
          <p>{adminCopy(locale, "unsaved_body")}</p>
          <div>
            <button className="secondary-button" type="button" onClick={() => setDiscardPrompt(false)}>{adminCopy(locale, "cancel")}</button>
            <button className="danger-button" type="button" onClick={close}>{adminCopy(locale, "discard")}</button>
          </div>
        </section>
      )}
    </div>
  );
}

export function AdminDrawer({
  locale,
  title,
  description,
  close,
  children,
  footer,
}: {
  locale: AdminLocale;
  title: string;
  description?: string;
  close: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);
  return (
    <div className="admin-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <aside className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div>
          <button className="icon-button" type="button" aria-label={adminCopy(locale, "close")} onClick={close}>×</button>
        </header>
        <div className="admin-drawer-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </div>
  );
}

export function AdminConfirm({
  locale,
  title,
  description,
  close,
  confirm,
  confirmLabel,
  busy = false,
  danger = false,
  children,
}: {
  locale: AdminLocale;
  title: string;
  description: string;
  close: () => void;
  confirm: () => void;
  confirmLabel?: string;
  busy?: boolean;
  danger?: boolean;
  children?: ReactNode;
}) {
  return (
    <AdminDialog
      locale={locale}
      title={title}
      description={description}
      close={close}
      footer={<>
        <button className="secondary-button" type="button" onClick={close} disabled={busy}>{adminCopy(locale, "cancel")}</button>
        <button className={danger ? "danger-button" : "primary-button"} type="button" onClick={confirm} disabled={busy}>{busy ? adminCopy(locale, "processing") : confirmLabel ?? adminCopy(locale, "confirm")}</button>
      </>}
    >{children}</AdminDialog>
  );
}

export function AdminInlineError({ message }: { message?: string }) {
  return message ? <p className="admin-inline-error" role="alert">{message}</p> : null;
}

export function AdminSectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="admin-section-heading">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action}
    </div>
  );
}

/**
 * Staff always read records in the organization's time (Beijing), no matter
 * where they open the portal — a record submitted at 22:57 Beijing must not
 * appear as 07:57 to an administrator sitting in another timezone.
 */
export function formatAdminDate(locale: AdminLocale, value?: string, includeTime = false) {
  if (!value) return "—";
  // A bare business date is already a calendar day; anchor it at Beijing noon
  // so no timezone conversion can shift it to the neighbouring day.
  const isBusinessDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = isBusinessDate ? new Date(`${value}T12:00:00+08:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime && !isBusinessDate ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(date);
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function downloadAdminCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
