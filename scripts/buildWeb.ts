/// <reference types="node" />

import { spawn } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const adapterPath = join(projectRoot, "src/utils/platformAdapter.ts");

type AdapterMode = "tauri" | "web";

function stripLineComments(content: string) {
  return content
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

function detectAdapterMode(content: string): AdapterMode {
  const activeContent = stripLineComments(content);
  const usesTauriAdapter =
    /import\s*\{\s*createTauriAdapter\s*\}\s*from\s*["']\.\/tauriAdapter["']/.test(
      activeContent
    ) && /platformAdapter\s*=\s*createTauriAdapter\s*\(/.test(activeContent);
  const usesWebAdapter =
    /import\s*\{\s*createWebAdapter\s*\}\s*from\s*["']\.\/webAdapter["']/.test(
      activeContent
    ) && /platformAdapter\s*=\s*createWebAdapter\s*\(/.test(activeContent);

  if (usesTauriAdapter && !usesWebAdapter) {
    return "tauri";
  }

  if (usesWebAdapter && !usesTauriAdapter) {
    return "web";
  }

  throw new Error(
    `Unable to detect active platform adapter in ${adapterPath}. ` +
      `Expected either createTauriAdapter() or createWebAdapter() to be active.`
  );
}

function setLineComment(line: string, commented: boolean) {
  const indent = line.match(/^\s*/)?.[0] ?? "";
  const content = line.slice(indent.length);
  const uncommented = content.replace(/^\/\/\s?/, "");

  return commented ? `${indent}// ${uncommented}` : `${indent}${uncommented}`;
}

function switchToWebAdapter(content: string) {
  let hasTauriImport = false;
  let hasTauriInit = false;
  let hasWebImport = false;
  let hasWebInit = false;

  const nextContent = content
    .split(/\r?\n/)
    .map((line) => {
      const normalized = line.trim().replace(/^\/\/\s?/, "");

      if (
        normalized === 'import { createTauriAdapter } from "./tauriAdapter";'
      ) {
        hasTauriImport = true;
        return setLineComment(line, true);
      }

      if (normalized === "let platformAdapter = createTauriAdapter();") {
        hasTauriInit = true;
        return setLineComment(line, true);
      }

      if (normalized === 'import { createWebAdapter } from "./webAdapter";') {
        hasWebImport = true;
        return setLineComment(line, false);
      }

      if (normalized === "let platformAdapter = createWebAdapter();") {
        hasWebInit = true;
        return setLineComment(line, false);
      }

      return line;
    })
    .join("\n");

  if (!hasTauriImport || !hasTauriInit || !hasWebImport || !hasWebInit) {
    throw new Error(
      `Unable to switch ${adapterPath} to Web mode. ` +
        `Expected both Tauri and Web adapter import/init lines to exist.`
    );
  }

  detectAdapterMode(nextContent);
  return nextContent;
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        BUILD_TARGET: "web",
      },
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function main() {
  const originalContent = readFileSync(adapterPath, "utf-8");
  const originalMode = detectAdapterMode(originalContent);
  const shouldRestore = originalMode !== "web";

  if (shouldRestore) {
    console.log("[build:web] Switching platform adapter to Web for packaging.");
    writeFileSync(adapterPath, switchToWebAdapter(originalContent), "utf-8");
  } else {
    console.log("[build:web] Platform adapter is already Web; leaving it as-is.");
  }

  try {
    await run("pnpm", ["exec", "tsc"]);
    await run("pnpm", ["exec", "tsup", "--format", "esm"]);
  } finally {
    if (shouldRestore) {
      writeFileSync(adapterPath, originalContent, "utf-8");
      console.log("[build:web] Restored original platform adapter.");
    } else {
      console.log("[build:web] Kept platform adapter in original Web mode.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
