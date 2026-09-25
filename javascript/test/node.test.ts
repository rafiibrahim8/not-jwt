import { describe, expect, it } from "vitest";
import notJwtNodeDefault, { notJwtNode } from "../src/node";

describe("node", () => {
  it("exports default function", () => {
    expect(notJwtNodeDefault).toBe(notJwtNode);
  });

  it("throws when key is empty", async () => {
    await expect(notJwtNode("")).rejects.toThrow(
      "Key is required, and must not be empty",
    );
  });

  it.each([123, {}, [], ["secret"], new Uint8Array(0), null, undefined])(
    "throws for non-string key %o",
    async (key) => {
      await expect(notJwtNode(key as unknown as string)).rejects.toThrow(
        "Key is required, and must not be empty",
      );
    },
  );

  it.each([undefined, null, 123, {}, new Uint8Array([104, 105])])(
    "throws when signing non-string message %o",
    async (message) => {
      const jwt = await notJwtNode("secret");

      await expect(jwt.sign(message as unknown as string)).rejects.toThrow(
        "Message must be a string",
      );
    },
  );

  it("signs and verifies a valid signed message", async () => {
    const jwt = await notJwtNode("secret");
    const signed = await jwt.sign("hello");

    await expect(jwt.verify(signed)).resolves.toBe("hello");
  });

  it("throws for a tampered signed message", async () => {
    const jwt = await notJwtNode("secret");
    const signed = await jwt.sign("hello");
    const tampered = `${signed.slice(0, -1)}${signed.endsWith("A") ? "B" : "A"}`;

    await expect(jwt.verify(tampered)).rejects.toThrow(
      "Signature verification failed",
    );
  });

  it("throws for too-short payloads", async () => {
    const jwt = await notJwtNode("secret");

    await expect(jwt.verify("aGVsbG8")).rejects.toThrow(
      "Invalid signed message",
    );
  });

  it("throws for invalid payload type", async () => {
    const jwt = await notJwtNode("secret");

    await expect(jwt.verify(123 as unknown as string)).rejects.toThrow(
      "Invalid signed message",
    );
  });
});
