import "server-only";

import crypto from "node:crypto";

import type { ConnectionSecrets } from "./types";

type EncryptedPayload = {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
};

function getEncryptionKey(): Buffer {
  const keyB64 = process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();
  if (!keyB64) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY is not set (base64-encoded 32-byte key)."
    );
  }

  const key = Buffer.from(keyB64, "base64");
  if (key.length !== 32) {
    throw new Error(
      `INTEGRATIONS_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}).`
    );
  }

  return key;
}

export function encryptSecrets(secrets: ConnectionSecrets): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // AES-GCM 96-bit nonce
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext = Buffer.from(JSON.stringify(secrets), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecrets(payload: EncryptedPayload): ConnectionSecrets {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  const tag = Buffer.from(payload.tag, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(plaintext) as ConnectionSecrets;
}

