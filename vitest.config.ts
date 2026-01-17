import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster tests (Edge-compatible)
    environment: "happy-dom",
    // Include test files
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Exclude node_modules and build artifacts
    exclude: [
      "node_modules",
      ".next",
      ".open-next",
      "dist",
    ],
    // Global test utilities
    globals: true,
    // Setup files (if needed in future)
    // setupFiles: ['./src/test/setup.ts'],
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        ".open-next/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
      ],
    },
    // Test timeout
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      // Match tsconfig paths
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
