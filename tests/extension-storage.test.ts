import { indexedDB } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ExtensionStorageArea,
  ExtensionStorageKeys,
  ReadonlyExtensionStorageArea,
} from "../src/environment";
import { createDatabase, detectStorageCapabilities, StorageError } from "../src/index";
import { formatStorageKey } from "../src/keys";

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

class CallbackExtensionStorageArea implements ExtensionStorageArea {
  private readonly records = new Map<string, unknown>();

  get(
    keys?: ExtensionStorageKeys,
    callback?: (items: Record<string, unknown>) => unknown,
  ): undefined {
    if (keys === undefined || keys === null) {
      callback?.(this.allRecords());
      return;
    }

    if (typeof keys === "string") {
      callback?.(this.pickRecords([keys]));
      return;
    }

    if (Array.isArray(keys)) {
      callback?.(this.pickRecords(keys));
      return;
    }

    const records = this.pickRecords(Object.keys(keys));

    for (const [key, fallback] of Object.entries(keys)) {
      if (records[key] === undefined) {
        records[key] = fallback;
      }
    }

    callback?.(records);
  }

  set(items: Record<string, unknown>, callback?: () => unknown): undefined {
    for (const [key, value] of Object.entries(items)) {
      this.records.set(key, value);
    }

    callback?.();
  }

  remove(keys: string | string[], callback?: () => unknown): undefined {
    const requestedKeys = typeof keys === "string" ? [keys] : keys;

    for (const key of requestedKeys) {
      this.records.delete(key);
    }

    callback?.();
  }

  clear(callback?: () => unknown): undefined {
    this.records.clear();
    callback?.();
  }

