import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Windows sandbox temp folders can reject Vite's atomic cache rename.
const env = { ...process.env };
if (process.platform === "win32") {
  const temp = fileURLToPath(new URL("../.codex-artifacts/test-temp/", import.meta.url));
  mkdirSync(temp, { recursive: true });
  env.TEMP = temp;
  env.TMP = temp;
}
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url)),
  ...process.argv.slice(2),
], { env, stdio: "inherit" });
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
