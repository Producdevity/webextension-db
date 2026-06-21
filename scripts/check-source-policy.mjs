import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative } from "node:path";
import { argv, cwd, exit } from "node:process";

const roots = argv.slice(2);
const searchRoots = roots.length > 0 ? roots : ["src", "tests", "examples"];

const checks = [
  {
    name: "unsafe top type",
    pattern: new RegExp(String.raw`\b${"a"}${"ny"}\b`),
  },
  {
    name: "type assertion",
    pattern: /\bas\s+(const|[A-Za-z_{[])/,
  },
  {
    name: "TypeScript suppression",
    pattern: /@ts-(ignore|expect-error|nocheck|check)\b/,
  },
  {
    name: "linter suppression",
    pattern: /(eslint|biome)-/,
  },
];

const ignoredDirectories = new Set(["node_modules", "dist", "docs", "coverage"]);

function collectTypeScriptFiles(path) {
  const status = statSync(path, { throwIfNoEntry: false });

  if (status === undefined) {
    return [];
  }

  if (status.isFile()) {
    return path.endsWith(".ts") ? [path] : [];
  }

  if (!status.isDirectory()) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(path)) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    files.push(...collectTypeScriptFiles(`${path}/${entry}`));
  }

  return files;
}

const files = searchRoots.flatMap((root) => collectTypeScriptFiles(root));

let failed = false;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    for (const check of checks) {
      if (check.pattern.test(line)) {
        failed = true;
        console.error(
          `${relative(cwd(), file)}:${index + 1} violates source policy: ${check.name}`,
        );
      }
    }
  }
}

if (failed) {
  exit(1);
}
