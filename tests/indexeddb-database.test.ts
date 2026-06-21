import { indexedDB } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../src/index";

describe("IndexedDB database", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", indexedDB);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists records across database instances", async () => {
    const first = await createDatabase({
      name: "indexeddb-persistence",
      backend: "indexeddb",
    });

    await first.set("users", "ada", { name: "Ada" });
    await first.close();

    const second = await createDatabase({
      name: "indexeddb-persistence",
      backend: "indexeddb",
    });

    expect(await second.get("users", "ada")).toEqual({ name: "Ada" });
    await second.destroy();
  });

  it("selects IndexedDB automatically when available", async () => {
    const db = await createDatabase({ name: "indexeddb-auto" });

    expect(db.backend).toBe("indexeddb");
    await db.destroy();
  });
});
