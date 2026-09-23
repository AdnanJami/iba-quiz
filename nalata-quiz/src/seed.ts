import fs from "fs";
import path from "path";
import { upsertExam } from "./db";
import type { ExamTemplate } from "./types";

const TEMPLATES_DIR = path.join(__dirname, "..", "data", "templates");

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function main(): void {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.log(`No templates directory found at ${TEMPLATES_DIR}, nothing to seed.`);
    return;
  }

  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No .json template files found to seed.");
    return;
  }

  let count = 0;
  for (const file of files) {
    const fullPath = path.join(TEMPLATES_DIR, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    let template: ExamTemplate;
    try {
      template = JSON.parse(raw);
    } catch (err) {
      console.error(`Skipping ${file}: invalid JSON (${(err as Error).message})`);
      continue;
    }

    if (!Array.isArray(template.questions) || template.questions.length === 0) {
      console.error(`Skipping ${file}: no questions found`);
      continue;
    }

    const title = template.exam_summary?.exam_title || path.basename(file, ".json");
    const id = slugify(path.basename(file, ".json"));

    upsertExam(id, title, template);
    count += 1;
    console.log(`Seeded "${title}" as "${id}" (${template.questions.length} questions)`);
  }

  console.log(`Done. Seeded ${count} exam template(s).`);
}

main();
