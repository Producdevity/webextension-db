# WebExtension DB

WebExtension DB is a small TypeScript library for persistent JSON data in browser extensions. It uses IndexedDB by default and can use `chrome.storage` or `browser.storage` when a project explicitly chooses those backends.

The package does not expose a SQL or ORM layer. Those APIs were removed because they were not proven against the browser environments this package targets.

## Install

```bash
pnpm add webextension-db
```

## Usage

In an extension page, content script, or service worker, the default backend selects IndexedDB when it is available:

```ts
import { createDatabase, isJsonObject } from "webextension-db";

const db = await createDatabase({
  name: "settings-db",
});

await db.set("settings", "theme", {
  mode: "dark",
  sync: true,
});

const value = await db.get("settings", "theme");

if (value !== undefined && isJsonObject(value)) {
  console.log(JSON.stringify(value));
}
```

## Backends

By default, `createDatabase` selects the first durable backend available in this order:

1. `indexeddb`
2. `chrome-storage`
3. `browser-storage`

Tests and temporary tools can opt into the in-memory backend:

```ts
const db = await createDatabase({
  name: "test-db",
  backend: "memory",
});
```

Use `memory` for Node.js scripts and tests that do not provide browser storage APIs.

Extension storage can also be selected directly:

```ts
const db = await createDatabase({
  name: "extension-db",
  backend: "chrome-storage",
  storageArea: "local",
});
```

When `storageArea` is set and `backend` is omitted, `createDatabase` selects an available extension storage backend for that area instead of falling back to IndexedDB.
Supported extension storage areas are `local`, `sync`, `session`, and `managed`.
`session` is read/write but memory-backed by the browser and is cleared when the extension is unloaded.
`managed` is read-only policy storage, so `createDatabase` returns a read-only database for that area:

```ts
const policyDb = await createDatabase({
  name: "policy-db",
  backend: "browser-storage",
  storageArea: "managed",
});

const policy = await policyDb.get("policies", "homepage");
```

Complete Chrome, Firefox, and Safari extension examples are available in `examples/extensions`.

## API

### `createDatabase(config)`

Creates a database instance.

```ts
const db = await createDatabase({
  name: "my-db",
  backend: "indexeddb",
  version: 1,
});
```

`backend` is optional. `version` applies to IndexedDB schema upgrades.

### Records

Records are addressed by table and key.

```ts
await db.set("users", "ada", { name: "Ada Lovelace", active: true });

const user = await db.get("users", "ada");
const exists = await db.has("users", "ada");

await db.delete("users", "ada");
```

Values must be JSON-compatible: strings, finite numbers, booleans, null, arrays, and plain objects containing those values.

### Tables

```ts
const keys = await db.keys("users");
const entries = await db.entries("users");
const tables = await db.listTables();

await db.clear("users");
```

### Queries

`find` filters records in one table. Dot paths read nested object fields.

```ts
const activeAdmins = await db.find(
  "users",
  {
    role: "admin",
    "profile.active": true,
    age: { $gte: 18 },
  },
  {
    sort: { age: "asc" },
    limit: 20,
  },
);
```

Supported operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$regex`, and `$exists`.

### Batch Operations

```ts
await db.batch([
  { type: "set", table: "users", key: "ada", value: { name: "Ada" } },
  { type: "delete", table: "cache", key: "stale-entry" },
  { type: "clear", table: "sessions" },
]);
```

Batch operations run in order. They are not a transaction boundary.

## Development

This repository uses pnpm.

```bash
pnpm install
pnpm verify
```

Useful commands:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm test:browsers
pnpm build
```

Before running browser-engine tests locally, install the Playwright browser binaries:

```bash
pnpm test:browsers:install
```

The lint step runs Biome and a source policy check that rejects explicit `any`, type assertions, TypeScript suppression comments, and linter suppression comments in source, tests, and examples.
