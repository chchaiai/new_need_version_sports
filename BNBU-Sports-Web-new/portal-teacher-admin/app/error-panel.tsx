import type { UserFacingError } from "./api-client";

export function localUserFacingError(
  message: string,
  locale: "zh" | "en" = "zh",
  fields: string[] = [],
): UserFacingError {
  const zh = locale !== "en";
  return {
    code: "CLIENT_VALIDATION",
    title: zh ? "请检查填写内容" : "Check the form",
    message,
    action: zh ? "修正后重新提交。" : "Correct the form and submit again.",
    requestId: null,
    retryable: false,
    category: "VALIDATION",
    fieldErrors: fields.map((field) => ({ field, message })),
  };
}

export function ErrorPanel({
  error,
  id,
  locale = "zh",
}: {
  error: UserFacingError | null;
  id?: string;
  locale?: "zh" | "en";
}) {
  if (!error) return null;
  return (
    <section
      id={id}
      className={`user-facing-error is-${error.category.toLowerCase()}`}
      role="alert"
      aria-live="assertive"
    >
      <h2>{error.title}</h2>
      <p>{error.message}</p>
      <p className="user-facing-error-action">{error.action}</p>
      {error.fieldErrors.length > 0 && (
        <ul>
          {error.fieldErrors.map((fieldError, index) => (
            <li key={`${fieldError.field}-${index}`}>
              <b>{fieldError.field}：</b>{fieldError.message}
            </li>
          ))}
        </ul>
      )}
      {error.requestId && (
        <p className="user-facing-error-request-id">
          {locale === "en" ? "Diagnostic reference: " : "诊断编号："}
          <code>{error.requestId}</code>
        </p>
      )}
    </section>
  );
}
