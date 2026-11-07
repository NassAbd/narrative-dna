import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["src/lib/jury/backend.backend-test.ts"] },
});
