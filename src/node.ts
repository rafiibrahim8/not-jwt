import { createHmac, timingSafeEqual } from "node:crypto";

function returnOf<T>(fn: () => T): T {
  return fn();
}

export async function notJwtNode(key: string) {
  if (!key) {
    throw new Error("Key is required, and must not be empty");
  }

  const keyBuffer = Buffer.from(key, "utf-8");

  return {
    async sign(message: string): Promise<string> {
      const signatureBuffer = createHmac("sha256", keyBuffer)
        .update(message)
        .digest();
      const messageBuffer = Buffer.from(message, "utf-8");
      return Buffer.concat([signatureBuffer, messageBuffer]).toString(
        "base64url",
      );
    },
    async verify(signedMessage: string): Promise<string> {
      const providedBytes = returnOf(() => {
        try {
          return Buffer.from(signedMessage, "base64url");
        } catch {
          return null;
        }
      });

      if (!providedBytes || providedBytes.length < 32) {
        throw new Error("Invalid signed message");
      }

      const providedMac = providedBytes.subarray(0, 32);
      const messageBuffer = providedBytes.subarray(32);
      const expectedMac = createHmac("sha256", keyBuffer)
        .update(messageBuffer)
        .digest();

      if (!timingSafeEqual(expectedMac, providedMac)) {
        throw new Error("Signature verification failed");
      }

      return messageBuffer.toString("utf-8");
    },
  };
}

export default notJwtNode;
