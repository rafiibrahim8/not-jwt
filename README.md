# not-jwt

A tiny HMAC-SHA256 message signer with one simple contract:
- `sign(message)` -> signed string
- `verify(signedMessage)` -> original message (or error)

Use it when you want JWT-like tamper protection without full JWT complexity.
Tokens are interchangeable across languages: sign in an edge worker, verify in
a Go, Rust or Python backend.

| Language | Install | Docs |
|---|---|---|
| JavaScript / TypeScript (Node, Web/Edge) | `npm i not-jwt` | [`javascript/`](./javascript) |
| Go | `go get github.com/rafiibrahim8/not-jwt/go` | [`go/`](./go) |
| Rust | `cargo add not-jwt` | [`rust/`](./rust) |
| Python | `pip install not-jwt` | [`python/`](./python) |

## Why this exists

JWT is great for standards and interoperability. But many projects only need:
- signed payloads,
- fast verification,
- no external dependencies,
- same behavior across runtimes and languages.

`not-jwt` focuses on that narrow use case.

## Token format

```
token = base64url(HMAC-SHA256(utf8(key), utf8(message)) || utf8(message))
```

- `sign` emits base64url without `=` padding.
- `verify` strips up to two trailing `=`, then accepts only that exact
  encoding: the standard base64 alphabet (`+`, `/`), whitespace and other
  characters are rejected.
- The first 32 decoded bytes are the MAC; the rest is the message, which
  must be valid UTF-8.

Every implementation is tested against the shared vectors in
[`testdata/vectors.json`](./testdata/vectors.json).

## Important differences vs JWT

- Not RFC 7519 JWT format (`header.payload.signature`).
- No `alg`/`kid` headers.
- No built-in claim parsing (`exp`, `aud`, `iss`) or automatic expiry checks.
- Not intended for third-party JWT interoperability.

If you need standards-based interoperability, keep using a full JWT library.

## Security notes

- Use a strong random secret key.
- Rotate keys when needed.
- Treat verify failures as authentication failures.
- Treat this as message integrity, not encryption.

## Repository layout

```
javascript/   npm package (not-jwt)
go/           Go module (github.com/rafiibrahim8/not-jwt/go)
rust/         Rust crate (not-jwt)
python/       Python package (not-jwt)
testdata/     test vectors shared by all implementations
```

## Development

```bash
cd javascript && pnpm install && pnpm test
cd go && go test ./...
cd rust && cargo test
cd python && PYTHONPATH=src python -m unittest discover -s tests
```

### Releases

Versions share `major.minor` across languages: the same `major.minor` means the
same token format and verify rules everywhere. Patch versions can differ, so a
fix in one language ships without releasing the others.

Push a tag to release one language. Each workflow runs the tests first, and
the npm, crates.io and PyPI ones check that the tag matches the package version.

| Language | Tag | Workflow | Publishes to |
|---|---|---|---|
| JavaScript | `v1.2.3` | `npm.yml` | npm |
| Go | `go/v1.2.3` | `go-proxy.yml` | proxy.golang.org / pkg.go.dev |
| Rust | `rust/v1.2.3` | `crates-io.yml` | crates.io |
| Python | `python/v1.2.3` | `pypi.yml` | PyPI |
