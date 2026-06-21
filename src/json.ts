import { ValidationError } from "./errors";
import type { JsonObject, JsonValue } from "./types";

export function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonValue(value: unknown): value is JsonValue {
  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      if (value === null) {
        return true;
      }

      if (Array.isArray(value)) {
        return value.every((item) => isJsonValue(item));
      }

      if (Object.prototype.toString.call(value) !== "[object Object]") {
        return false;
      }

      return Object.values(value).every((item) => isJsonValue(item));
    default:
      return false;
  }
}

export function assertJsonValue(value: unknown): asserts value is JsonValue {
  if (!isJsonValue(value)) {
    throw new ValidationError("Database values must be JSON serializable");
  }
}

export function cloneJsonValue(value: JsonValue): JsonValue {
  const cloned = JSON.parse(JSON.stringify(value));
  assertJsonValue(cloned);
  return cloned;
}
