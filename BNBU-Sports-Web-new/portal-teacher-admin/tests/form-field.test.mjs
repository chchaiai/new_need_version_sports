import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppSelect } from "../app/app-select.tsx";
import { AdminField } from "../app/admin-components.tsx";
import { FormField } from "../app/form-field.tsx";

test("FormField preserves a native control id and connects its label", () => {
  const html = renderToStaticMarkup(createElement(
    FormField,
    { label: "Email", required: true },
    createElement("input", { id: "native-email", type: "email" }),
  ));
  assert.match(html, /<label[^>]*for="native-email"/);
  assert.match(html, /<input[^>]*id="native-email"[^>]*required=""/);
  assert.match(html, /aria-required="true"/);
});

test("FormField gives a native control and its label the same generated id", () => {
  const html = renderToStaticMarkup(createElement(
    FormField,
    { label: "Course code" },
    createElement("input", { type: "text" }),
  ));
  const labelFor = html.match(/<label[^>]*for="([^"]+)"/)?.[1];
  const inputId = html.match(/<input[^>]*id="([^"]+)"/)?.[1];
  assert.ok(labelFor);
  assert.equal(inputId, labelFor);
});

test("FormField connects AppSelect and forwards required accessibility state", () => {
  const html = renderToStaticMarkup(createElement(
    FormField,
    { label: "Role", required: true },
    createElement(AppSelect, {
      id: "role-select",
      label: "Role",
      value: "TEACHER",
      options: [{ value: "TEACHER", label: "Teacher" }],
    }),
  ));
  assert.match(html, /<label[^>]*for="role-select"/);
  assert.match(html, /<button[^>]*id="role-select"/);
  assert.match(html, /aria-required="true"/);
});

test("FormField links hint and error text and marks the native control invalid", () => {
  const html = renderToStaticMarkup(createElement(
    FormField,
    {
      label: "Email",
      hint: "Use your university email.",
      error: "Check this field and try again.",
    },
    createElement("input", { id: "email-with-error", type: "email" }),
  ));
  assert.match(html, /<input[^>]*aria-describedby="email-with-error-hint email-with-error-error"/);
  assert.match(html, /<input[^>]*aria-invalid="true"/);
  assert.match(html, /<small id="email-with-error-hint">Use your university email\.<\/small>/);
  assert.match(html, /<small id="email-with-error-error"[^>]*role="alert">Check this field and try again\.<\/small>/);
});

test("FormField merges a child's existing aria-describedby ids with its own ids", () => {
  const html = renderToStaticMarkup(createElement(
    FormField,
    { label: "Course code", hint: "Shown on the catalogue.", error: "Required." },
    createElement("input", {
      id: "course-code",
      "aria-describedby": "shared-help course-code-hint",
    }),
  ));
  assert.match(
    html,
    /<input[^>]*aria-describedby="shared-help course-code-hint course-code-error"/,
  );
  assert.equal((html.match(/course-code-hint/g) ?? []).length, 2);
});

test("AdminField delegates label, required state and inline error association to FormField", () => {
  const html = renderToStaticMarkup(createElement(
    AdminField,
    {
      locale: "zh",
      label: "课程代码",
      required: true,
      error: "请检查此字段后重试。",
    },
    createElement("input", { id: "admin-course-code" }),
  ));
  assert.match(html, /<label[^>]*for="admin-course-code"/);
  assert.match(html, /<input[^>]*aria-required="true"/);
  assert.match(html, /<input[^>]*aria-describedby="admin-course-code-error"/);
  assert.match(html, /<input[^>]*aria-invalid="true"/);
  assert.match(html, /id="admin-course-code-error"[^>]*role="alert"/);
});
