import fs from "node:fs";
import path from "node:path";

const REQUIRED_COLUMNS = [
  "file_name",
  "start_second",
  "end_second",
  "expected_reps",
  "notes",
];

export function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  values.push(current.trim());
  return values;
}

export function parseManifestFile(manifestPath) {
  const resolvedPath = path.resolve(process.cwd(), manifestPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`manifest not found: ${resolvedPath}`);
  }

  const lines = fs
    .readFileSync(resolvedPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length < 2) {
    throw new Error("manifest has no data rows");
  }

  const header = parseCsvLine(lines[0]);
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !header.includes(c));

  if (missingColumns.length > 0) {
    throw new Error(`manifest missing columns: ${missingColumns.join(", ")}`);
  }

  const indexes = Object.fromEntries(
    REQUIRED_COLUMNS.map((column) => [column, header.indexOf(column)]),
  );

  const rows = [];
  for (let row = 1; row < lines.length; row += 1) {
    const values = parseCsvLine(lines[row]);
    rows.push({
      rowNumber: row + 1,
      fileName: values[indexes.file_name] ?? "",
      startSecondRaw: values[indexes.start_second] ?? "",
      endSecondRaw: values[indexes.end_second] ?? "",
      expectedRepsRaw: values[indexes.expected_reps] ?? "",
      notes: values[indexes.notes] ?? "",
    });
  }

  return {
    manifestPath: resolvedPath,
    rows,
  };
}

export function parseManifestRecord(row) {
  return {
    ...row,
    startSecond: Number(row.startSecondRaw),
    endSecond: Number(row.endSecondRaw),
    expectedReps: Number(row.expectedRepsRaw),
  };
}

export { REQUIRED_COLUMNS };
