import { afterEach, describe, expect, it, vi } from "vitest";
import notJwt, { notJwt as notJwtNamed } from "../src/index";

describe("index", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports the same function as default and named", () => {
    expect(notJwt).toBe(notJwtNamed);
  });

  it("throws when key is empty", async () => {
    await expect(notJwt("")).rejects.toThrow(
      "Key is required, and must not be empty",
    );
  });

  it("uses node implementation in node runtime", async () => {
    const jwt = await notJwt("secret");
    const signed = await jwt.sign("hello");

    await expect(jwt.verify(signed)).resolves.toBe("hello");
  });

  it("uses web implementation when process is unavailable", async () => {
    // notJwt checks the runtime before its first await. Restore process before
    // awaiting: vitest's worker crashes if it needs process in the meantime.
    vi.stubGlobal("process", undefined);
    const pending = notJwt("secret");
    vi.unstubAllGlobals();
    const jwt = await pending;
    const signed = await jwt.sign("hello");

    await expect(jwt.verify(signed)).resolves.toBe("hello");
  });
});
