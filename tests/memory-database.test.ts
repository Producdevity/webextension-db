import { describe, expect, it } from "vitest";
import { createDatabase, isJsonObject, ValidationError } from "../src/index";
import type { Database } from "../src/types";

async function seedUsers(db: Database): Promise<void> {
  await db.batch([
    {
      type: "set",
      table: "users",
      key: "ada",
      value: { name: "Ada", age: 36, tags: ["math"], profile: { active: true } },
    },
    {
      type: "set",
      table: "users",
      key: "grace",
      value: { name: "Grace", age: 85, tags: ["compiler"], profile: { active: true } },
    },
    {
      type: "set",
      table: "users",
      key: "alan",
      value: { name: "Alan", age: 41, tags: ["math"], profile: { active: false } },
    },
  ]);
}

describe("memory database lifecycle", () => {
  it("stores, reads, deletes, and lists records by table", async () => {
    const db = await createDatabase({ name: "memory-basic", backend: "memory" });

    await db.set("users", "ada", { name: "Ada", active: true });
    await db.set("settings", "theme", "dark");

    expect(await db.get("users", "ada")).toEqual({ name: "Ada", active: true });
    expect(await db.has("users", "ada")).toBe(true);
    expect(await db.keys("users")).toEqual(["ada"]);
    expect(await db.listTables()).toEqual(["settings", "users"]);

    await db.delete("users", "ada");

    expect(await db.get("users", "ada")).toBeUndefined();
    expect(await db.has("users", "ada")).toBe(false);
  });

  it("returns cloned values from reads", async () => {
    const db = await createDatabase({ name: "memory-clone", backend: "memory" });
    await db.set("users", "ada", { name: "Ada", active: true });

    const user = await db.get("users", "ada");
    if (user !== undefined && isJsonObject(user)) {
      Object.assign(user, { active: false });
    }

    expect(await db.get("users", "ada")).toEqual({ name: "Ada", active: true });
  });

  it("clears tables without touching other tables", async () => {
    const db = await createDatabase({ name: "memory-clear", backend: "memory" });

    await db.set("users", "ada", { name: "Ada" });
    await db.set("settings", "theme", "dark");
    await db.clear("users");

    expect(await db.entries("users")).toEqual([]);
    expect(await db.get("settings", "theme")).toBe("dark");
  });

  it("validates names", async () => {
    const db = await createDatabase({ name: "memory-validation", backend: "memory" });

    await expect(db.set("", "key", true)).rejects.toThrow(ValidationError);
    await expect(db.set("table", "", true)).rejects.toThrow(ValidationError);
  });
});

describe("memory database queries", () => {
  it("filters and sorts records", async () => {
    const db = await createDatabase({ name: "memory-query-filter", backend: "memory" });
    await seedUsers(db);

    const activeUsers = await db.find(
      "users",
      { "profile.active": true, age: { $gte: 40 } },
      { sort: { age: "asc" } },
    );

    expect(activeUsers.map((entry) => entry.key)).toEqual(["grace"]);
  });

  it("paginates and counts records", async () => {
    const db = await createDatabase({ name: "memory-query-pagination", backend: "memory" });
    await seedUsers(db);

    const mathUsers = await db.find(
      "users",
      { name: { $regex: "^A" } },
      { sort: { age: -1 }, limit: 1 },
    );

    expect(mathUsers.map((entry) => entry.key)).toEqual(["alan"]);
    expect(await db.count("users", { tags: { $exists: true } })).toBe(3);
  });
});
