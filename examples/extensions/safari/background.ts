import { createDatabase } from "webextension-db";

function logError(error: unknown): void {
  console.error(error instanceof Error ? error.message : String(error));
}

async function seedExampleData(): Promise<void> {
  const db = await createDatabase({
    name: "safari-extension-example",
  });

  await db.set("preferences", "reader", {
    fontSize: 18,
    enabled: true,
    updatedAt: new Date().toISOString(),
  });

  const readerEnabled = await db.has("preferences", "reader");
  const tables = await db.listTables();

  console.info(`Safari reader preferences stored: ${String(readerEnabled)}`);
  console.info(`Safari extension tables: ${tables.join(", ")}`);
}

seedExampleData().catch(logError);
