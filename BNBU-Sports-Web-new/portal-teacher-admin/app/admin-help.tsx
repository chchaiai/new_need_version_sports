"use client";

import { useEffect, useState } from "react";
import { AppSelect } from "./app-select";
import { pageItems } from "./admin-domain";
import { adminCopy, adminLabel } from "./admin-i18n";
import {
  adminApiErrorText,
  listHelpArticleProjections,
  saveHelpArticle,
  transitionHelpArticle,
  type HelpArticleProjection,
} from "./admin-service";
import { useAdminStore } from "./admin-store";
import type { AdminLocale, HelpArticle, HelpArticleInput, HelpArticleStatus } from "./admin-types";
import { AdminBadge, AdminConfirm, AdminDialog, AdminEmpty, AdminField, AdminInlineError, AdminPagination, AdminSectionHeading, formatAdminDate, type AdminTone } from "./admin-components";
import { ErrorPanel } from "./error-panel";
import { HELP_CATEGORIES, HelpArticleMarkdown, helpCategoryLabel } from "./help-content";

type HelpFilter = "all" | HelpArticleStatus;

function statusTone(status: HelpArticleStatus): AdminTone {
  return status === "published" ? "green" : status === "draft" ? "orange" : "gray";
}

function ArticleDialog({ locale, article, close }: { locale: AdminLocale; article?: HelpArticle; close: () => void }) {
  const { busyKey, error, clearError, run } = useAdminStore();
  const initial: HelpArticleInput = article ? {
    id: article.id,
    titleZh: article.titleZh,
    titleEn: article.titleEn,
    bodyZh: article.bodyZh,
    bodyEn: article.bodyEn,
    keywords: article.keywords,
    category: article.category,
    status: article.status,
    sortWeight: article.sortWeight,
    expectedUpdatedAt: article.updatedAt,
  } : { titleZh: "", titleEn: "", bodyZh: "", bodyEn: "", keywords: [], category: "login", status: "draft", sortWeight: 0 };
  const [form, setForm] = useState<HelpArticleInput>(initial);
  const [keywordText, setKeywordText] = useState(initial.keywords.join(", "));
  const [previewLocale, setPreviewLocale] = useState<AdminLocale>(locale);
  const key = `help.save.${article?.id ?? "new"}`;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || keywordText !== initial.keywords.join(", ");
  useEffect(() => () => clearError(), [clearError]);
  const update = <K extends keyof HelpArticleInput>(field: K, value: HelpArticleInput[K]) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (status: HelpArticleStatus) => {
    const result = await run(key, () => saveHelpArticle({ ...form, status, keywords: keywordText.split(/[,，]/).map((item) => item.trim()).filter(Boolean) }), adminCopy(locale, "article_saved"));
    if (result) close();
  };
  return (
    <AdminDialog locale={locale} title={adminCopy(locale, article ? "edit_article" : "create_article")} description={adminCopy(locale, "help_audience")} close={close} dirty={dirty} wide footer={<>
      <button className="secondary-button" type="button" onClick={close}>{adminCopy(locale, "cancel")}</button>
      {!article && <button className="secondary-button" type="button" disabled={busyKey === key} onClick={() => void submit("draft")}>{adminCopy(locale, "save_draft")}</button>}
      {article && <button className="secondary-button" type="button" disabled={busyKey === key} onClick={() => void submit(article.status)}>{busyKey === key ? adminCopy(locale, "processing") : adminCopy(locale, "save")}</button>}
      {(!article || article.status === "draft" || article.status === "archived") && <button className="primary-button" type="button" disabled={busyKey === key} onClick={() => void submit("published")}>{busyKey === key ? adminCopy(locale, "processing") : adminCopy(locale, article?.status === "archived" ? "republish" : "save_publish")}</button>}
    </>}>
      <div className="admin-article-editor">
        <div className="admin-form-grid two-columns admin-article-editor-form">
          <AdminField locale={locale} label={adminCopy(locale, "title_chinese")} required errorCode={error?.fieldErrors.titleZh}><input value={form.titleZh} onChange={(event) => update("titleZh", event.target.value)} /></AdminField>
          <AdminField locale={locale} label={adminCopy(locale, "title_english")} required errorCode={error?.fieldErrors.titleEn}><input value={form.titleEn} onChange={(event) => update("titleEn", event.target.value)} /></AdminField>
          <AdminField locale={locale} label={adminCopy(locale, "body_chinese")} required errorCode={error?.fieldErrors.bodyZh}><textarea className="admin-article-body" value={form.bodyZh} onChange={(event) => update("bodyZh", event.target.value)} /></AdminField>
          <AdminField locale={locale} label={adminCopy(locale, "body_english")} required errorCode={error?.fieldErrors.bodyEn}><textarea className="admin-article-body" value={form.bodyEn} onChange={(event) => update("bodyEn", event.target.value)} /></AdminField>
          <AdminField locale={locale} label={adminCopy(locale, "keywords")} required errorCode={error?.fieldErrors.keywords}><input value={keywordText} onChange={(event) => setKeywordText(event.target.value)} /></AdminField>
          <AdminField locale={locale} label={adminCopy(locale, "category")} required errorCode={error?.fieldErrors.category}><AppSelect label={adminCopy(locale, "category")} value={form.category} options={HELP_CATEGORIES.map((value) => ({ value, label: helpCategoryLabel(locale, value) }))} onChange={(value) => value && update("category", String(value))} /></AdminField>
          <AdminField locale={locale} label={adminCopy(locale, "sort_weight")} required errorCode={error?.fieldErrors.sortWeight}><input type="number" value={form.sortWeight} onChange={(event) => update("sortWeight", Number(event.target.value))} /></AdminField>
        </div>
        <section className="admin-article-preview">
          <div><h3>{adminCopy(locale, "preview")}</h3><div className="admin-view-tabs compact"><button type="button" className={previewLocale === "zh" ? "selected" : ""} onClick={() => setPreviewLocale("zh")}>中文</button><button type="button" className={previewLocale === "en" ? "selected" : ""} onClick={() => setPreviewLocale("en")}>English</button></div></div>
          <article><h2>{previewLocale === "en" ? form.titleEn : form.titleZh}</h2><HelpArticleMarkdown markdown={previewLocale === "en" ? form.bodyEn : form.bodyZh} /></article>
        </section>
      </div>
      {error?.userFacingError
        ? <ErrorPanel error={error.userFacingError} locale={locale} />
        : <AdminInlineError message={error?.message} />}
    </AdminDialog>
  );
}

