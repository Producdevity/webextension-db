import {
  createDatabase,
  type Database,
  type DatabaseConfig,
  type DatabaseReader,
  type ExtensionStorageAreaName,
  isJsonObject,
  isJsonValue,
  type JsonValue,
  type QueryFilter,
  type StorageBackendType,
} from "webextension-db";

type BackendChoice = "auto" | StorageBackendType;
type AreaChoice = "default" | ExtensionStorageAreaName;

type ConfigResult =
  | {
      config: DatabaseConfig;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

const backendChoices: BackendChoice[] = [
  "auto",
  "indexeddb",
  "chrome-storage",
  "browser-storage",
  "memory",
];
const areaChoices: AreaChoice[] = ["default", "local", "sync", "session", "managed"];

const databaseName = inputElement("databaseName");
const backendSelect = selectElement("backend");
const storageAreaSelect = selectElement("storageArea");
const activeBackend = elementById("activeBackend");
const runtimeLabel = elementById("runtimeLabel");
const statusOutput = elementById("status");
const tableName = inputElement("tableName");
const recordKey = inputElement("recordKey");
const recordValue = textAreaElement("recordValue");
const queryFilter = textAreaElement("queryFilter");
const resultOutput = elementById("result");
const writeRecord = buttonElement("writeRecord");
const readRecord = buttonElement("readRecord");
const deleteRecord = buttonElement("deleteRecord");
const listRecords = buttonElement("listRecords");
const clearTable = buttonElement("clearTable");
const findRecords = buttonElement("findRecords");
const countRecords = buttonElement("countRecords");
const listTables = buttonElement("listTables");
const destroyDatabase = buttonElement("destroyDatabase");
const resetOutput = buttonElement("resetOutput");

function elementById(id: string): HTMLElement {
  const element = document.getElementById(id);

  if (element === null) {
    throw new Error(`Missing element: ${id}`);
  }

  return element;
}

function inputElement(id: string): HTMLInputElement {
  const element = elementById(id);

  if (element instanceof HTMLInputElement) {
    return element;
  }

  throw new Error(`Expected input: ${id}`);
}

function selectElement(id: string): HTMLSelectElement {
  const element = elementById(id);

  if (element instanceof HTMLSelectElement) {
    return element;
  }

  throw new Error(`Expected select: ${id}`);
}

function textAreaElement(id: string): HTMLTextAreaElement {
  const element = elementById(id);

  if (element instanceof HTMLTextAreaElement) {
    return element;
  }

  throw new Error(`Expected textarea: ${id}`);
}

function buttonElement(id: string): HTMLButtonElement {
  const element = elementById(id);

  if (element instanceof HTMLButtonElement) {
    return element;
  }

  throw new Error(`Expected button: ${id}`);
}

function isBackendChoice(value: string): value is BackendChoice {
  return backendChoices.some((choice) => choice === value);
}

function isAreaChoice(value: string): value is AreaChoice {
  return areaChoices.some((choice) => choice === value);
}

function backendChoice(): BackendChoice {
  const value = backendSelect.value;

  if (isBackendChoice(value)) {
    return value;
  }

  throw new Error(`Unsupported backend: ${value}`);
}

function areaChoice(): AreaChoice {
  const value = storageAreaSelect.value;

  if (isAreaChoice(value)) {
    return value;
  }

  throw new Error(`Unsupported storage area: ${value}`);
}

function isWritableDatabase(db: DatabaseReader): db is Database {
  return db.access === "readwrite";
}

function configFromControls(): ConfigResult {
  const name = databaseName.value.trim();
  const backend = backendChoice();
  const area = areaChoice();

  if (name.length === 0) {
    return { message: "Database name is required.", ok: false };
  }

  if (backend === "auto") {
    if (area === "default") {
      return { config: { name }, ok: true };
    }

    return { config: { name, storageArea: area }, ok: true };
  }

  if (backend === "indexeddb" || backend === "memory") {
    if (area !== "default") {
      return {
        message: "Storage areas only apply to chrome.storage and browser.storage.",
        ok: false,
      };
    }

    return { config: { backend, name }, ok: true };
  }

  if (area === "default") {
    return { config: { backend, name }, ok: true };
  }

  return { config: { backend, name, storageArea: area }, ok: true };
}

async function openDatabase(): Promise<DatabaseReader> {
  const result = configFromControls();

  if (!result.ok) {
    throw new Error(result.message);
  }

  const db = await createDatabase(result.config);
  activeBackend.textContent = `${db.backend} / ${db.access}`;
  setWriteControlsEnabled(db.access === "readwrite");
  return db;
}

function setWriteControlsEnabled(enabled: boolean): void {
  writeRecord.disabled = !enabled;
  deleteRecord.disabled = !enabled;
  clearTable.disabled = !enabled;
  destroyDatabase.disabled = !enabled;
}

function selectedTable(): string {
  const table = tableName.value.trim();

  if (table.length === 0) {
    throw new Error("Table is required.");
  }

  return table;
}

function selectedKey(): string {
  const key = recordKey.value.trim();

  if (key.length === 0) {
    throw new Error("Key is required.");
  }

  return key;
}

function selectedValue(): JsonValue {
  const value: unknown = JSON.parse(recordValue.value);

  if (isJsonValue(value)) {
    return value;
  }

  throw new Error("Value must be JSON-compatible.");
}

function selectedFilter(): QueryFilter {
  const raw = queryFilter.value.trim();

  if (raw.length === 0) {
    return {};
  }

  const value: unknown = JSON.parse(raw);

  if (!(isJsonValue(value) && isJsonObject(value))) {
    throw new Error("Find filter must be a JSON object.");
  }

  const filter: QueryFilter = {};

  for (const [path, condition] of Object.entries(value)) {
    filter[path] = condition;
  }

  return filter;
}

function writeResult(value: unknown): void {
  resultOutput.textContent = JSON.stringify(value, null, 2) ?? "undefined";
}

function setStatus(message: string, error = false): void {
  statusOutput.textContent = message;
  statusOutput.classList.toggle("error", error);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function runOperation(operation: () => Promise<unknown>, successMessage: string): void {
  setStatus("Running");

  operation()
    .then((value) => {
      writeResult(value);
      setStatus(successMessage);
    })
    .catch((error: unknown) => {
      writeResult({ error: errorMessage(error) });
      setStatus("Error", true);
    });
}

async function withWritableDatabase(
  operation: (db: Database) => Promise<unknown>,
): Promise<unknown> {
  const db = await openDatabase();

  if (!isWritableDatabase(db)) {
    throw new Error("The selected backend is read-only.");
  }

  return operation(db);
}

function runtimeName(): string {
  const hasChrome = Reflect.has(globalThis, "chrome");
  const hasBrowser = Reflect.has(globalThis, "browser");

  if (hasChrome && hasBrowser) {
    return "chrome + browser APIs";
  }

  if (hasChrome) {
    return "chrome API";
  }

  if (hasBrowser) {
    return "browser API";
  }

  return "web runtime";
}

function wireRecordEvents(): void {
  writeRecord.addEventListener("click", () => {
    runOperation(
      () =>
        withWritableDatabase(async (db) => {
          await db.set(selectedTable(), selectedKey(), selectedValue());
          return {
            key: selectedKey(),
            table: selectedTable(),
            written: true,
          };
        }),
      "Written",
    );
  });

  readRecord.addEventListener("click", () => {
    runOperation(async () => {
      const db = await openDatabase();
      return db.get(selectedTable(), selectedKey());
    }, "Read");
  });

  deleteRecord.addEventListener("click", () => {
    runOperation(
      () =>
        withWritableDatabase(async (db) => {
          await db.delete(selectedTable(), selectedKey());
          return {
            deleted: true,
            key: selectedKey(),
            table: selectedTable(),
          };
        }),
      "Deleted",
    );
  });

  listRecords.addEventListener("click", () => {
    runOperation(async () => {
      const db = await openDatabase();
      return db.entries(selectedTable());
    }, "Listed");
  });

  clearTable.addEventListener("click", () => {
    runOperation(
      () =>
        withWritableDatabase(async (db) => {
          await db.clear(selectedTable());
          return {
            cleared: selectedTable(),
          };
        }),
      "Cleared",
    );
  });
}

function wireQueryEvents(): void {
  findRecords.addEventListener("click", () => {
    runOperation(async () => {
      const db = await openDatabase();
      return db.find(selectedTable(), selectedFilter(), { limit: 25 });
    }, "Found");
  });

  countRecords.addEventListener("click", () => {
    runOperation(async () => {
      const db = await openDatabase();
      return {
        count: await db.count(selectedTable(), selectedFilter()),
      };
    }, "Counted");
  });

  listTables.addEventListener("click", () => {
    runOperation(async () => {
      const db = await openDatabase();
      return db.listTables();
    }, "Tables");
  });

  destroyDatabase.addEventListener("click", () => {
    runOperation(
      () =>
        withWritableDatabase(async (db) => {
          await db.destroy();
          return {
            destroyed: databaseName.value.trim(),
          };
        }),
      "Destroyed",
    );
  });
}

function wireUtilityEvents(): void {
  resetOutput.addEventListener("click", () => {
    resultOutput.textContent = "No operation has run.";
    setStatus("Ready");
  });

  backendSelect.addEventListener("change", () => {
    activeBackend.textContent = "pending";
    setWriteControlsEnabled(true);
  });

  storageAreaSelect.addEventListener("change", () => {
    activeBackend.textContent = "pending";
    setWriteControlsEnabled(storageAreaSelect.value !== "managed");
  });
}

function wireEvents(): void {
  wireRecordEvents();
  wireQueryEvents();
  wireUtilityEvents();
}

function initialize(): void {
  runtimeLabel.textContent = runtimeName();
  wireEvents();
  setWriteControlsEnabled(true);
}

initialize();
