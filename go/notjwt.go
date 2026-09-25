// Package notjwt is a tiny HMAC-SHA256 message signer, token-compatible with
// the not-jwt npm package.
package notjwt

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
	"unicode/utf8"
)

var (
	ErrEmptyKey              = errors.New("notjwt: key is required, and must not be empty")
	ErrInvalidSignedMessage  = errors.New("notjwt: invalid signed message")
	ErrSignatureVerification = errors.New("notjwt: signature verification failed")
)

var encoding = base64.RawURLEncoding.Strict()

// Signer is safe for concurrent use. Create one with New.
type Signer struct {
	key []byte
}

func New(key string) (*Signer, error) {
	if key == "" {
		return nil, ErrEmptyKey
	}
	return &Signer{key: []byte(key)}, nil
}

// Sign replaces invalid UTF-8 in message with U+FFFD, as the JavaScript
// implementations do. It panics on a Signer not created with New.
func (s *Signer) Sign(message string) string {
	if len(s.key) == 0 {
		panic(ErrEmptyKey)
	}
	message = strings.ToValidUTF8(message, "\uFFFD")
	mac := s.mac([]byte(message))
	return encoding.EncodeToString(append(mac, message...))
}

// Verify accepts up to two trailing "=" of padding but otherwise only the
// exact encoding Sign produces.
func (s *Signer) Verify(signedMessage string) (string, error) {
	if len(s.key) == 0 {
		return "", ErrEmptyKey
	}
	data, ok := decode(signedMessage)
	if !ok || len(data) < sha256.Size {
		return "", ErrInvalidSignedMessage
	}

	providedMac, message := data[:sha256.Size], data[sha256.Size:]
	if !hmac.Equal(s.mac(message), providedMac) {
		return "", ErrSignatureVerification
	}
	if !utf8.Valid(message) {
		return "", ErrInvalidSignedMessage
	}

	return string(message), nil
}

func (s *Signer) mac(message []byte) []byte {
	h := hmac.New(sha256.New, s.key)
	h.Write(message)
	return h.Sum(nil)
}

func decode(token string) ([]byte, bool) {
	// encoding/base64 skips \r and \n, even in strict mode.
	if strings.ContainsAny(token, "\r\n") {
		return nil, false
	}
	token = strings.TrimSuffix(strings.TrimSuffix(token, "="), "=")
	data, err := encoding.DecodeString(token)
	return data, err == nil
}
