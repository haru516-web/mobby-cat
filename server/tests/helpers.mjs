import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

export const BUNDLE_ID = "com.mobbycat.app";

export const PRODUCTS = {
  "com.mobbycat.app.ticket.3": { tickets: 3, priceYen: 320 },
  "com.mobbycat.app.matatabi.5": { matatabi: 5, priceYen: 400 },
  "com.mobbycat.app.matatabipass.monthly": { plan: "matatabi_pass", monthlyTickets: 2, priceYen: 480 }
};

export const baseEnv = {
  DB: {},
  APPLE_BUNDLE_ID: BUNDLE_ID,
  PRODUCT_CATALOG_JSON: JSON.stringify(PRODUCTS)
};

export function der(tag, content) {
  const bytes = Buffer.from(content);
  let length;
  if (bytes.length < 128) {
    length = Buffer.from([bytes.length]);
  } else {
    const encoded = [];
    let remaining = bytes.length;
    while (remaining > 0) { encoded.unshift(remaining & 0xff); remaining >>>= 8; }
    length = Buffer.from([0x80 | encoded.length, ...encoded]);
  }
  return Buffer.concat([Buffer.from([tag]), length, bytes]);
}
export function sequence(...parts) { return der(0x30, Buffer.concat(parts)); }
export function oid(value) {
  const arcs = value.split(".").map(Number);
  const bytes = [arcs[0] * 40 + arcs[1]];
  for (const arc of arcs.slice(2)) {
    let current = arc;
    const encoded = [current & 0x7f];
    current >>>= 7;
    while (current > 0) { encoded.unshift((current & 0x7f) | 0x80); current >>>= 7; }
    bytes.push(...encoded);
  }
  return der(0x06, bytes);
}
export function integer(bytes) {
  let value = Buffer.from(bytes);
  while (value.length > 1 && value[0] === 0) value = value.subarray(1);
  if (value[0] & 0x80) value = Buffer.concat([Buffer.from([0]), value]);
  return der(0x02, value);
}
export function ecdsaDerSignature(raw) { return sequence(integer(raw.subarray(0, 32)), integer(raw.subarray(32))); }
export function timeValue(date) {
  return der(0x17, Buffer.from(date.toISOString().slice(2, 19).replace(/[-:T]/g, "") + "Z"));
}

export async function createCertificate(subjectName, issuerName, publicKey, signingKey, serialNumber, isCa, markerOid = null, notAfter = "20350101000000Z") {
  const spki = Buffer.from(await crypto.subtle.exportKey("spki", publicKey));
  const validity = sequence(timeValue(new Date("2025-01-01T00:00:00.000Z")), der(0x18, Buffer.from(notAfter)));
  const signatureAlgorithm = sequence(oid("1.2.840.10045.4.3.2"));
  const basicConstraints = sequence(oid("2.5.29.19"), der(0x01, Buffer.from([0xff])), der(0x04, sequence(...(isCa ? [der(0x01, Buffer.from([0xff]))] : []))));
  const keyUsageBits = isCa ? Buffer.from([2, 4]) : Buffer.from([7, 0x80]);
  const keyUsage = [sequence(oid("2.5.29.15"), der(0x01, Buffer.from([0xff])), der(0x04, der(0x03, keyUsageBits)))];
  const marker = markerOid ? [sequence(oid(markerOid), der(0x04, Buffer.from([5, 0])))] : [];
  const extensions = der(0xa3, sequence(basicConstraints, ...keyUsage, ...marker));
  const tbs = sequence(der(0xa0, der(0x02, Buffer.from([2]))), integer(Buffer.from([serialNumber])), signatureAlgorithm, issuerName, validity, subjectName, spki, extensions);
  const signature = Buffer.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, tbs));
  return sequence(tbs, signatureAlgorithm, der(0x03, Buffer.concat([Buffer.from([0]), ecdsaDerSignature(signature)])));
}


export const APPLE_LEAF_OID = "1.2.840.113635.100.6.11.1";
export const APPLE_INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";

/** A root, an intermediate and a signing leaf. `markers: false` leaves out Apple's App Store marker extensions, like any other certificate the same root could issue. */
export async function selfSignedTestRoot({ markers = true, leafNotAfter, leafMarker = true, middleMarker = true } = {}) {
  const name = (text) => sequence(der(0x31, sequence(oid("2.5.4.3"), der(0x0c, Buffer.from(text)))));
  const keyPair = () => crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const rootPair = await keyPair();
  const rootName = name("Self-Signed Test Root");
  const rootDer = await createCertificate(rootName, rootName, rootPair.publicKey, rootPair.privateKey, 1, true);
  const middlePair = await keyPair();
  const middleName = name("Test Intermediate");
  const middleDer = await createCertificate(middleName, rootName, middlePair.publicKey, rootPair.privateKey, 3, true, markers && middleMarker ? APPLE_INTERMEDIATE_OID : null);
  const leafPair = await keyPair();
  const leafDer = await createCertificate(name("StoreKit Test Signer"), middleName, leafPair.publicKey, middlePair.privateKey, 2, false, markers && leafMarker ? APPLE_LEAF_OID : null, leafNotAfter);
  const pem = `-----BEGIN CERTIFICATE-----\n${rootDer.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----`;
  return { pair: leafPair, certificate: leafDer, x5c: [leafDer.toString("base64"), middleDer.toString("base64"), rootDer.toString("base64")], pem };
}

export async function signedTransaction(root, overrides = {}) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "ES256", x5c: root.x5c });
  const payload = encode({ transactionId: "tx-001", originalTransactionId: "original-001", productId: "com.mobbycat.app.ticket.3", bundleId: "com.mobbycat.app", purchaseDate: Date.now(), expiresDate: Date.now() + 30 * 86400000, ...overrides });
  const data = `${header}.${payload}`;
  const signature = Buffer.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, root.pair.privateKey, Buffer.from(data))).toString("base64url");
  return `${data}.${signature}`;
}


export const appleIdToken = (sub = "apple-person-1") => `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({ sub })).toString("base64url")}.sig`;
export async function appleFixture() {
  const pair = await webcrypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await webcrypto.subtle.exportKey("jwk", pair.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
  const b64 = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
  const token = async (claims = {}, options = {}) => {
    const header = b64({ alg: options.alg ?? "RS256", kid: options.kid ?? "test-key" });
    const payload = b64({ iss: "https://appleid.apple.com", aud: BUNDLE_ID, exp: Math.floor(Date.now() / 1000) + 600, sub: "apple-person-1", ...claims });
    const signature = Buffer.from(await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5", options.signWith ?? pair.privateKey, Buffer.from(header + "." + payload))).toString("base64url");
    return header + "." + payload + "." + signature;
  };
  return { token, appleEnv: { ...baseEnv, APPLE_JWKS_JSON: JSON.stringify({ keys: [jwk] }) }, otherPair: await webcrypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]) };
}


/** Any payload signed the way Apple signs transactions and notifications (ES256, with the test certificate chain). */
export async function signJws(root, payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = `${encode({ alg: "ES256", x5c: root.x5c })}.${encode(payload)}`;
  const signature = Buffer.from(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, root.pair.privateKey, Buffer.from(data))).toString("base64url");
  return `${data}.${signature}`;
}
