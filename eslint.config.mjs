import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Disable "Unexpected any" error
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // Warn instead of error, ignore variables prefixed with "_"
    },
  },
];

export default eslintConfig;
