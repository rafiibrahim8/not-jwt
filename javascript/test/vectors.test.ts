import { describe, expect, it } from "vitest";
import vectors from "../../testdata/vectors.json";
import { notJwtNode } from "../src/node";
import { notJwtWeb } from "../src/web";

const implementations = { node: notJwtNode, web: notJwtWeb };
const errorMessages: Record<string, string> = {
  invalid: "Invalid signed message",
  signature: "Signature verification failed",
};

describe.each(Object.entries(implementations))("vectors: %s", (_, create) => {
  it.each(vectors.valid)("signs and verifies: $name", async (v) => {
    const jwt = await create(v.key);

    await expect(jwt.sign(v.message)).resolves.toBe(v.token);
    await expect(jwt.verify(v.token)).resolves.toBe(v.message);
  });

  it.each(vectors.verifyOnly)("verifies: $name", async (v) => {
    const jwt = await create(v.key);

    await expect(jwt.verify(v.token)).resolves.toBe(v.message);
  });

  it.each(vectors.invalid)("rejects: $name", async (v) => {
    const jwt = await create(v.key);

    await expect(jwt.verify(v.token)).rejects.toThrow(errorMessages[v.error]);
  });
});