function DemoAdminHelp({ locale }: { locale: AdminLocale }) {
  const { state, busyKey, run } = useAdminStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HelpFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<HelpArticle | "new" | null>(null);
  const [transition, setTransition] = useState<{ article: HelpArticle; nextStatus: "published" | "archived" } | null>(null);
  if (!state) return null;
  const query = search.trim().toLowerCase();
  const filtered = state.helpArticles.filter((article) => (statusFilter === "all" || article.status === statusFilter)
    && (categoryFilter === "all" || article.category === categoryFilter)
    && (!query || [article.titleZh, article.titleEn, ...article.keywords].some((value) => value.toLowerCase().includes(query))))
    .sort((left, right) => right.sortWeight - left.sortWeight || right.updatedAt.localeCompare(left.updatedAt));
  const paged = pageItems(filtered, page, 5);
  const published = state.helpArticles.filter((article) => article.status === "published").length;
  const drafts = state.helpArticles.filter((article) => article.status === "draft").length;
  const archived = state.helpArticles.filter((article) => article.status === "archived").length;
  const transitionKey = transition ? `help.transition.${transition.article.id}` : "";
  const confirmTransition = async () => {
    if (!transition) return;
    const result = await run(transitionKey, () => transitionHelpArticle(transition.article.id, transition.nextStatus), adminCopy(locale, transition.nextStatus === "published" ? "article_published" : "article_archived"));
    if (result) setTransition(null);
  };
  return (
    <div className="admin-page-stack admin-help-page admin-help-demo">
      <section className="admin-summary-grid three admin-help-summary" aria-label={locale === "zh" ? "帮助文章概况" : "Help article overview"}>
        <button className={statusFilter === "published" ? "is-active" : ""} type="button" aria-pressed={statusFilter === "published"} onClick={() => { setStatusFilter("published"); setPage(1); }}><span>{adminLabel(locale, "helpStatus", "published")}</span><b>{published}</b><small>{adminCopy(locale, "help_audience")}</small></button>
        <button className={statusFilter === "draft" ? "is-active" : ""} type="button" aria-pressed={statusFilter === "draft"} onClick={() => { setStatusFilter("draft"); setPage(1); }}><span>{adminLabel(locale, "helpStatus", "draft")}</span><b>{drafts}</b><small>{adminCopy(locale, "content_incomplete")}</small></button>
        <button className={statusFilter === "archived" ? "is-active" : ""} type="button" aria-pressed={statusFilter === "archived"} onClick={() => { setStatusFilter("archived"); setPage(1); }}><span>{adminLabel(locale, "helpStatus", "archived")}</span><b>{archived}</b><small>{adminCopy(locale, "republish")}</small></button>
      </section>
      <section className="admin-surface admin-table-surface admin-help-surface">
        <AdminSectionHeading title={adminCopy(locale, "help_articles")} description={adminCopy(locale, "help_audience")} action={<button className="primary-button" type="button" onClick={() => setEditing("new")}>{adminCopy(locale, "create_article")}</button>} />
        <div className="admin-filter-row admin-help-filters">
          <label className="admin-search"><span aria-hidden="true">⌕</span><input type="search" aria-label={adminCopy(locale, "help_search")} value={search} placeholder={adminCopy(locale, "help_search")} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
          <AppSelect label={adminCopy(locale, "article_status_filter")} value={statusFilter} options={[{ value: "all", label: adminCopy(locale, "all") }, ...(["published", "draft", "archived"] as HelpArticleStatus[]).map((value) => ({ value, label: adminLabel(locale, "helpStatus", value) }))]} onChange={(value) => { if (value) { setStatusFilter(value as HelpFilter); setPage(1); } }} />
          <AppSelect label={adminCopy(locale, "category_filter")} value={categoryFilter} options={[{ value: "all", label: adminCopy(locale, "all") }, ...HELP_CATEGORIES.map((value) => ({ value, label: helpCategoryLabel(locale, value) }))]} onChange={(value) => { if (value) { setCategoryFilter(String(value)); setPage(1); } }} />
          {(search || statusFilter !== "all" || categoryFilter !== "all") && <button className="text-button" type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); setPage(1); }}>{adminCopy(locale, "clear_filters")}</button>}
        </div>
        {paged.items.length === 0 ? <AdminEmpty locale={locale} filtered /> : <div className="admin-article-list admin-help-article-list">{paged.items.map((article) => <article className="admin-help-article" key={article.id}><div><span><AdminBadge tone={statusTone(article.status)}>{adminLabel(locale, "helpStatus", article.status)}</AdminBadge><small>{helpCategoryLabel(locale, article.category)} · {formatAdminDate(locale, article.updatedAt, true)}</small></span><h3>{locale === "en" ? article.titleEn : article.titleZh}</h3><HelpArticleMarkdown markdown={locale === "en" ? article.bodyEn : article.bodyZh} /><div>{article.keywords.map((keyword) => <i key={keyword}>{keyword}</i>)}</div></div><aside className="admin-help-actions"><button className="secondary-button" type="button" onClick={() => setEditing(article)}>{adminCopy(locale, "edit")}</button>{article.status === "draft" && <button className="primary-button" type="button" onClick={() => setTransition({ article, nextStatus: "published" })}>{adminCopy(locale, "publish")}</button>}{article.status === "published" && <button className="danger-button" type="button" onClick={() => setTransition({ article, nextStatus: "archived" })}>{adminCopy(locale, "take_offline")}</button>}{article.status === "archived" && <button className="primary-button" type="button" onClick={() => setTransition({ article, nextStatus: "published" })}>{adminCopy(locale, "republish")}</button>}</aside></article>)}</div>}
        <AdminPagination locale={locale} page={paged.page} totalPages={paged.totalPages} total={paged.total} onPage={setPage} />
      </section>
      {editing && <ArticleDialog locale={locale} article={editing === "new" ? undefined : editing} close={() => setEditing(null)} />}
      {transition && <AdminConfirm locale={locale} title={adminCopy(locale, transition.nextStatus === "published" ? "publish" : "take_offline")} description={transition.nextStatus === "published" ? adminCopy(locale, "help_audience") : adminCopy(locale, "article_archived")} close={() => setTransition(null)} confirm={() => void confirmTransition()} confirmLabel={adminCopy(locale, transition.nextStatus === "published" ? "publish" : "take_offline")} busy={busyKey === transitionKey} danger={transition.nextStatus === "archived"}><div className="admin-confirm-object"><b>{locale === "en" ? transition.article.titleEn : transition.article.titleZh}</b><span>{adminLabel(locale, "helpStatus", transition.article.status)} → {adminLabel(locale, "helpStatus", transition.nextStatus)}</span></div></AdminConfirm>}
    </div>
  );
}

