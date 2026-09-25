# not-jwt (JavaScript)

A tiny cross-runtime signer for Node and Web/Edge runtimes, with no
dependencies. It gives you one simple contract:
- `sign(message)` -> signed string
- `verify(signedMessage)` -> original message (or throws)

Use it when you want JWT-like tamper protection without full JWT complexity.

Tokens are interchangeable with every other not-jwt implementation
(Go, Rust, Python): sign in one, verify in another. See the
[main README](https://github.com/rafiibrahim8/not-jwt#readme) for an overview.

## Install

```bash
npm i not-jwt
```

## Quick start

```ts
import notJwt from "not-jwt";

const signer = await notJwt("super-secret-key");

const token = await signer.sign("hello");
const message = await signer.verify(token); // "hello"
```

## Runtime-specific imports

Use these for explicit bundling/runtime control:

```ts
import { notJwtNode } from "not-jwt/node";
import { notJwtWeb } from "not-jwt/web";
```

Or use the default auto-runtime entry:

```ts
import notJwt from "not-jwt";
```

## API

### `notJwt(key: string)`
Chooses Node or Web implementation based on runtime.

### `notJwtNode(key: string)`
Node-only implementation.

### `notJwtWeb(key: string)`
Web/Edge-only implementation.

### Signer methods

```ts
sign(message: string): Promise<string>
verify(signedMessage: string): Promise<string>
```

`key` must be a non-empty string, and `message` must be a string.

## Using as a JWT replacement

For many internal apps, this can replace JWT when you do not need RFC JWT features.

Typical pattern:
1. Put claims into a JSON payload.
2. Add `exp` (expiry) yourself.
3. Sign the serialized payload.
4. On verify, recover payload from `verify(...)`, then parse and validate claims/expiry.

Example:

```ts
import notJwt from "not-jwt";

type Claims = {
  sub: string;
  role: "user" | "admin";
  exp: number; // unix seconds
};

const signer = await notJwt(process.env.AUTH_SECRET!);

export async function createToken(claims: Omit<Claims, "exp">): Promise<string> {
  const payload: Claims = {
    ...claims,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
  };
  return signer.sign(JSON.stringify(payload));
}

export async function verifyToken(token: string): Promise<Claims | null> {
  try {
    const payload = await signer.verify(token);
    const claims = JSON.parse(payload) as Claims;
    if (claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}
```

## Important differences vs JWT

- Not RFC 7519 JWT format (`header.payload.signature`).
- No `alg`/`kid` headers.
- No built-in claim parsing (`exp`, `aud`, `iss`) or automatic expiry checks.
- Not intended for third-party JWT interoperability.

If you need standards-based interoperability, keep using a full JWT library.

## Token format

Tokens are interchangeable with every not-jwt implementation. See the
[format specification](https://github.com/rafiibrahim8/not-jwt#token-format).

## Security notes

- Use a strong random secret key.
- Rotate keys when needed.
- Treat verify failures as authentication failures.
- Treat this as message integrity, not encryption.

## Development

```bash
cd javascript
pnpm install
pnpm test
pnpm test:coverage
pnpm run build
pnpm run pack:check
```
