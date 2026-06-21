import { describe, expect, it } from "vitest";
import { assertJsonValue, cloneJsonValue, isJsonValue, ValidationError } from "../src/index";

describe("JSON value validation", () => {
  it("accepts nested JSON-compatible values", () => {
    const value = {
      name: "Ada",
      active: true,
      scores: [1, 2, null],
      profile: {
        role: "admin",
      },
    };

    expect(isJsonValue(value)).toBe(true);
  });

  it("rejects unsupported runtime values", () => {
    expect(isJsonValue(new Date())).toBe(false);
    expect(isJsonValue(Number.NaN)).toBe(false);
    expect(() => assertJsonValue(undefined)).toThrow(ValidationError);
  });

  it("clones values so callers cannot mutate stored object references", () => {
    const value = {
      nested: {
        count: 1,
      },
    };

    const cloned = cloneJsonValue(value);

    expect(cloned).toEqual(value);
    expect(cloned).not.toBe(value);
  });
});