export function AdminHelp({ locale }: { locale: AdminLocale }) {
  const { mode } = useAdminStore();
  return mode === "real" ? (
    <PublishedHelpArticles locale={locale} />
  ) : (
    <DemoAdminHelp locale={locale} />
  );
}

function PublishedHelpArticles({ locale }: { locale: AdminLocale }) {
  const [items, setItems] = useState<HelpArticleProjection[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      setItems(await listHelpArticleProjections(locale === "en" ? "en" : "zh-CN"));
    } catch (failure) {
      setLoadError(adminApiErrorText(failure, locale));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void listHelpArticleProjections(locale === "en" ? "en" : "zh-CN")
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

  const query = search.trim().toLocaleLowerCase();
  const filtered = items.filter((item) =>
    !query || [item.title, item.bodyMarkdown, item.category].join(" ").toLocaleLowerCase().includes(query),
  );

  return (
    <div className="admin-page-stack admin-help-page">
      <aside className="admin-planned-banner">
        {locale === "zh"
          ? "当前客户端 API 只能读取已发布帮助文章，不提供创建、编辑或下线能力。此页面不会把浏览器本地草稿伪装成正式帮助内容。"
          : "The client API can read published help only. Authoring and publication remain outside this client API, so local drafts are never presented as official content."}
      </aside>
      <section className="admin-surface admin-table-surface admin-help-surface">
        <AdminSectionHeading
          title={adminCopy(locale, "help_articles")}
          description={locale === "zh" ? "服务端已发布内容（只读）" : "Published server content (read-only)"}
          action={<button className="text-button" type="button" onClick={() => void load()}>{locale === "zh" ? "刷新" : "Refresh"}</button>}
        />
        <div className="admin-filter-row admin-help-filters">
          <label className="admin-search"><span aria-hidden="true">⌕</span><input type="search" aria-label={adminCopy(locale, "help_search")} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={adminCopy(locale, "help_search")} /></label>
        </div>
        <AdminInlineError message={loadError} />
        {loading ? null : filtered.length === 0 ? <AdminEmpty locale={locale} filtered={Boolean(search)} /> : (
          <div className="admin-article-list admin-help-article-list">
            {filtered.map((article) => (
              <article className="admin-help-article" key={article.id}>
                <div>
                  <span><AdminBadge tone="green">PUBLISHED</AdminBadge><small>{helpCategoryLabel(locale, article.category)} · {formatAdminDate(locale, article.publishedAt, true)}</small></span>
                  <h3>{article.title}</h3>
                  <HelpArticleMarkdown markdown={article.bodyMarkdown} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
