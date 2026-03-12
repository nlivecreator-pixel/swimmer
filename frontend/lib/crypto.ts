/**
 * End-to-End Encryption using ECDH key exchange + AES-GCM symmetric encryption
 * All operations happen client-side. The server never sees plaintext.
 */

export interface E2EKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
}

// Generate ECDH key pair for this session
export async function generateKeyPair(): Promise<E2EKeyPair> {
  const pair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', pair.publicKey);
  return { privateKey: pair.privateKey, publicKey: pair.publicKey, publicKeyJwk };
}

// Export public key as base64 string to send to server
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey('jwk', publicKey);
  return JSON.stringify(jwk);
}

// Import remote peer's public key from base64 string
export async function importPublicKey(publicKeyStr: string): Promise<CryptoKey> {
  const jwk = JSON.parse(publicKeyStr) as JsonWebKey;
  return window.crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
}

// Derive shared AES-GCM key from ECDH key pair
export async function deriveSharedKey(privateKey: CryptoKey, remotePubKey: CryptoKey): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: remotePubKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a string message
export async function encryptMessage(text: string, sharedKey: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  // Pack iv + ciphertext into base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// Decrypt a message
export async function decryptMessage(encryptedB64: string, sharedKey: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plain = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    ciphertext
  );
  return new TextDecoder().decode(plain);
}

// Session-level key cache: partnerUid → sharedKey
const sharedKeyCache = new Map<string, CryptoKey>();

export function getCachedKey(partnerUid: string): CryptoKey | undefined {
  return sharedKeyCache.get(partnerUid);
}

export function setCachedKey(partnerUid: string, key: CryptoKey) {
  sharedKeyCache.set(partnerUid, key);
}
