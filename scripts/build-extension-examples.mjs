import { cp, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionsRoot = join(root, "examples/extensions");
const sharedRoot = join(extensionsRoot, "shared");
const outputRoot = join(extensionsRoot, "dist");
const targets = ["chrome", "firefox", "safari"];

await rm(outputRoot, { force: true, recursive: true });

async function buildTarget(target) {
  const targetRoot = join(extensionsRoot, target);
  const outputDirectory = join(outputRoot, target);

  await build({
    build: {
      emptyOutDir: true,
      minify: false,
      outDir: outputDirectory,
      rollupOptions: {
        input: {
          background: join(targetRoot, "background.ts"),
          popup: join(sharedRoot, "popup.ts"),
        },
        output: {
          assetFileNames: "assets/[name][extname]",
          chunkFileNames: "chunks/[name].js",
          entryFileNames: "[name].js",
        },
      },
      sourcemap: false,
      target: "es2022",
    },
    configFile: false,
    logLevel: "warn",
    publicDir: false,
    resolve: {
      alias: {
        "webextension-db": join(root, "src/index.ts"),
      },
    },
    root,
  });

  await cp(join(targetRoot, "manifest.json"), join(outputDirectory, "manifest.json"));
  await cp(join(sharedRoot, "popup.html"), join(outputDirectory, "popup.html"));
  await cp(join(sharedRoot, "popup.css"), join(outputDirectory, "popup.css"));
}

await Promise.all(targets.map((target) => buildTarget(target)));

console.info(`Built extension examples in ${outputRoot}`);
