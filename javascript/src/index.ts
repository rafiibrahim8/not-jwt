export type NotJWT = {
  sign(message: string): Promise<string>;
  verify(signedMessage: string): Promise<string>;
};

function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process.versions?.node);
}

export async function notJwt(key: string): Promise<NotJWT> {
  if (isNodeRuntime()) {
    const { notJwtNode } = await import("./node.js");
    return notJwtNode(key);
  }

  const { notJwtWeb } = await import("./web.js");
  return notJwtWeb(key);
}

export default notJwt;
