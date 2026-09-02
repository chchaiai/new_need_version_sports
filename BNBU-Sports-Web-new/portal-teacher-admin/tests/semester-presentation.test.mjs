import assert from "node:assert/strict";
import test from "node:test";
import { semesterDisplayName } from "../app/semester-presentation.ts";

test("administrator-managed semester display name remains authoritative", () => {
  assert.equal(
    semesterDisplayName({
      displayName: "2026-2027 第一学期",
      academicYear: "2026-2027",
      termCode: "FIRST",
    }),
    "2026-2027 第一学期",
  );
});

test("structured semester fallback follows admin term naming", () => {
  assert.equal(
    semesterDisplayName({ academicYear: "2025-2026", term: "second" }),
    "2025-2026 第二学期",
  );
  assert.equal(
    semesterDisplayName({ academicYear: "2025-2026", termCode: "SUMMER" }),
    "2025-2026 暑期学期",
  );
});
