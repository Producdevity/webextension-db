import { createDatabase } from "webextension-db";

function logError(error: unknown): void {
  console.error(error instanceof Error ? error.message : String(error));
}

async function seedExampleData(): Promise<void> {
  const db = await createDatabase({
    name: "firefox-extension-example",
    backend: "browser-storage",
    storageArea: "local",
  });

  await db.set("tabs", crypto.randomUUID(), {
    title: "Example page",
    url: "https://example.com",
    capturedAt: new Date().toISOString(),
  });

  const exampleTabs = await db.find(
    "tabs",
    {
      url: "https://example.com",
    },
    {
      limit: 10,
    },
  );

  console.info(`Firefox extension records for example.com: ${exampleTabs.length}`);
}

seedExampleData().catch(logError);
