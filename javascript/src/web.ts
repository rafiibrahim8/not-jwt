const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const BINARY_CHUNK_SIZE = 0x8000;

function toBase64Url(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += BINARY_CHUNK_SIZE) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(i, i + BINARY_CHUNK_SIZE)),
    );
  }
  const binary = chunks.join("");

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(base64Url: string): Uint8Array | null {
  if (typeof base64Url !== "string") {
    return null;
  }
  // atob accepts "+", "/", whitespace and non-zero trailing bits, so require a
  // canonical re-encode.
  const unpadded = base64Url.replace(/={1,2}$/, "");
  const base64 = unpadded.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);

  try {
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return toBase64Url(bytes) === unpadded ? bytes : null;
  } catch {
    return null;
  }
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as Uint8Array<ArrayBuffer>;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

export async function notJwtWeb(key: string) {
  if (typeof key !== "string" || !key) {
    throw new Error("Key is required, and must not be empty");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  return {
    async sign(message: string): Promise<string> {
      if (typeof message !== "string") {
        throw new TypeError("Message must be a string");
      }
      const messageBytes = encoder.encode(message);
      const signature = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        messageBytes,
      );
      const signedBytes = concatBytes(new Uint8Array(signature), messageBytes);
      return toBase64Url(signedBytes);
    },
    async verify(signedMessage: string): Promise<string> {
      const signedBytes = fromBase64Url(signedMessage);
      if (!signedBytes || signedBytes.length < 32) {
        throw new Error("Invalid signed message");
      }

      const signatureBytes = signedBytes.subarray(0, 32);
      const messageBytes = signedBytes.subarray(32);

      const isValid = await crypto.subtle.verify(
        "HMAC",
        cryptoKey,
        asBufferSource(signatureBytes),
        asBufferSource(messageBytes),
      );

      if (!isValid) {
        throw new Error("Signature verification failed");
      }

      try {
        return decoder.decode(messageBytes);
      } catch {
        throw new Error("Invalid signed message");
      }
    },
  };
}

export default notJwtWeb;
