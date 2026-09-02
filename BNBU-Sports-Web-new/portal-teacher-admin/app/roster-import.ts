import type { WorkBook } from "xlsx";
import {
  ROSTER_IMPORT_FIELDS,
  type OfficialRosterStudent,
  type ParsedRosterFile,
  type RosterFieldMapping,
  type RosterImportField,
  type RosterImportRowError,
  type ValidatedRosterImport,
} from "./roster-reconciliation-types";

function normalizeStudentNumber(value: string) {
  return value.trim().replace(/^['\u2019]/, "");
}

function normalizeRosterName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export const MAX_ROSTER_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ROSTER_ROWS = 10_000;

const headerAliases: Record<RosterImportField, string[]> = {
  studentNumber: ["学号", "学生学号", "studentnumber", "studentid", "studentno", "sid", "id"],
  fullName: ["姓名", "学生姓名", "name", "studentname", "fullname"],
  gender: ["性别", "gender", "sex"],
  gradeYear: ["年级", "入学年级", "grade", "gradelevel", "admissionyear", "gradeyear"],
  collegeName: ["学院", "学院名称", "college", "collegename", "school"],
  majorName: ["专业", "专业名称", "major", "majorname", "programme", "program"],
  administrativeClassName: ["行政班", "班级", "administrativeclass", "administrativeclassname", "class", "classname"],
};

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[\s_\-（）()]/g, "");
}

function makeUniqueHeaders(rawHeaders: string[]) {
  const counts = new Map<string, number>();
  return rawHeaders.map((value, index) => {
    const base = value.trim() || `未命名列 ${index + 1}`;
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function blankMapping(): RosterFieldMapping {
  return Object.fromEntries(ROSTER_IMPORT_FIELDS.map((field) => [field, null])) as RosterFieldMapping;
}

function suggestMapping(headers: string[]) {
  const mapping = blankMapping();
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  ROSTER_IMPORT_FIELDS.forEach((field) => {
    const aliases = headerAliases[field].map(normalizeHeader);
    const index = normalizedHeaders.findIndex((header) => aliases.includes(header));
    mapping[field] = index >= 0 ? headers[index] : null;
  });
  return mapping;
}

export async function parseRosterFile(file: File): Promise<ParsedRosterFile> {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase();
  if (!extension || !["xlsx", "xls", "csv"].includes(extension)) throw new Error("UNSUPPORTED_FILE_TYPE");
  if (file.size === 0) throw new Error("EMPTY_FILE");
  if (file.size > MAX_ROSTER_FILE_BYTES) throw new Error("FILE_TOO_LARGE");

  const XLSX = await import("xlsx");
  if (extension === "xls") {
    const cptable = await import("xlsx/dist/cpexcel.full.mjs");
    XLSX.set_cptable(cptable);
  }
  let workbook: WorkBook;
  try {
    workbook = XLSX.read(await file.arrayBuffer(), {
      type: "array",
      cellDates: false,
      cellText: true,
      raw: false,
      codepage: 65001,
    });
  } catch {
    throw new Error("FILE_PARSE_FAILED");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("EMPTY_FILE");
  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  if (matrix.length < 2) throw new Error("EMPTY_FILE");
  if (matrix.length - 1 > MAX_ROSTER_ROWS)
    throw new Error("ROW_LIMIT_EXCEEDED");

  const headers = makeUniqueHeaders(matrix[0].map((value) => String(value ?? "")));
  const rows = matrix.slice(1, MAX_ROSTER_ROWS + 1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, String(values[index] ?? "").trim()]),
  ));
  if (rows.length === 0) throw new Error("EMPTY_FILE");
  return {
    fileName: file.name,
    headers,
    rows,
    previewRows: rows.slice(0, 8),
    suggestedMapping: suggestMapping(headers),
    sheetName,
    totalRows: rows.length,
  };
}

function mappedValue(row: Record<string, string>, mapping: RosterFieldMapping, field: RosterImportField) {
  const header = mapping[field];
  return header ? row[header]?.trim() ?? "" : "";
}

export function validateRosterImport(parsed: ParsedRosterFile, mapping: RosterFieldMapping): ValidatedRosterImport {
  if (!mapping.studentNumber) throw new Error("MISSING_STUDENT_NUMBER_FIELD");
  if (!mapping.fullName) throw new Error("MISSING_FULL_NAME_FIELD");
  const errors: RosterImportRowError[] = [];
  const seen = new Map<string, number>();
  const students: Omit<OfficialRosterStudent, "id" | "courseId">[] = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const studentNumber = normalizeStudentNumber(mappedValue(row, mapping, "studentNumber"));
    const name = mappedValue(row, mapping, "fullName").replace(/\s+/g, " ").trim();
    const hasAnyValue = Object.values(row).some((value) => value.trim());
    if (!hasAnyValue) {
      errors.push({ rowNumber, code: "EMPTY_ROW", message: "空白行" });
      return;
    }
    if (!studentNumber) {
      errors.push({ rowNumber, code: "MISSING_STUDENT_NUMBER", message: "缺少学号" });
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(studentNumber)) {
      errors.push({ rowNumber, code: "INVALID_STUDENT_NUMBER", message: "学号格式异常" });
      return;
    }
    if (!name) {
      errors.push({ rowNumber, code: "MISSING_FULL_NAME", message: "缺少姓名" });
      return;
    }
    const firstRow = seen.get(studentNumber);
    if (firstRow !== undefined) {
      if (!errors.some((error) => error.rowNumber === firstRow && error.code === "DUPLICATE_STUDENT_NUMBER")) {
        errors.push({ rowNumber: firstRow, code: "DUPLICATE_STUDENT_NUMBER", message: `与第 ${rowNumber} 行学号重复` });
      }
      errors.push({ rowNumber, code: "DUPLICATE_STUDENT_NUMBER", message: `与第 ${firstRow} 行学号重复` });
    } else {
      seen.set(studentNumber, rowNumber);
    }
    students.push({
      studentNumber,
      name,
      gender: mappedValue(row, mapping, "gender") || undefined,
      grade: mappedValue(row, mapping, "gradeYear") || undefined,
      college: mappedValue(row, mapping, "collegeName") || undefined,
      major: mappedValue(row, mapping, "majorName") || undefined,
      administrativeClass:
        mappedValue(row, mapping, "administrativeClassName") || undefined,
      sourceRow: rowNumber,
    });
  });

  const invalidRows = new Set(errors.map((error) => error.rowNumber));
  const duplicateNumbers = new Set(
    errors.filter((error) => error.code === "DUPLICATE_STUDENT_NUMBER")
      .map((error) => normalizeStudentNumber(mappedValue(parsed.rows[error.rowNumber - 2], mapping, "studentNumber"))),
  );
  const validStudents = students.filter((student) =>
    !invalidRows.has(student.sourceRow ?? -1)
    && !duplicateNumbers.has(student.studentNumber)
    && normalizeRosterName(student.name || student.studentNumber).length > 0,
  );
  return {
    students: validStudents,
    errors,
    totalRows: parsed.totalRows,
    validRows: validStudents.length,
    invalidRows: parsed.totalRows - validStudents.length,
  };
}
