import { keccak256, toBytes, toHex } from "viem";

/** * GENERATE DETERMINISTIC KEY FROM SIGNATURE
 * Converts a wallet signature into a valid 32-byte AES-256 Hex Key.
 */
export const signatureToKey = (signature: string): string => {
  // Hash the signature to get a consistent 32-byte string
  const hash = keccak256(toBytes(signature));
  // Remove 0x prefix to get clean hex
  return hash.replace(/^0x/, '');
};

/** GENERATE RANDOM KEY (Legacy/Fallback) */
export const generateFileKey = () => {
  const array = new Uint8Array(32); 
  window.crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

const validateKey = (hex: string): Uint8Array => {
  if (!hex || typeof hex !== 'string') throw new Error("Key is missing.");
  const clean = hex.replace(/^0x/i, '').replace(/["\s]/g, '').trim();
  
  if (clean.length !== 64) {
    throw new Error(`Invalid Key Length: Got ${clean.length}, expected 64 (AES-256).`);
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(clean.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error("Invalid Key: Non-hex characters.");
    bytes[i] = byte;
  }
  return bytes;
};

export const encryptFile = async (file: File, keyString: string): Promise<Blob> => {
  const keyBytes = validateKey(keyString);
  const key = await window.crypto.subtle.importKey(
    'raw', keyBytes as BufferSource, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12)); 
  const fileData = await file.arrayBuffer();

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, fileData
  );

  return new Blob([iv, encryptedContent], { type: 'application/octet-stream' });
};

export const decryptFile = async (encryptedBlob: Blob, keyString: string, mimeType: string = 'application/octet-stream'): Promise<Blob> => {
  try {
    if (!encryptedBlob || encryptedBlob.size < 13) throw new Error("File empty/corrupt.");

    const keyBytes = validateKey(keyString);
    const key = await window.crypto.subtle.importKey(
      'raw', keyBytes as BufferSource, { name: 'AES-GCM' }, false, ['decrypt']
    );

    const buffer = await encryptedBlob.arrayBuffer();
    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, data
    );

    return new Blob([decryptedContent], { type: mimeType });
  } catch (e: any) {
    console.error("Crypto Error:", e);
    if (e.name === 'OperationError') throw new Error("Wrong Key. Signature mismatch.");
    throw e;
  }
};