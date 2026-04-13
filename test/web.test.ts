import { describe, expect, it } from "vitest";
import { notJwtNode } from "../src/node";
import notJwtWebDefault, { notJwtWeb } from "../src/web";

describe("web", () => {
  it("exports default function", () => {
    expect(notJwtWebDefault).toBe(notJwtWeb);
  });

  it("throws when key is empty", async () => {
    await expect(notJwtWeb("")).rejects.toThrow(
      "Key is required, and must not be empty",
    );
  });

  it("signs and verifies a valid signed message", async () => {
    const jwt = await notJwtWeb("secret");
    const signed = await jwt.sign("hello");

    await expect(jwt.verify(signed)).resolves.toBe("hello");
  });

  it("throws for a tampered signed message", async () => {
    const jwt = await notJwtWeb("secret");
    const signed = await jwt.sign("hello");
    const tampered = `${signed.slice(0, -1)}${signed.endsWith("A") ? "B" : "A"}`;

    await expect(jwt.verify(tampered)).rejects.toThrow(
      "Signature verification failed",
    );
  });

  it("throws for invalid base64url payload", async () => {
    const jwt = await notJwtWeb("secret");

    await expect(jwt.verify("%%")).rejects.toThrow("Invalid signed message");
  });

  it("throws for too-short decoded payload", async () => {
    const jwt = await notJwtWeb("secret");
    const shortPayload = Buffer.from([1, 2, 3]).toString("base64url");

    await expect(jwt.verify(shortPayload)).rejects.toThrow(
      "Invalid signed message",
    );
  });

  it("supports large payload signing without logic changes", async () => {
    const jwt = await notJwtWeb("secret");
    const signed = await jwt.sign("x".repeat(70000));

    await expect(jwt.verify(signed)).resolves.toBe("x".repeat(70000));
  });

  it("verifies node-signed payloads in web implementation", async () => {
    const nodeJwt = await notJwtNode("secret");
    const webJwt = await notJwtWeb("secret");
    const signed = await nodeJwt.sign("cross-runtime");

    await expect(webJwt.verify(signed)).resolves.toBe("cross-runtime");
  });

  it("verifies web-signed payloads in node implementation", async () => {
    const nodeJwt = await notJwtNode("secret");
    const webJwt = await notJwtWeb("secret");
    const signed = await webJwt.sign("cross-runtime");

    await expect(nodeJwt.verify(signed)).resolves.toBe("cross-runtime");
  });
});
