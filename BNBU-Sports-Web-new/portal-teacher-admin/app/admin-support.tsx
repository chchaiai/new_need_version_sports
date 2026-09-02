"use client";

import { useEffect, useState } from "react";
import { AppSelect } from "./app-select";
import { pageItems } from "./admin-domain";
import { adminCopy, adminLabel } from "./admin-i18n";
import { matchesAdminSupportSearch } from "./admin-support-search";
import {
  adminApiErrorText,
  listFeedbackProjections,
  updateTicket,
  type FeedbackProjection,
} from "./admin-service";
import { useAdminStore } from "./admin-store";
import type { AdminLocale, SupportTicket, TicketCategory, TicketStatus } from "./admin-types";
import { AdminBadge, AdminDialog, AdminEmpty, AdminField, AdminInlineError, AdminPagination, AdminSectionHeading, formatAdminDate, type AdminTone } from "./admin-components";
import { ErrorPanel } from "./error-panel";

type TicketFilter = "all" | TicketStatus;
type TicketCategoryFilter = "all" | TicketCategory;

const ticketCategories: TicketCategory[] = [
  "BUG",
  "SUGGESTION",
  "ACCESSIBILITY",
  "PRIVACY",
  "OTHER",
];

function SupportSearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="admin-search admin-support-search">
      <span className="admin-support-search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      </span>
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={label}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ticketTone(status: TicketStatus): AdminTone {
  if (status === "resolved") return "green";
  if (status === "closed") return "gray";
  if (status === "pending") return "orange";
  return "blue";
}

function TicketDialog({
  locale,
  ticket,
  requesterEmail,
  close,
}: {
  locale: AdminLocale;
  ticket: SupportTicket;
  requesterEmail?: string;
  close: () => void;
}) {
  const { busyKey, error, clearError, run } = useAdminStore();
  const [status, setStatus] = useState<TicketStatus>(ticket.status === "pending" ? "in_progress" : ticket.status);
  const [reply, setReply] = useState("");
  const key = `ticket.${ticket.id}`;
  useEffect(() => () => clearError(), [clearError]);
  const submit = async () => {
    const result = await run(key, () => updateTicket(ticket.id, status, reply), adminCopy(locale, "ticket_saved"));
    if (result) close();
  };
  return (
    <AdminDialog locale={locale} title={`${ticket.id} · ${adminLabel(locale, "ticketCategory", ticket.category)}`} description={formatAdminDate(locale, ticket.submittedAt, true)} close={close} dirty={Boolean(reply)} wide footer={<>
      <button className="secondary-button" type="button" onClick={close}>{adminCopy(locale, "cancel")}</button>
      <button className="primary-button" type="button" disabled={busyKey === key} onClick={() => void submit()}>{busyKey === key ? adminCopy(locale, "processing") : adminCopy(locale, "save_ticket")}</button>
    </>}>
      <div className="admin-ticket-layout">
        <div className="admin-ticket-detail">
          <section className="admin-ticket-requester" aria-label={locale === "zh" ? "提交人信息" : "Requester details"}>
            <header>
              <span aria-hidden="true">{ticket.requester.slice(0, 1)}</span>
              <div><small>{locale === "zh" ? "提交人" : "Requester"}</small><h3>{ticket.requester}</h3></div>
              <AdminBadge tone={ticketTone(ticket.status)}>{adminLabel(locale, "ticketStatus", ticket.status)}</AdminBadge>
            </header>
            <dl>
              <div><dt>{locale === "zh" ? "学号" : "Student ID"}</dt><dd><code>{ticket.account}</code></dd></div>
              <div><dt>{locale === "zh" ? "学校邮箱" : "University email"}</dt><dd>{requesterEmail ?? adminCopy(locale, "not_available")}</dd></div>
              <div><dt>{locale === "zh" ? "提交时间" : "Submitted"}</dt><dd>{formatAdminDate(locale, ticket.submittedAt, true)}</dd></div>
            </dl>
          </section>
          <section className="admin-ticket-message">
            <header><span>{locale === "zh" ? "问题内容" : "Problem details"}</span><AdminBadge tone="blue">{adminLabel(locale, "ticketCategory", ticket.category)}</AdminBadge></header>
            <p>{ticket.content}</p>
          </section>
          {ticket.replies.length > 0 && <section className="admin-ticket-thread">
            <h3>{locale === "zh" ? "处理记录" : "History"}</h3>
            {ticket.replies.map((item) => <article key={item.id}><b>{item.author}</b><p>{item.message}</p><small>{formatAdminDate(locale, item.createdAt, true)}</small></article>)}
          </section>}
        </div>
        <div className="admin-ticket-editor">
          <header><h3>{locale === "zh" ? "处理反馈" : "Process feedback"}</h3><p>{locale === "zh" ? "更新状态，并向学生说明处理结果和下一步。" : "Update the status and explain the result and next step to the student."}</p></header>
          <AdminField locale={locale} label={adminCopy(locale, "status")} required><AppSelect label={adminCopy(locale, "status")} value={status} options={(["in_progress", "technical", "resolved", "closed"] as TicketStatus[]).map((value) => ({ value, label: adminLabel(locale, "ticketStatus", value) }))} onChange={(value) => value && setStatus(value as TicketStatus)} /></AdminField>
          <AdminField locale={locale} label={adminCopy(locale, "reply")} required errorCode={error?.fieldErrors.reply}><textarea value={reply} placeholder={adminCopy(locale, "reply_placeholder")} onChange={(event) => setReply(event.target.value)} /></AdminField>
        </div>
      </div>
      {error?.userFacingError
        ? <ErrorPanel error={error.userFacingError} locale={locale} />
        : <AdminInlineError message={error?.message} />}
    </AdminDialog>
  );
}

