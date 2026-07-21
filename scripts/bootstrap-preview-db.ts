import { execFileSync } from "node:child_process";

if (process.env.VERCEL_ENV === "preview") {
  console.log("Initializing Preview database");
  execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
  execFileSync("npx", ["prisma", "generate"], { stdio: "inherit" });
  execFileSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
}
