package notjwt

import (
	"encoding/json"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"
)

type messageVector struct {
	Name    string `json:"name"`
	Key     string `json:"key"`
	Message string `json:"message"`
	Token   string `json:"token"`
}

type vectorFile struct {
	Valid      []messageVector `json:"valid"`
	VerifyOnly []messageVector `json:"verifyOnly"`
	Invalid    []struct {
		Name  string `json:"name"`
		Key   string `json:"key"`
		Token string `json:"token"`
		Error string `json:"error"`
	} `json:"invalid"`
}

func loadVectors(t *testing.T) vectorFile {
	t.Helper()
	raw, err := os.ReadFile("../testdata/vectors.json")
	if err != nil {
		t.Fatalf("read vectors: %v", err)
	}
	var v vectorFile
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}
	if len(v.Valid) == 0 || len(v.Invalid) == 0 {
		t.Fatal("vectors file has no cases")
	}
	return v
}

func mustNew(t *testing.T, key string) *Signer {
	t.Helper()
	s, err := New(key)
	if err != nil {
		t.Fatalf("New(%q): %v", key, err)
	}
	return s
}

func TestVectorsValid(t *testing.T) {
	for _, tc := range loadVectors(t).Valid {
		t.Run(tc.Name, func(t *testing.T) {
			s := mustNew(t, tc.Key)
			if got := s.Sign(tc.Message); got != tc.Token {
				t.Errorf("Sign = %q, want %q", got, tc.Token)
			}
			got, err := s.Verify(tc.Token)
			if err != nil {
				t.Fatalf("Verify: %v", err)
			}
			if got != tc.Message {
				t.Errorf("Verify = %q, want %q", got, tc.Message)
			}
		})
	}
}

func TestVectorsVerifyOnly(t *testing.T) {
	for _, tc := range loadVectors(t).VerifyOnly {
		t.Run(tc.Name, func(t *testing.T) {
			got, err := mustNew(t, tc.Key).Verify(tc.Token)
			if err != nil {
				t.Fatalf("Verify: %v", err)
			}
			if got != tc.Message {
				t.Errorf("Verify = %q, want %q", got, tc.Message)
			}
		})
	}
}

var vectorErrors = map[string]error{
	"invalid":   ErrInvalidSignedMessage,
	"signature": ErrSignatureVerification,
}

func TestVectorsInvalid(t *testing.T) {
	for _, tc := range loadVectors(t).Invalid {
		t.Run(tc.Name, func(t *testing.T) {
			want, ok := vectorErrors[tc.Error]
			if !ok {
				t.Fatalf("unknown error kind %q", tc.Error)
			}
			if _, err := mustNew(t, tc.Key).Verify(tc.Token); !errors.Is(err, want) {
				t.Errorf("err = %v, want %v", err, want)
			}
		})
	}
}

func TestNewEmptyKey(t *testing.T) {
	if _, err := New(""); !errors.Is(err, ErrEmptyKey) {
		t.Fatalf("err = %v, want ErrEmptyKey", err)
	}
}

func TestZeroSigner(t *testing.T) {
	var s Signer
	if _, err := s.Verify(mustNew(t, "k").Sign("m")); !errors.Is(err, ErrEmptyKey) {
		t.Errorf("Verify err = %v, want ErrEmptyKey", err)
	}

	defer func() {
		if r := recover(); r != ErrEmptyKey {
			t.Errorf("Sign recovered %v, want ErrEmptyKey panic", r)
		}
	}()
	s.Sign("m")
}

func TestSignReplacesInvalidUTF8(t *testing.T) {
	s := mustNew(t, "secret")
	token := s.Sign("caf\xc3")
	if want := s.Sign("caf\uFFFD"); token != want {
		t.Errorf("Sign(invalid UTF-8) = %q, want %q", token, want)
	}
	if got, err := s.Verify(token); err != nil || got != "caf\uFFFD" {
		t.Errorf("Verify = %q, %v; want %q", got, err, "caf\uFFFD")
	}
}

func TestLargeMessage(t *testing.T) {
	s := mustNew(t, "secret")
	msg := strings.Repeat("x", 70000)
	got, err := s.Verify(s.Sign(msg))
	if err != nil || got != msg {
		t.Fatalf("round trip failed: err = %v", err)
	}
}

func TestConcurrentUse(t *testing.T) {
	s := mustNew(t, "secret")
	var wg sync.WaitGroup
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := s.Verify(s.Sign("hello")); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
}
