import { ValidationError } from "./errors";
import { isJsonObject } from "./json";
import type {
  DatabaseEntry,
  JsonValue,
  QueryFilter,
  QueryOperator,
  QueryOptions,
  SortDirection,
} from "./types";

type OrderedOperatorKey = "$gt" | "$gte" | "$lt" | "$lte";

const orderedOperatorKeys: OrderedOperatorKey[] = ["$gt", "$gte", "$lt", "$lte"];

export function getPathValue(value: JsonValue, path: string): JsonValue | undefined {
  const segments = path.split(".").filter((segment) => segment.length > 0);
  let current: JsonValue | undefined = value;

  for (const segment of segments) {
    if (current === undefined || !isJsonObject(current)) {
      return;
    }

    current = current[segment];
  }

  return current;
}

export function matchesFilter(value: JsonValue, filter: QueryFilter): boolean {
  for (const [path, expected] of Object.entries(filter)) {
    const actual = getPathValue(value, path);

    if (isQueryOperator(expected)) {
      if (!matchesOperator(actual, expected)) {
        return false;
      }
      continue;
    }

    if (actual === undefined || !jsonEquals(actual, expected)) {
      return false;
    }
  }

  return true;
}

export function applyQueryOptions(
  entries: DatabaseEntry[],
  options: QueryOptions = {},
): DatabaseEntry[] {
  const sorted = options.sort === undefined ? [...entries] : sortEntries(entries, options.sort);

  const offset = options.offset ?? options.skip ?? 0;
  const limit = options.limit;

  if (offset < 0) {
    throw new ValidationError("Query offset must be greater than or equal to 0");
  }

  if (limit !== undefined && limit < 0) {
    throw new ValidationError("Query limit must be greater than or equal to 0");
  }

  const end = limit === undefined ? undefined : offset + limit;
  return sorted.slice(offset, end);
}

function isQueryOperator(value: JsonValue | QueryOperator): value is QueryOperator {
  if (!isObjectRecord(value)) {
    return false;
  }

  return Object.keys(value).some((key) => key.startsWith("$"));
}

function matchesOperator(actual: JsonValue | undefined, operator: QueryOperator): boolean {
  if (!matchesExistsOperator(actual, operator)) {
    return false;
  }

  if (actual === undefined) {
    return hasOnlyExistsOperator(operator);
  }

  return (
    matchesEqualityOperators(actual, operator) &&
    matchesOrderedOperators(actual, operator) &&
    matchesMembershipOperators(actual, operator) &&
    matchesRegexOperator(actual, operator)
  );
}

function isObjectRecord(value: JsonValue | QueryOperator): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchesExistsOperator(actual: JsonValue | undefined, operator: QueryOperator): boolean {
  if (operator.$exists === undefined) {
    return true;
  }

  return (actual !== undefined) === operator.$exists;
}

function hasOnlyExistsOperator(operator: QueryOperator): boolean {
  return Object.keys(operator).every((key) => key === "$exists");
}

function matchesEqualityOperators(actual: JsonValue, operator: QueryOperator): boolean {
  if (operator.$eq !== undefined && !jsonEquals(actual, operator.$eq)) {
    return false;
  }

  if (operator.$ne !== undefined && jsonEquals(actual, operator.$ne)) {
    return false;
  }

  return true;
}

function matchesOrderedOperators(actual: JsonValue, operator: QueryOperator): boolean {
  return orderedOperatorKeys.every((key) => matchesOrderedOperator(actual, operator, key));
}

function matchesOrderedOperator(
  actual: JsonValue,
  operator: QueryOperator,
  key: OrderedOperatorKey,
): boolean {
  const expected = operator[key];

  if (expected === undefined) {
    return true;
  }

  const comparison = comparePrimitives(actual, expected);

  if (comparison === undefined) {
    return false;
  }

  switch (key) {
    case "$gt":
      return comparison > 0;
    case "$gte":
      return comparison >= 0;
    case "$lt":
      return comparison < 0;
    case "$lte":
      return comparison <= 0;
  }

  return false;
}

function matchesMembershipOperators(actual: JsonValue, operator: QueryOperator): boolean {
  const isIncluded = operator.$in?.some((candidate) => jsonEquals(actual, candidate)) ?? true;
  const isExcluded = operator.$nin?.some((candidate) => jsonEquals(actual, candidate)) ?? false;

  return isIncluded && !isExcluded;
}

function matchesRegexOperator(actual: JsonValue, operator: QueryOperator): boolean {
  if (operator.$regex === undefined) {
    return true;
  }

  return typeof actual === "string" && compileRegex(operator.$regex).test(actual);
}

function compileRegex(pattern: string): RegExp {
  try {
    return new RegExp(pattern);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid pattern";
    throw new ValidationError(`Invalid regular expression: ${detail}`);
  }
}

function sortEntries(
  entries: DatabaseEntry[],
  sort: Record<string, SortDirection>,
): DatabaseEntry[] {
  return [...entries].sort((left, right) => {
    for (const [path, direction] of Object.entries(sort)) {
      const comparison = compareSortValues(
        getPathValue(left.value, path),
        getPathValue(right.value, path),
      );

      if (comparison !== 0) {
        return normalizeSortDirection(direction) * comparison;
      }
    }

    return left.key.localeCompare(right.key);
  });
}

function normalizeSortDirection(direction: SortDirection): 1 | -1 {
  return direction === "desc" || direction === -1 ? -1 : 1;
}

function compareSortValues(left: JsonValue | undefined, right: JsonValue | undefined): number {
  if (left === undefined && right === undefined) {
    return 0;
  }

  if (left === undefined) {
    return 1;
  }

  if (right === undefined) {
    return -1;
  }

  const comparison = comparePrimitives(left, right);
  return comparison ?? String(left).localeCompare(String(right));
}

function comparePrimitives(left: JsonValue, right: JsonValue): number | undefined {
  let comparison: number | undefined;

  if (typeof left === "number" && typeof right === "number") {
    comparison = left - right;
  }

  if (typeof left === "string" && typeof right === "string") {
    comparison = left.localeCompare(right);
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    comparison = Number(left) - Number(right);
  }

  if (left === null && right === null) {
    comparison = 0;
  }

  return comparison;
}

function jsonEquals(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  if (left === right) {
    return true;
  }

  if (left === undefined || right === undefined) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!(Array.isArray(left) && Array.isArray(right))) {
      return false;
    }

    return (
      left.length === right.length && left.every((item, index) => jsonEquals(item, right[index]))
    );
  }

  if (isJsonObject(left) || isJsonObject(right)) {
    if (!(isJsonObject(left) && isJsonObject(right))) {
      return false;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => Object.hasOwn(right, key) && jsonEquals(left[key], right[key]))
    );
  }

  return false;
}
