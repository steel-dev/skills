import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateEvalCases } from "./validate-skills.mjs";

const CASE = 'schema_version: "1.1"\nname: demo\nexpected_outcome: |\n  A meaningful output.\n';
const PROMPT = '---\ntags: [skill-creator]\nmax_turns: 8\ntimeout_seconds: 180\nallowed_tools: [Read, Write]\n---\n\nPlan an offline task.';
const GRADER = '---\ntype: llm\nfocus: trace\nweight: 1\n---\n\nThe plan preserves ownership.';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "steel-evals-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = join(root, "demo");
  await mkdir(join(dir, "graders"), { recursive: true });
  await writeFile(join(dir, "case.yaml"), CASE);
  await writeFile(join(dir, "prompt.md"), PROMPT);
  await writeFile(join(dir, "graders/01-result.md"), GRADER);
  return { root, dir };
}

test("discovers folder cases while leaving legacy cases and results untouched", async (t) => {
  const { root } = await fixture(t);
  await writeFile(join(root, "evals.json"), '{"legacy":"unchanged"}');
  await mkdir(join(root, "results"));
  assert.equal(await validateEvalCases(root), 1);
  assert.equal(await readFile(join(root, "evals.json"), "utf8"), '{"legacy":"unchanged"}');
});

test("rejects malformed case metadata and missing assertions", async (t) => {
  const { root, dir } = await fixture(t);
  for (const content of [CASE.replace('"1.1"', '1.1'), CASE.replace("name: demo", "name: other"), CASE.replace("  A meaningful output.", "")]) {
    await writeFile(join(dir, "case.yaml"), content);
    await assert.rejects(validateEvalCases(root));
  }
  await writeFile(join(dir, "case.yaml"), CASE);
  await rm(join(dir, "graders/01-result.md"));
  await assert.rejects(validateEvalCases(root), /at least one grader/);
});

test("rejects malformed prompts and graders", async (t) => {
  const { root, dir } = await fixture(t);
  for (const content of [PROMPT.replace("max_turns: 8", "max_turns: 0"), PROMPT.replace("tags: [skill-creator]", "extra: true"), PROMPT.replace("Plan an offline task.", "")]) {
    await writeFile(join(dir, "prompt.md"), content);
    await assert.rejects(validateEvalCases(root));
  }
  await writeFile(join(dir, "prompt.md"), PROMPT);
  await writeFile(join(dir, "graders/01-result.md"), GRADER.replace("weight: 1", "weight: 0"));
  await assert.rejects(validateEvalCases(root), /weighted llm trace/);
});
