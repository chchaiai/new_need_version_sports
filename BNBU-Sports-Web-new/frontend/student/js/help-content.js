import { tx } from "./i18n.js";

export const HELP_CATEGORY_CODES = [
  "login",
  "enrollment",
  "checkin",
  "evidence",
  "course",
  "exemption",
  "organization",
  "notification",
  "maintenance",
  "feedback",
];

const HELP_CATEGORY_LABELS = {
  login: ["登录与验证码", "Sign-in & verification codes"],
  enrollment: ["加入课程与补正", "Enrollment & corrections"],
  checkin: ["打卡与学时", "Check-ins & credits"],
  evidence: ["凭证上传", "Evidence upload"],
  course: ["课程与成绩", "Classes & grades"],
  exemption: ["免测", "Exemptions"],
  organization: ["组织认证", "Organization verification"],
  notification: ["通知", "Notifications"],
  maintenance: ["维护期间操作", "Maintenance operations"],
  feedback: ["服务反馈", "Service feedback"],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderInlineMarkdown(source) {
  const tokenPattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^\s)]+\)|\*[^*\n]+\*|_[^_\n]+_)/gu;
  let html = "";
  let offset = 0;
  for (const match of String(source ?? "").matchAll(tokenPattern)) {
    html += escapeHtml(source.slice(offset, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      html += `<code>${escapeHtml(token.slice(1, -1))}</code>`;
    } else if (token.startsWith("**") || token.startsWith("__")) {
      html += `<strong>${escapeHtml(token.slice(2, -2))}</strong>`;
    } else if (token.startsWith("[")) {
      const parts = /^\[([^\]]+)\]\((.+)\)$/u.exec(token);
      const href = safeLink(parts?.[2] || "");
      html += href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(parts[1])}</a>`
        : escapeHtml(parts?.[1] || token);
    } else {
      html += `<em>${escapeHtml(token.slice(1, -1))}</em>`;
    }
    offset = (match.index || 0) + token.length;
  }
  return html + escapeHtml(String(source ?? "").slice(offset));
}

function isBlockStart(line) {
  return /^\s*$|^```|^#{1,4}\s+|^\s*(?:[-*+]\s+|\d+\.\s+|>\s?|(?:-{3,}|\*{3,}))/.test(line);
}

/**
 * Safe, dependency-free Markdown projection shared with the administrator and
 * Android renderers. Raw HTML is always escaped. Supported public formatting:
 * headings, paragraphs, ordered/unordered lists, quotes, fenced code, rules,
 * emphasis, strong text, inline code, and safe http(s)/mailto links.
 */
export function renderHelpMarkdown(markdown) {
  const lines = String(markdown ?? "").replaceAll("\r\n", "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/u.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6);
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        quote.push(lines[index++].replace(/^\s*>\s?/u, ""));
      }
      blocks.push(`<blockquote>${quote.map(renderInlineMarkdown).join("<br>")}</blockquote>`);
      continue;
    }
    const unordered = /^\s*[-*+]\s+(.+)$/u.exec(line);
    const ordered = /^\s*\d+\.\s+(.+)$/u.exec(line);
    if (unordered || ordered) {
      const tag = ordered ? "ol" : "ul";
      const pattern = ordered ? /^\s*\d+\.\s+(.+)$/u : /^\s*[-*+]\s+(.+)$/u;
      const items = [];
      while (index < lines.length) {
        const item = pattern.exec(lines[index]);
        if (!item) break;
        items.push(`<li>${renderInlineMarkdown(item[1])}</li>`);
        index += 1;
      }
      blocks.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`);
  }

  return `<div class="help-markdown">${blocks.join("")}</div>`;
}

export function helpCategoryLabel(categoryCode) {
  const labels = HELP_CATEGORY_LABELS[String(categoryCode || "").trim().toLowerCase()];
  return labels ? tx(labels[0], labels[1]) : tx("其他", "Other");
}

export function helpCategoryRank(categoryCode) {
  const rank = HELP_CATEGORY_CODES.indexOf(String(categoryCode || "").trim().toLowerCase());
  return rank < 0 ? HELP_CATEGORY_CODES.length : rank;
}

export function toHelpArticleView(article) {
  const categoryCode = String(article.category || "").trim().toLowerCase();
  return {
    id: article.id,
    categoryCode,
    category: helpCategoryLabel(categoryCode),
    title: article.title,
    content: article.bodyMarkdown,
    publishedAt: article.publishedAt,
    version: article.version,
  };
}
