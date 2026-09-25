# not-jwt (Go)

A tiny HMAC-SHA256 message signer for Go. It gives you one simple contract:
- `Sign(message)` -> signed string
- `Verify(signedMessage)` -> original message (or error)

Use it when you want JWT-like tamper protection without full JWT complexity.

Tokens are interchangeable with every other not-jwt implementation
(JavaScript, Rust, Python): sign in one, verify in another. See the
[main README](https://github.com/rafiibrahim8/not-jwt#readme) for an overview.

## Install

```bash
go get github.com/rafiibrahim8/not-jwt/go
```

## Quick start

```go
import notjwt "github.com/rafiibrahim8/not-jwt/go"

signer, err := notjwt.New("super-secret-key")
if err != nil {
	return err
}

token := signer.Sign("hello")
message, err := signer.Verify(token) // "hello"
```

## API

```go
func New(key string) (*Signer, error)
func (s *Signer) Sign(message string) string
func (s *Signer) Verify(signedMessage string) (string, error)
```

`New` returns `ErrEmptyKey` if `key` is empty. A `Signer` is safe for
concurrent use. `Sign` replaces invalid UTF-8 in `message` with U+FFFD.

`Verify` returns one of these errors (compare with `errors.Is`):
- `ErrInvalidSignedMessage`: not valid base64url, too short to hold a signature,
  or the message is not valid UTF-8.
- `ErrSignatureVerification`: the signature does not match.
- `ErrEmptyKey`: the `Signer` was not created with `New`.

## Using as a JWT replacement

For many internal apps, this can replace JWT when you do not need RFC JWT features.

Typical pattern:
1. Put claims into a JSON payload.
2. Add `exp` (expiry) yourself.
3. Sign the serialized payload.
4. On verify, recover payload from `Verify(...)`, then parse and validate claims/expiry.

Example:

```go
type Claims struct {
	Sub  string `json:"sub"`
	Role string `json:"role"`
	Exp  int64  `json:"exp"` // unix seconds
}

func CreateToken(signer *notjwt.Signer, sub, role string) (string, error) {
	payload, err := json.Marshal(Claims{
		Sub:  sub,
		Role: role,
		Exp:  time.Now().Add(time.Hour).Unix(),
	})
	if err != nil {
		return "", err
	}
	return signer.Sign(string(payload)), nil
}

func VerifyToken(signer *notjwt.Signer, token string) (*Claims, bool) {
	payload, err := signer.Verify(token)
	if err != nil {
		return nil, false
	}
	var claims Claims
	if err := json.Unmarshal([]byte(payload), &claims); err != nil {
		return nil, false
	}
	if claims.Exp <= time.Now().Unix() {
		return nil, false
	}
	return &claims, true
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
cd go
go vet ./...
go test -race ./...
```