function DemoAdminSupport({ locale }: { locale: AdminLocale }) {
  const { state } = useAdminStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TicketFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!state) return null;
  const studentTickets = state.tickets.filter((ticket) => ticket.source === "student");
  const requesterFor = (ticket: SupportTicket) => state.users.find(
    (user) => user.role === "student" && user.account === ticket.account,
  );
  const filtered = studentTickets.filter((ticket) => {
    const requester = requesterFor(ticket);
    return (categoryFilter === "all" || ticket.category === categoryFilter)
      && (statusFilter === "all" || ticket.status === statusFilter)
      && matchesAdminSupportSearch({
        id: ticket.id,
        requester: ticket.requester,
        studentNumber: ticket.account,
        email: requester?.email,
        category: ticket.category,
        categoryLabel: adminLabel(locale, "ticketCategory", ticket.category),
        summary: ticket.content,
      }, search);
  });
  const paged = pageItems(filtered, page, 6);
  const selected = studentTickets.find((ticket) => ticket.id === selectedId);
  const openCount = studentTickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length;

  return (
    <div className="admin-page-stack admin-support-page admin-support-demo">
      <aside className="admin-planned-banner">
        {locale === "zh"
          ? "Android 与网页学生端提交的“问题类型”和“问题描述”，会分别对应管理端的“分类”和“问题内容”。当前 Mock 记录仅为本地合成数据，不会跨端同步。"
          : "Problem category and description from Android and Web map to Category and Problem details here. Mock records are local synthetic data and do not sync across clients."}
      </aside>
      <section className="admin-summary-grid three admin-support-summary" aria-label={locale === "zh" ? "学生问题反馈概况" : "Student issue feedback overview"}>
        <button className={statusFilter === "all" ? "is-active" : ""} type="button" aria-pressed={statusFilter === "all"} onClick={() => { setStatusFilter("all"); setPage(1); }}><span>{adminCopy(locale, "tickets")}</span><b>{studentTickets.length}</b><small>{adminCopy(locale, "open_tickets", { count: openCount })}</small></button>
        <button className={statusFilter === "technical" ? "is-active" : ""} type="button" aria-pressed={statusFilter === "technical"} onClick={() => { setStatusFilter("technical"); setPage(1); }}><span>{adminLabel(locale, "ticketStatus", "technical")}</span><b>{studentTickets.filter((ticket) => ticket.status === "technical").length}</b><small>{locale === "zh" ? "技术团队" : "Technical team"}</small></button>
        <button className={statusFilter === "resolved" ? "is-active" : ""} type="button" aria-pressed={statusFilter === "resolved"} onClick={() => { setStatusFilter("resolved"); setPage(1); }}><span>{adminLabel(locale, "ticketStatus", "resolved")}</span><b>{studentTickets.filter((ticket) => ticket.status === "resolved").length}</b><small>{adminCopy(locale, "updated_at")}</small></button>
      </section>
      <section className="admin-surface admin-table-surface admin-support-surface">
        <AdminSectionHeading title={adminCopy(locale, "tickets")} />
        <div className="admin-filter-row admin-support-filters">
          <SupportSearchField label={adminCopy(locale, "ticket_search")} value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
          <AppSelect label={adminCopy(locale, "ticket_category_filter")} value={categoryFilter} options={[{ value: "all", label: adminCopy(locale, "all") }, ...ticketCategories.map((value) => ({ value, label: adminLabel(locale, "ticketCategory", value) }))]} onChange={(value) => { if (value) { setCategoryFilter(value as TicketCategoryFilter); setPage(1); } }} />
          <AppSelect label={adminCopy(locale, "ticket_status_filter")} value={statusFilter} options={[{ value: "all", label: adminCopy(locale, "all") }, ...(["pending", "in_progress", "technical", "resolved", "closed"] as TicketStatus[]).map((value) => ({ value, label: adminLabel(locale, "ticketStatus", value) }))]} onChange={(value) => { if (value) { setStatusFilter(value as TicketFilter); setPage(1); } }} />
          {(search || categoryFilter !== "all" || statusFilter !== "all") && <button className="text-button" type="button" onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setPage(1); }}>{adminCopy(locale, "clear_filters")}</button>}
        </div>
        {paged.items.length === 0 ? <AdminEmpty locale={locale} filtered /> : <>
          <div className="table-wrap admin-support-table-wrap"><table className="admin-table admin-support-table"><thead><tr><th>ID</th><th>{adminCopy(locale, "requester")}</th><th>{locale === "zh" ? "问题摘要" : "Problem summary"}</th><th>{adminCopy(locale, "submitted_at")}</th><th>{adminCopy(locale, "status")}</th><th>{adminCopy(locale, "actions")}</th></tr></thead><tbody>{paged.items.map((ticket) => {
            const requester = requesterFor(ticket);
            return <tr key={ticket.id}><td><code>{ticket.id}</code></td><td className="admin-support-requester"><b>{ticket.requester}</b><small><span>{locale === "zh" ? "学号" : "ID"}</span><code>{ticket.account}</code></small><small><span>{locale === "zh" ? "邮箱" : "Email"}</span>{requester?.email ?? adminCopy(locale, "not_available")}</small></td><td className="admin-support-issue"><small>{adminLabel(locale, "ticketCategory", ticket.category)}</small><b>{ticket.content}</b></td><td>{formatAdminDate(locale, ticket.submittedAt, true)}</td><td><AdminBadge tone={ticketTone(ticket.status)}>{adminLabel(locale, "ticketStatus", ticket.status)}</AdminBadge></td><td><button className="text-button" type="button" onClick={() => setSelectedId(ticket.id)}>{adminCopy(locale, "details")} →</button></td></tr>;
          })}</tbody></table></div>
          <div className="admin-support-mobile-list">{paged.items.map((ticket) => <article key={ticket.id}>
            <header><code>{ticket.id}</code><AdminBadge tone={ticketTone(ticket.status)}>{adminLabel(locale, "ticketStatus", ticket.status)}</AdminBadge></header>
            <div className="admin-support-mobile-content"><h3>{ticket.content}</h3><p>{ticket.requester}</p><dl>
              <div><dt>{locale === "zh" ? "学号" : "Student ID"}</dt><dd>{ticket.account}</dd></div>
              <div><dt>{locale === "zh" ? "邮箱" : "Email"}</dt><dd>{requesterFor(ticket)?.email ?? adminCopy(locale, "not_available")}</dd></div>
              <div><dt>{locale === "zh" ? "问题类型" : "Problem category"}</dt><dd>{adminLabel(locale, "ticketCategory", ticket.category)}</dd></div>
              <div><dt>{adminCopy(locale, "submitted_at")}</dt><dd>{formatAdminDate(locale, ticket.submittedAt, true)}</dd></div>
            </dl></div>
            <footer><button className="text-button" type="button" onClick={() => setSelectedId(ticket.id)}>{adminCopy(locale, "details")} →</button></footer>
          </article>)}</div>
        </>}
        <AdminPagination locale={locale} page={paged.page} totalPages={paged.totalPages} total={paged.total} onPage={setPage} />
      </section>
      {selected && <TicketDialog locale={locale} ticket={selected} requesterEmail={requesterFor(selected)?.email} close={() => setSelectedId(null)} />}
    </div>
  );
}

