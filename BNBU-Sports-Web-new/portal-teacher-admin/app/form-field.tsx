"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-required"?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
};

function mergeDescribedBy(...values: Array<string | undefined>): string | undefined {
  const ids = values
    .flatMap((value) => value?.split(/\s+/) ?? [])
    .filter(Boolean);
  const uniqueIds = [...new Set(ids)];
  return uniqueIds.length > 0 ? uniqueIds.join(" ") : undefined;
}

export function FormField({
  label,
  required = false,
  hint,
  error,
  className = "",
  controlId,
  enhanceControl = true,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  controlId?: string;
  enhanceControl?: boolean;
  children: ReactNode;
}) {
  const generatedId = useId();
  const childProvidedId = isValidElement<FieldControlProps>(children) &&
    typeof children.props.id === "string" && children.props.id.length > 0
    ? children.props.id
    : undefined;
  const resolvedControlId = controlId ?? childProvidedId ?? `field-${generatedId}`;
  const hintId = `${resolvedControlId}-hint`;
  const errorId = `${resolvedControlId}-error`;
  const describedBy = mergeDescribedBy(
    hint ? hintId : undefined,
    error ? errorId : undefined,
  );
  const nativeControl = isValidElement<FieldControlProps>(children) &&
    typeof children.type === "string";
  const existingDescribedBy = isValidElement<FieldControlProps>(children)
    ? nativeControl
      ? children.props["aria-describedby"]
      : children.props.ariaDescribedBy
    : undefined;
  const mergedDescribedBy = mergeDescribedBy(existingDescribedBy, describedBy);
  const enhancedControl = enhanceControl && isValidElement<FieldControlProps>(children)
    ? cloneElement(children as ReactElement<FieldControlProps>, nativeControl
      ? {
          id: children.props.id ?? resolvedControlId,
          required: children.props.required ?? required,
          "aria-required": children.props["aria-required"] ?? (required || undefined),
          "aria-describedby": mergedDescribedBy,
          "aria-invalid": Boolean(error) || children.props["aria-invalid"] || undefined,
        }
      : {
          id: children.props.id ?? resolvedControlId,
          required: children.props.required ?? required,
          ariaDescribedBy: mergedDescribedBy,
          ariaInvalid: Boolean(error) || children.props.ariaInvalid || undefined,
        })
    : children;

  return (
    <label
      className={`portal-form-field ${error ? "has-error" : ""} ${className}`.trim()}
      htmlFor={resolvedControlId}
    >
      <span>
        {label}
        {required && <b aria-hidden="true"> *</b>}
        {required && <span className="sr-only">（必填）</span>}
      </span>
      {enhancedControl}
      {hint && <small id={hintId}>{hint}</small>}
      {error && (
        <small id={errorId} className="portal-field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
