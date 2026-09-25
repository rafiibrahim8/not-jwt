import json
import threading
import unittest
from pathlib import Path

from not_jwt import (
    InvalidSignedMessageError,
    NotJwtError,
    SignatureVerificationError,
    Signer,
)

VECTORS = json.loads(
    (Path(__file__).resolve().parents[2] / "testdata" / "vectors.json").read_text(
        encoding="utf-8"
    )
)
ERRORS = {
    "invalid": InvalidSignedMessageError,
    "signature": SignatureVerificationError,
}


class VectorTests(unittest.TestCase):
    def test_valid(self):
        self.assertTrue(VECTORS["valid"])
        for case in VECTORS["valid"]:
            with self.subTest(case["name"]):
                signer = Signer(case["key"])
                self.assertEqual(signer.sign(case["message"]), case["token"])
                self.assertEqual(signer.verify(case["token"]), case["message"])

    def test_verify_only(self):
        self.assertTrue(VECTORS["verifyOnly"])
        for case in VECTORS["verifyOnly"]:
            with self.subTest(case["name"]):
                self.assertEqual(Signer(case["key"]).verify(case["token"]), case["message"])

    def test_invalid(self):
        self.assertTrue(VECTORS["invalid"])
        for case in VECTORS["invalid"]:
            with self.subTest(case["name"]):
                with self.assertRaises(ERRORS[case["error"]]):
                    Signer(case["key"]).verify(case["token"])


class SignerTests(unittest.TestCase):
    def test_empty_key(self):
        with self.assertRaisesRegex(ValueError, "must not be empty"):
            Signer("")

    def test_non_string_key(self):
        for key in (123, b"secret", None, ["secret"]):
            with self.subTest(key=key), self.assertRaises(TypeError):
                Signer(key)

    def test_non_string_message(self):
        signer = Signer("secret")
        for message in (123, b"hi", None, {"sub": "u1"}):
            with self.subTest(message=message), self.assertRaises(TypeError):
                signer.sign(message)

    def test_non_string_signed_message(self):
        signer = Signer("secret")
        for token in (123, b"token", None, {}):
            with self.subTest(token=token), self.assertRaises(InvalidSignedMessageError):
                signer.verify(token)

    def test_non_ascii_signed_message(self):
        with self.assertRaises(InvalidSignedMessageError):
            Signer("secret").verify("é" * 44)

    def test_lone_surrogates_become_replacement_character(self):
        signer = Signer("secret")
        token = signer.sign("x\ud800")
        self.assertEqual(token, signer.sign("x�"))
        self.assertEqual(signer.verify(token), "x�")

    def test_errors_share_base_class(self):
        self.assertTrue(issubclass(InvalidSignedMessageError, NotJwtError))
        self.assertTrue(issubclass(SignatureVerificationError, NotJwtError))

    def test_repr_does_not_leak_key(self):
        self.assertNotIn("super-secret-key", repr(Signer("super-secret-key")))

    def test_large_message(self):
        signer = Signer("secret")
        message = "x" * 70000
        self.assertEqual(signer.verify(signer.sign(message)), message)

    def test_concurrent_use(self):
        signer = Signer("secret")
        errors = []

        def work():
            try:
                for _ in range(100):
                    signer.verify(signer.sign("hello"))
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=work) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
