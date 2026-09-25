# not-jwt (Python)

A tiny HMAC-SHA256 message signer for Python, with no dependencies. It gives
you one simple contract:
- `sign(message)` -> signed string
- `verify(signed_message)` -> original message (or raises)

Use it when you want JWT-like tamper protection without full JWT complexity.

Tokens are interchangeable with every other not-jwt implementation
(JavaScript, Go, Rust): sign in one, verify in another. See the
[main README](https://github.com/rafiibrahim8/not-jwt#readme) for an overview.

## Install

```bash
pip install not-jwt
```

## Quick start

```python
from not_jwt import Signer

signer = Signer("super-secret-key")

token = signer.sign("hello")
message = signer.verify(token)  # "hello"
```

## API

```python
class Signer:
    def __init__(self, key: str) -> None: ...
    def sign(self, message: str) -> str: ...
    def verify(self, signed_message: str) -> str: ...
```

`Signer` raises `TypeError` if `key` is not a string and `ValueError` if it is
empty. `sign` raises `TypeError` if `message` is not a string, and replaces lone
surrogates in it with U+FFFD. A `Signer` is safe for concurrent use.

`verify` raises one of these (both subclass `NotJwtError`):
- `InvalidSignedMessageError`: not valid base64url, too short to hold a
  signature, or the message is not valid UTF-8.
- `SignatureVerificationError`: the signature does not match.

## Using as a JWT replacement

For many internal apps, this can replace JWT when you do not need RFC JWT features.

Typical pattern:
1. Put claims into a JSON payload.
2. Add `exp` (expiry) yourself.
3. Sign the serialized payload.
4. On verify, recover payload from `verify(...)`, then parse and validate claims/expiry.

Example:

```python
import json
import os
import time
from typing import Optional

from not_jwt import NotJwtError, Signer

signer = Signer(os.environ["AUTH_SECRET"])


def create_token(sub: str, role: str) -> str:
    claims = {"sub": sub, "role": role, "exp": int(time.time()) + 60 * 60}  # 1 hour
    return signer.sign(json.dumps(claims))


def verify_token(token: str) -> Optional[dict]:
    try:
        claims = json.loads(signer.verify(token))
    except (NotJwtError, ValueError):
        return None
    if not isinstance(claims, dict) or not isinstance(claims.get("exp"), int):
        return None
    if claims["exp"] <= time.time():
        return None
    return claims
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
cd python
PYTHONPATH=src python -m unittest discover -s tests
```
