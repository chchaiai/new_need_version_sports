import type { ReactNode } from "react";
import type { AdminLocale } from "./admin-types";

export const HELP_CATEGORIES = [
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
] as const;

const HELP_CATEGORY_LABELS: Record<string, [string, string]> = {
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

export function helpCategoryLabel(locale: AdminLocale, category: string) {
  const pair = HELP_CATEGORY_LABELS[category] ?? [category, category];
  return pair[locale === "en" ? 1 : 0];
}

type MarkdownBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "code"; text: string }
  | { kind: "rule" };

function isBlockStart(line: string) {
  return /^\s*$|^```|^#{1,4}\s+|^\s*(?:[-*+]\s+|\d+\.\s+|>\s?|(?:-{3,}|\*{3,}))/.test(line);
}

export function parseHelpMarkdown(markdown: string): MarkdownBlock[] {
  const lines = String(markdown ?? "").replaceAll("\r\n", "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push({ kind: "code", text: code.join("\n") });
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/u.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/u, ""));
      blocks.push({ kind: "quote", lines: quote });
      continue;
    }
    const unordered = /^\s*[-*+]\s+(.+)$/u.exec(line);
    const ordered = /^\s*\d+\.\s+(.+)$/u.exec(line);
    if (unordered || ordered) {
      const pattern = ordered ? /^\s*\d+\.\s+(.+)$/u : /^\s*[-*+]\s+(.+)$/u;
      const items: string[] = [];
      while (index < lines.length) {
        const item = pattern.exec(lines[index]);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ kind: "list", ordered: Boolean(ordered), items });
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push({ kind: "paragraph", lines: paragraph });
  }
  return blocks;
}

function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function inlineMarkdown(source: string, keyPrefix: string): ReactNode[] {
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^\s)]+\)|\*[^*\n]+\*|_[^_\n]+_)/gu;
  const nodes: ReactNode[] = [];
  let offset = 0;
  let part = 0;
  for (const match of source.matchAll(pattern)) {
    if ((match.index ?? 0) > offset) nodes.push(source.slice(offset, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${part++}`;
    if (token.startsWith("`")) nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("**") || token.startsWith("__")) nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("[")) {
      const parts = /^\[([^\]]+)\]\((.+)\)$/u.exec(token);
      const href = safeLink(parts?.[2] || "");
      nodes.push(href ? <a key={key} href={href} target="_blank" rel="noreferrer noopener">{parts?.[1]}</a> : parts?.[1]);
    } else nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    offset = (match.index ?? 0) + token.length;
  }
  if (offset < source.length) nodes.push(source.slice(offset));
  return nodes;
}

function lineNodes(lines: string[], keyPrefix: string) {
  return lines.flatMap((line, index) => [
    ...(index > 0 ? [<br key={`${keyPrefix}-br-${index}`} />] : []),
    ...inlineMarkdown(line, `${keyPrefix}-${index}`),
  ]);
}

export function HelpArticleMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="help-article-markdown">
      {parseHelpMarkdown(markdown).map((block, index) => {
        const key = `help-markdown-${index}`;
        if (block.kind === "heading") {
          const content = inlineMarkdown(block.text, key);
          if (block.level === 1) return <h3 key={key}>{content}</h3>;
          if (block.level === 2) return <h4 key={key}>{content}</h4>;
          if (block.level === 3) return <h5 key={key}>{content}</h5>;
          return <h6 key={key}>{content}</h6>;
        }
        if (block.kind === "paragraph") return <p key={key}>{lineNodes(block.lines, key)}</p>;
        if (block.kind === "quote") return <blockquote key={key}>{lineNodes(block.lines, key)}</blockquote>;
        if (block.kind === "code") return <pre key={key}><code>{block.text}</code></pre>;
        if (block.kind === "rule") return <hr key={key} />;
        const items = block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{inlineMarkdown(item, `${key}-${itemIndex}`)}</li>);
        return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
      })}
    </div>
  );
}
