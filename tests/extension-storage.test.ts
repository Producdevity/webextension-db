import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExtensionStorageArea, ExtensionStorageKeys } from "../src/environment";
import { createDatabase, detectStorageCapabilities } from "../src/index";

class InMemoryExtensionStorageArea implements ExtensionStorageArea {
  private readonly records = new Map<string, unknown>();

  async get(keys?: ExtensionStorageKeys): Promise<Record<string, unknown>> {
    if (keys === undefined || keys === null) {
      return this.allRecords();
    }

    if (typeof keys === "string") {
      return this.pickRecords([keys]);
    }

    if (Array.isArray(keys)) {
      return this.pickRecords(keys);
    }

    const records = this.pickRecords(Object.keys(keys));

    for (const [key, fallback] of Object.entries(keys)) {
      if (records[key] === undefined) {
        records[key] = fallback;
      }
    }

    return records;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      this.records.set(key, value);
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    const requestedKeys = typeof keys === "string" ? [keys] : keys;

    for (const key of requestedKeys) {
      this.records.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  async getBytesInUse(): Promise<number> {
    return JSON.stringify(this.allRecords()).length;
  }

  private allRecords(): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    for (const [key, value] of this.records.entries()) {
      output[key] = value;
    }

    return output;
  }

  private pickRecords(keys: string[]): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    for (const key of keys) {
      const value = this.records.get(key);
      if (value !== undefined) {
        output[key] = value;
      }
    }

    return output;
  }
}

describe("extension storage backend", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses promise-based chrome.storage areas", async () => {
    const local = new InMemoryExtensionStorageArea();
    vi.stubGlobal("chrome", {
      storage: {
        local,
      },
    });

    const db = await createDatabase({
      name: "chrome-storage-test",
      backend: "chrome-storage",
    });

    await db.set("users", "ada", { name: "Ada" });

    expect(await db.get("users", "ada")).toEqual({ name: "Ada" });
    expect(await db.listTables()).toEqual(["users"]);

    await db.destroy();
    expect(await local.get(null)).toEqual({});
  });

  it("detects browser.storage areas", () => {
    vi.stubGlobal("browser", {
      storage: {
        local: new InMemoryExtensionStorageArea(),
      },
    });

    expect(detectStorageCapabilities()).toMatchObject({
      browserStorage: true,
    });
  });
});
