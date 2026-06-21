import { createDatabase, isJsonObject } from "webextension-db";

function logError(error: unknown): void {
  console.error(error instanceof Error ? error.message : String(error));
}

async function seedExampleData(): Promise<void> {
  const db = await createDatabase({
    name: "chrome-extension-example",
    backend: "chrome-storage",
    storageArea: "local",
  });

  await db.set("settings", "toolbar", {
    badgeText: "DB",
    enabled: true,
    installedAt: new Date().toISOString(),
  });

  const toolbarSettings = await db.get("settings", "toolbar");

  if (toolbarSettings !== undefined && isJsonObject(toolbarSettings)) {
    console.info(`Chrome settings stored: ${JSON.stringify(toolbarSettings)}`);
  }

  const settingsCount = await db.count("settings");

  console.info(`Chrome extension settings records: ${settingsCount}`);
}

seedExampleData().catch(logError);
