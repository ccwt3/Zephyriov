import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "public/sw.js"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Catalog data modules export plain objects by design.
    files: ["scripts/**/*.mjs"],
    rules: { "import/no-anonymous-default-export": "off" },
  },
];

export default eslintConfig;
