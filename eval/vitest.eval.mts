// Separate config so the eval never joins the project's own test run (which is the
// loop's independent GUARD), and vice versa.
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["eval/score.eval.ts"], testTimeout: 120_000 },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "..") } },
});