export function AdminSupport({ locale }: { locale: AdminLocale }) {
  const { mode } = useAdminStore();
  return mode === "real" ? (
    <RealFeedbackSupport locale={locale} />
  ) : (
    <DemoAdminSupport locale={locale} />
  );
}

function RealFeedbackSupport({ locale }: { locale: AdminLocale }) {
  const [items, setItems] = useState<FeedbackProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      setItems(await listFeedbackProjections());
    } catch (failure) {
      setLoadError(adminApiErrorText(failure, locale));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void listFeedbackProjections()
      .then((next) => {
        if (active) setItems(next);
      })
      .catch((failure) => {
        if (active) setLoadError(adminApiErrorText(failure, locale));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [locale]);

  const filtered = items.filter(
    (item) =>
      (categoryFilter === "all" || item.category === categoryFilter) &&
      (statusFilter === "all" || item.status === statusFilter) &&
      matchesAdminSupportSearch({
        id: item.id,
        category: item.category,
        categoryLabel: adminLabel(locale, "ticketCategory", item.category),
        summary: item.content,
      }, search),
  );

  return (
    <div className="admin-page-stack admin-support-page">
      <aside className="admin-planned-banner">
        {locale === "zh"
          ? "学生端提交的问题类型和问题描述会对应显示为分类和问题内容；编号、处理状态、公开回复和时间由系统补充。当前 API 没有管理员回复或改状态接口，因此页面保持只读。"
          : "Student problem category and description map to Category and Problem details; the system adds the ID, status, public reply, and timestamps. The current API has no admin reply or status mutation, so this view is read-only."}
      </aside>
      <section className="admin-surface admin-table-surface admin-support-surface">
        <AdminSectionHeading
          title={adminCopy(locale, "tickets")}
          action={<button className="text-button" type="button" onClick={() => void load()}>{locale === "zh" ? "刷新" : "Refresh"}</button>}
        />
        <div className="admin-filter-row admin-support-filters">
          <SupportSearchField label={locale === "zh" ? "搜索反馈编号、分类或问题摘要" : "Search feedback ID, category, or problem summary"} value={search} onChange={setSearch} />
          <AppSelect label={adminCopy(locale, "ticket_category_filter")} value={categoryFilter} options={[{ value: "all", label: adminCopy(locale, "all") }, ...ticketCategories.map((value) => ({ value, label: adminLabel(locale, "ticketCategory", value) }))]} onChange={(value) => setCategoryFilter((value ?? "all") as TicketCategoryFilter)} />
          <AppSelect label={adminCopy(locale, "ticket_status_filter")} value={statusFilter} options={["all", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((value) => ({ value, label: value === "all" ? adminCopy(locale, "all") : value }))} onChange={(value) => setStatusFilter(String(value ?? "all"))} />
          {(search || categoryFilter !== "all" || statusFilter !== "all") && <button className="text-button" type="button" onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); }}>{adminCopy(locale, "clear_filters")}</button>}
        </div>
        <AdminInlineError message={loadError} />
        {loading ? null : filtered.length === 0 ? <AdminEmpty locale={locale} filtered /> : (
          <div className="table-wrap admin-support-table-wrap"><table className="admin-table admin-support-table"><thead><tr><th>ID</th><th>{locale === "zh" ? "问题类型" : "Problem category"}</th><th>{adminCopy(locale, "subject")}</th><th>{adminCopy(locale, "status")}</th><th>{adminCopy(locale, "updated_at")}</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><code>{item.id}</code></td><td>{adminLabel(locale, "ticketCategory", item.category)}</td><td><b>{item.content}</b>{item.publicReply && <small className="table-sub">{item.publicReply}</small>}</td><td><AdminBadge tone={item.status === "RESOLVED" ? "green" : item.status === "CLOSED" ? "gray" : "orange"}>{item.status}</AdminBadge></td><td>{formatAdminDate(locale, item.updatedAt, true)}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
}
