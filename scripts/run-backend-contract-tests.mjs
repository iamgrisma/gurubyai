import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const files = [
  "tests/backend/b9_contract_assertions.sql",
  "tests/backend/b9_security_invariants.sql",
  "tests/backend/b9_production_invariants.sql",
  "tests/backend/b9_wallet_reconciliation.sql",
  "tests/backend/b9_b7_queue_invariants.sql",
  "tests/backend/b9_authenticated_integration.sql",
];

const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error("SUPABASE_DB_URL is required for backend contract tests.");
  process.exit(2);
}

for (const file of files) {
  await access(file);
  await readFile(file, "utf8");

  process.stdout.write("\n==> " + file + "\n");
  try {
    const { stdout, stderr } = await execFileAsync("psql", [
      databaseUrl, "-v", "ON_ERROR_STOP=1", "-X", "-q", "-f", file,
    ], { env: process.env, maxBuffer: 4 * 1024 * 1024 });

    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (error) {
    console.error(error?.stderr || error?.message || error);
    process.exit(error?.code || 1);
  }
}

console.log("\n==> scripts/run-b9-race-lock-test.mjs");
try {
  const { stdout, stderr } = await execFileAsync("node", [
    "scripts/run-b9-race-lock-test.mjs",
  ], { env: process.env, maxBuffer: 4 * 1024 * 1024 });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
} catch (error) {
  console.error(error?.stderr || error?.message || error);
  process.exit(error?.code || 1);
}

console.log("\nB9 backend contract suite passed.");
