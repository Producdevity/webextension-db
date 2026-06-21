import { createDatabase, isJsonObject } from "../src/index";

const db = await createDatabase({
  name: "example-extension-db",
  backend: "memory",
});

await db.set("users", "current", {
  name: "Ada Lovelace",
  role: "admin",
  settings: {
    theme: "dark",
  },
});

const user = await db.get("users", "current");

if (user !== undefined && isJsonObject(user)) {
  console.log(JSON.stringify(user));
}

const admins = await db.find("users", {
  role: "admin",
});

console.log(`Admin records: ${admins.length}`);
