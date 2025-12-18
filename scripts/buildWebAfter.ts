import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const extractCssVars = () => {
  const filePath = join(__dirname, "../out/search-chat/index.css");

  const cssContent = readFileSync(filePath, "utf-8");

  const vars: Record<string, string> = {};

  const propertyBlockRegex = /@property\s+(--[\w-]+)\s*\{([\s\S]*?)\}/g;

  let match: RegExpExecArray | null;

  while ((match = propertyBlockRegex.exec(cssContent))) {
    const [, varName, body] = match;

    const initialValueMatch = /initial-value\s*:\s*([^;]+);/.exec(body);

    if (initialValueMatch) {
      vars[varName] = initialValueMatch[1].trim();
    }
  }

  const cssVarsBlock =
    `.coco-container {\n` +
    Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n") +
    `\n}\n`;

  writeFileSync(filePath, `${cssContent}\n${cssVarsBlock}`, "utf-8");
};

extractCssVars();