  snapshot(): Record<string, unknown> {
    return this.allRecords();
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

class KeyListingExtensionStorageArea extends InMemoryExtensionStorageArea {
  getCalls = 0;
  getKeysCalls = 0;

  override async get(keys?: ExtensionStorageKeys): Promise<Record<string, unknown>> {
    this.getCalls += 1;
    return super.get(keys);
  }

  async getKeys(): Promise<string[]> {
    this.getKeysCalls += 1;
    return Object.keys(await super.get(null));
  }
}

class ManagedExtensionStorageArea implements ReadonlyExtensionStorageArea {
  constructor(private readonly records: Record<string, unknown>) {}

  async get(keys?: ExtensionStorageKeys): Promise<Record<string, unknown>> {
    if (keys === undefined || keys === null) {
      return { ...this.records };
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

  async getKeys(): Promise<string[]> {
    return Object.keys(this.records);
  }

  private pickRecords(keys: string[]): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    for (const key of keys) {
      const value = this.records[key];
      if (value !== undefined) {
        output[key] = value;
      }
    }

    return output;
  }
}

interface RuntimeStub {
  lastError: { message: string } | undefined;
}

class RuntimeErrorStorageArea implements ExtensionStorageArea {
  constructor(private readonly runtime: RuntimeStub) {}

  get(
    _keys?: ExtensionStorageKeys,
    callback?: (items: Record<string, unknown>) => unknown,
  ): undefined {
    callback?.({});
  }

  set(_items: Record<string, unknown>, callback?: () => unknown): undefined {
    this.runtime.lastError = { message: "quota exceeded" };
    callback?.();
    this.runtime.lastError = undefined;
  }

  remove(_keys: string | string[], callback?: () => unknown): undefined {
    callback?.();
  }

  clear(callback?: () => unknown): undefined {
    callback?.();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("promise extension storage backend", () => {
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

  it("uses promise-based browser.storage areas", async () => {
    const local = new InMemoryExtensionStorageArea();
    vi.stubGlobal("browser", {
      storage: {
        local,
      },
    });

    const db = await createDatabase({
      name: "browser-storage-test",
      backend: "browser-storage",
    });

    await db.set("users", "ada", { name: "Ada" });

    expect(await db.get("users", "ada")).toEqual({ name: "Ada" });
    expect(await db.listTables()).toEqual(["users"]);

    await db.destroy();
    expect(await local.get(null)).toEqual({});
  });
});

describe("session extension storage backend", () => {
  it("selects session storage when the area is explicit", async () => {
    const session = new InMemoryExtensionStorageArea();
    vi.stubGlobal("indexedDB", indexedDB);
    vi.stubGlobal("chrome", {
      storage: {
        session,
      },
    });

    const db = await createDatabase({
      name: "chrome-session-storage-test",
      storageArea: "session",
    });

    await db.set("users", "ada", { name: "Ada" });

    expect(db.access).toBe("readwrite");
    expect(db.backend).toBe("chrome-storage");
    expect(await db.get("users", "ada")).toEqual({ name: "Ada" });
    expect(await db.listTables()).toEqual(["users"]);

    await db.destroy();
    expect(await session.get(null)).toEqual({});
  });
});

describe("extension storage key enumeration", () => {
  it("uses StorageArea.getKeys when the browser provides it", async () => {
    const local = new KeyListingExtensionStorageArea();
    await local.set({
      [formatStorageKey("chrome-getkeys-test", "users", "ada")]: { name: "Ada" },
      [formatStorageKey("chrome-getkeys-test", "settings", "theme")]: "dark",
    });

    vi.stubGlobal("chrome", {
      storage: {
        local,
      },
    });

    const db = await createDatabase({
      name: "chrome-getkeys-test",
      backend: "chrome-storage",
    });

    expect(await db.keys("users")).toEqual(["ada"]);
    expect(await db.listTables()).toEqual(["settings", "users"]);
    expect(local.getKeysCalls).toBe(2);
    expect(local.getCalls).toBe(0);
  });
});

describe("managed extension storage backend", () => {
  it("reads chrome.storage.managed through a readonly database", async () => {
    const managed = new ManagedExtensionStorageArea({
      [formatStorageKey("managed-policy-test", "policies", "feature")]: {
        enabled: true,
      },
    });

    vi.stubGlobal("chrome", {
      storage: {
        managed,
      },
    });

    const db = await createDatabase({
      name: "managed-policy-test",
      backend: "chrome-storage",
      storageArea: "managed",
    });

    expect(db.access).toBe("readonly");
    expect(db.backend).toBe("chrome-storage");
    expect("set" in db).toBe(false);
    expect("destroy" in db).toBe(false);
    expect(await db.get("policies", "feature")).toEqual({ enabled: true });
    expect(await db.keys("policies")).toEqual(["feature"]);
    expect(await db.listTables()).toEqual(["policies"]);
  });

  it("selects browser.storage.managed automatically for managed storage", async () => {
    const managed = new ManagedExtensionStorageArea({
      [formatStorageKey("browser-managed-policy-test", "policies", "homepage")]: {
        locked: true,
      },
    });

    vi.stubGlobal("browser", {
      storage: {
        managed,
      },
    });

    const db = await createDatabase({
      name: "browser-managed-policy-test",
      storageArea: "managed",
    });

    expect(db.access).toBe("readonly");
    expect(db.backend).toBe("browser-storage");
    expect(await db.get("policies", "homepage")).toEqual({ locked: true });
  });
});

describe("callback extension storage backend", () => {
  it("uses callback-based chrome.storage areas", async () => {
    const local = new CallbackExtensionStorageArea();
    vi.stubGlobal("chrome", {
      runtime: {},
      storage: {
        local,
      },
    });

    const db = await createDatabase({
      name: "chrome-callback-storage-test",
      backend: "chrome-storage",
    });

    await db.set("users", "ada", { name: "Ada" });

    expect(await db.get("users", "ada")).toEqual({ name: "Ada" });
    expect(await db.listTables()).toEqual(["users"]);

    await db.destroy();
    expect(local.snapshot()).toEqual({});
  });

  it("rejects callback storage failures from runtime lastError", async () => {
    const runtime: RuntimeStub = { lastError: undefined };
    vi.stubGlobal("chrome", {
      runtime,
      storage: {
        local: new RuntimeErrorStorageArea(runtime),
      },
    });

    const db = await createDatabase({
      name: "chrome-callback-error-test",
      backend: "chrome-storage",
    });

    await expect(db.set("users", "ada", { name: "Ada" })).rejects.toThrow(StorageError);
  });
});

describe("extension storage detection", () => {
  it("detects browser.storage areas", () => {
    vi.stubGlobal("browser", {
      storage: {
        local: new InMemoryExtensionStorageArea(),
        managed: new ManagedExtensionStorageArea({}),
      },
    });

    const capabilities = detectStorageCapabilities();

    expect(capabilities).toMatchObject({
      browserStorage: true,
    });
    expect(capabilities.storageAreas).toContainEqual({
      area: "managed",
      access: "readonly",
      chromeStorage: false,
      browserStorage: true,
    });
  });
});
