//! Tiny HMAC-SHA256 message signer, token-compatible with the not-jwt npm
//! package.
//!
//! ```
//! let signer = not_jwt::Signer::new("super-secret-key")?;
//! let token = signer.sign("hello");
//! assert_eq!(signer.verify(&token)?, "hello");
//! # Ok::<(), not_jwt::Error>(())
//! ```

use std::fmt;

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use hmac::{Hmac, Mac};
use sha2::Sha256;

const MAC_LEN: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    EmptyKey,
    InvalidSignedMessage,
    SignatureVerification,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Error::EmptyKey => "key is required, and must not be empty",
            Error::InvalidSignedMessage => "invalid signed message",
            Error::SignatureVerification => "signature verification failed",
        })
    }
}

impl std::error::Error for Error {}

#[derive(Clone)]
pub struct Signer {
    mac: Hmac<Sha256>,
}

impl fmt::Debug for Signer {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Signer { .. }")
    }
}

impl Signer {
    pub fn new(key: &str) -> Result<Self, Error> {
        if key.is_empty() {
            return Err(Error::EmptyKey);
        }
        let mac = Hmac::new_from_slice(key.as_bytes()).expect("HMAC accepts any key length");
        Ok(Signer { mac })
    }

    pub fn sign(&self, message: &str) -> String {
        let mut mac = self.mac.clone();
        mac.update(message.as_bytes());
        let mut data = mac.finalize().into_bytes().to_vec();
        data.extend_from_slice(message.as_bytes());
        URL_SAFE_NO_PAD.encode(data)
    }

    /// Accepts up to two trailing `=` of padding but otherwise only the exact
    /// encoding [`Signer::sign`] produces.
    pub fn verify(&self, signed_message: &str) -> Result<String, Error> {
        let token = signed_message.strip_suffix('=').unwrap_or(signed_message);
        let token = token.strip_suffix('=').unwrap_or(token);
        let data = URL_SAFE_NO_PAD
            .decode(token)
            .map_err(|_| Error::InvalidSignedMessage)?;
        if data.len() < MAC_LEN {
            return Err(Error::InvalidSignedMessage);
        }

        let (tag, message) = data.split_at(MAC_LEN);
        let mut mac = self.mac.clone();
        mac.update(message);
        mac.verify_slice(tag)
            .map_err(|_| Error::SignatureVerification)?;

        String::from_utf8(message.to_vec()).map_err(|_| Error::InvalidSignedMessage)
    }
}
