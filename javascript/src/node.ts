import { createHmac, timingSafeEqual } from "node:crypto";

function returnOf<T>(fn: () => T): T {
  return fn();
}

export async function notJwtNode(key: string) {
  if (typeof key !== "string" || !key) {
    throw new Error("Key is required, and must not be empty");
  }

  const keyBuffer = Buffer.from(key, "utf-8");

  return {
    async sign(message: string): Promise<string> {
      if (typeof message !== "string") {
        throw new TypeError("Message must be a string");
      }
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
          // Buffer.from skips invalid characters, so require a canonical re-encode.
          const unpadded = signedMessage.replace(/={1,2}$/, "");
          const bytes = Buffer.from(unpadded, "base64url");
          return bytes.toString("base64url") === unpadded ? bytes : null;
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

      // Reject invalid UTF-8 instead of replacing it with U+FFFD.
      const message = messageBuffer.toString("utf-8");
      if (!Buffer.from(message, "utf-8").equals(messageBuffer)) {
        throw new Error("Invalid signed message");
      }

      return message;
    },
  };
}

export default notJwtNode;
