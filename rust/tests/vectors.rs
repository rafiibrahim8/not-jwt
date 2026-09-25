use not_jwt::{Error, Signer};
use serde_json::Value;

fn vectors() -> Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../testdata/vectors.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    serde_json::from_str(&raw).expect("parse vectors")
}

fn cases<'a>(v: &'a Value, group: &str) -> &'a Vec<Value> {
    let cases = v[group].as_array().expect("vector group");
    assert!(!cases.is_empty(), "{group} has no cases");
    cases
}

fn field<'a>(case: &'a Value, name: &str) -> &'a str {
    case[name].as_str().expect("string field")
}

#[test]
fn valid() {
    let v = vectors();
    for case in cases(&v, "valid") {
        let signer = Signer::new(field(case, "key")).unwrap();
        let name = field(case, "name");
        assert_eq!(
            signer.sign(field(case, "message")),
            field(case, "token"),
            "{name}"
        );
        assert_eq!(
            signer.verify(field(case, "token")).as_deref(),
            Ok(field(case, "message")),
            "{name}"
        );
    }
}

#[test]
fn verify_only() {
    let v = vectors();
    for case in cases(&v, "verifyOnly") {
        let signer = Signer::new(field(case, "key")).unwrap();
        let name = field(case, "name");
        assert_eq!(
            signer.verify(field(case, "token")).as_deref(),
            Ok(field(case, "message")),
            "{name}"
        );
    }
}

#[test]
fn invalid() {
    let v = vectors();
    for case in cases(&v, "invalid") {
        let signer = Signer::new(field(case, "key")).unwrap();
        let want = match field(case, "error") {
            "invalid" => Error::InvalidSignedMessage,
            "signature" => Error::SignatureVerification,
            other => panic!("unknown error kind {other}"),
        };
        assert_eq!(
            signer.verify(field(case, "token")),
            Err(want),
            "{}",
            field(case, "name")
        );
    }
}

#[test]
fn empty_key() {
    assert_eq!(Signer::new("").unwrap_err(), Error::EmptyKey);
}

#[test]
fn debug_does_not_leak_key() {
    let signer = Signer::new("super-secret-key").unwrap();
    assert_eq!(format!("{signer:?}"), "Signer { .. }");
}

#[test]
fn large_message() {
    let signer = Signer::new("secret").unwrap();
    let message = "x".repeat(70000);
    assert_eq!(signer.verify(&signer.sign(&message)), Ok(message));
}

#[test]
fn signer_is_send_and_sync() {
    fn assert_send_sync<T: Send + Sync>() {}
    assert_send_sync::<Signer>();
}
