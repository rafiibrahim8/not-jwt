"""Tiny HMAC-SHA256 message signer, token-compatible with the not-jwt npm package."""

import base64
import hashlib
import hmac
from typing import Optional

__all__ = [
    "InvalidSignedMessageError",
    "NotJwtError",
    "SignatureVerificationError",
    "Signer",
]

_MAC_SIZE = 32
_SURROGATES = dict.fromkeys(range(0xD800, 0xE000), "�")


class NotJwtError(Exception):
    pass


class InvalidSignedMessageError(NotJwtError):
    pass


class SignatureVerificationError(NotJwtError):
    pass


class Signer:
    """Signs and verifies messages with a fixed key. Safe for concurrent use."""

    __slots__ = ("_key",)

    def __init__(self, key: str) -> None:
        if not isinstance(key, str):
            raise TypeError("key must be a string")
        if not key:
            raise ValueError("key is required, and must not be empty")
        self._key = _utf8(key)

    def sign(self, message: str) -> str:
        """Lone surrogates in message become U+FFFD, as in JavaScript."""
        if not isinstance(message, str):
            raise TypeError("message must be a string")
        data = _utf8(message)
        return _b64encode(self._mac(data) + data)

    def verify(self, signed_message: str) -> str:
        """Accepts up to two trailing "=" of padding but otherwise only the exact
        encoding sign() produces."""
        data = _b64decode(signed_message)
        if data is None or len(data) < _MAC_SIZE:
            raise InvalidSignedMessageError("invalid signed message")

        tag, message = data[:_MAC_SIZE], data[_MAC_SIZE:]
        if not hmac.compare_digest(self._mac(message), tag):
            raise SignatureVerificationError("signature verification failed")

        try:
            return message.decode("utf-8")
        except UnicodeDecodeError:
            raise InvalidSignedMessageError("invalid signed message") from None

    def _mac(self, data: bytes) -> bytes:
        return hmac.new(self._key, data, hashlib.sha256).digest()


def _utf8(text: str) -> bytes:
    try:
        return text.encode("utf-8")
    except UnicodeEncodeError:
        return text.translate(_SURROGATES).encode("utf-8")


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(token: object) -> Optional[bytes]:
    if not isinstance(token, str):
        return None
    token = token.removesuffix("=").removesuffix("=")
    try:
        data = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4))
    except ValueError:
        return None
    # urlsafe_b64decode skips invalid characters and accepts "+" and "/", so
    # require a canonical re-encode.
    return data if _b64encode(data) == token else None
