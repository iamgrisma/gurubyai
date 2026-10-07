import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.SUPABASE_DB_URL;
if (!databaseUrl) {
  console.error("SUPABASE_DB_URL is required for the B9 race-lock test.");
  process.exit(2);
}

const key = "b9-race-lock-test";
const lockSql = [
  "begin;",
  "select pg_advisory_xact_lock(hashtextextended('" + key + "', 0));",
  "select pg_sleep(2);",
  "commit;"
].join("\n");
const waiterSql = [
  "begin;",
  "select pg_advisory_xact_lock(hashtextextended('" + key + "', 0));",
  "commit;"
].join("\n");

const holder = execFileAsync("psql", [
  databaseUrl,"-v","ON_ERROR_STOP=1","-X","-q","-c",lockSql
],{env:process.env,maxBuffer:1024*1024});

await new Promise(resolve=>setTimeout(resolve,250));
const waiterStart=Date.now();

await execFileAsync("psql",[
  databaseUrl,"-v","ON_ERROR_STOP=1","-X","-q","-c",waiterSql
],{env:process.env,maxBuffer:1024*1024});

const waitedMs=Date.now()-waiterStart;
await holder;

if(waitedMs<1200) throw new Error("B9 race-lock invariant failed: waiter was not serialized ("+waitedMs+"ms)");
console.log("B9 race-lock invariant passed: concurrent waiter serialized for ~"+waitedMs+"ms.");
