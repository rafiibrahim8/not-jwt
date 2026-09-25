# not-jwt (Rust)

A tiny HMAC-SHA256 message signer for Rust. It gives you one simple contract:
- `sign(message)` -> signed string
- `verify(signed_message)` -> original message (or error)

Use it when you want JWT-like tamper protection without full JWT complexity.

Tokens are interchangeable with every other not-jwt implementation
(JavaScript, Go, Python): sign in one, verify in another. See the
[main README](https://github.com/rafiibrahim8/not-jwt#readme) for an overview.

## Install

```bash
cargo add not-jwt
```

## Quick start

```rust
use not_jwt::Signer;

let signer = Signer::new("super-secret-key")?;

let token = signer.sign("hello");
let message = signer.verify(&token)?; // "hello"
```

## API

```rust
impl Signer {
    pub fn new(key: &str) -> Result<Signer, Error>;
    pub fn sign(&self, message: &str) -> String;
    pub fn verify(&self, signed_message: &str) -> Result<String, Error>;
}

pub enum Error {
    EmptyKey,
    InvalidSignedMessage,
    SignatureVerification,
}
```

`new` returns `Error::EmptyKey` if `key` is empty. `Signer` is `Clone + Send + Sync`,
and its `Debug` output never includes the key.

`verify` returns one of:
- `Error::InvalidSignedMessage`: not valid base64url, too short to hold a signature,
  or the message is not valid UTF-8.
- `Error::SignatureVerification`: the signature does not match.

## Using as a JWT replacement

For many internal apps, this can replace JWT when you do not need RFC JWT features.

Typical pattern:
1. Put claims into a JSON payload.
2. Add `exp` (expiry) yourself.
3. Sign the serialized payload.
4. On verify, recover payload from `verify(...)`, then parse and validate claims/expiry.

Example (with `serde` and `serde_json`):

```rust
use not_jwt::Signer;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String,
    role: String,
    exp: u64, // unix seconds
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
}

fn create_token(signer: &Signer, sub: &str, role: &str) -> serde_json::Result<String> {
    let claims = Claims {
        sub: sub.to_owned(),
        role: role.to_owned(),
        exp: now() + 60 * 60, // 1 hour
    };
    Ok(signer.sign(&serde_json::to_string(&claims)?))
}

fn verify_token(signer: &Signer, token: &str) -> Option<Claims> {
    let payload = signer.verify(token).ok()?;
    let claims: Claims = serde_json::from_str(&payload).ok()?;
    (claims.exp > now()).then_some(claims)
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
cd rust
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```
