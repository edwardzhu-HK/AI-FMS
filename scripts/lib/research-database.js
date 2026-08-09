import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const MIGRATION_PATHS = [
  fileURLToPath(
    new URL("../../db/sqlite/0001_study_reviews.sql", import.meta.url),
  ),
  fileURLToPath(
    new URL("../../db/sqlite/0002_pilot_pool.sql", import.meta.url),
  ),
];

export const DEFAULT_RESEARCH_DB = "Ingested-data/ai-fms-study-reviews.sqlite";

export function openResearchDatabase(dbPath = DEFAULT_RESEARCH_DB) {
  const resolvedPath = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const database = new DatabaseSync(resolvedPath);
  database.exec("pragma foreign_keys = on;");
  for (const migrationPath of MIGRATION_PATHS) {
    database.exec(fs.readFileSync(migrationPath, "utf8"));
  }
  return { database, resolvedPath };
}
