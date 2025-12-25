import { keccak256, toBytes } from "viem";

/** * GENERATE DETERMINISTIC KEY FROM SIGNATURE
 * Converts a wallet signature into a valid 32-byte AES-256 Hex Key.
 */
export const signatureToKey = (signature: string): string => {
  // Hash the signature to get a consistent 32-byte string
  const hash = keccak256(toBytes(signature));
  // Remove 0x prefix to get clean hex
  return hash.replace(/^0x/, '');
};

/** GENERATE RANDOM KEY (Fallback) */
export const generateFileKey = () => {
  const array = new Uint8Array(32); 
  window.crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

/** VALIDATE KEY FORMAT (Strict AES-256) */
const validateKey = (hex: string): Uint8Array => {
  if (!hex || typeof hex !== 'string') throw new Error("Key is missing.");
  
  // Clean: remove 0x, spaces, quotes, URL encoding
  const clean = hex.replace(/^0x/i, '').replace(/["\s%]/g, '').trim();
  
  // AES-256 requires 32 bytes (64 hex characters)
  if (clean.length !== 64) {
    throw new Error(`Invalid Key Length: Got ${clean.length} chars, expected 64 (AES-256).`);
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(clean.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error("Invalid Key: Contains non-hex characters.");
    bytes[i] = byte;
  }
  return bytes;
};

/** ENCRYPT FILE */
export const encryptFile = async (file: File, keyString: string): Promise<Blob> => {
  const keyBytes = validateKey(keyString);
  
  // Cast keyBytes to BufferSource to satisfy TypeScript
  const key = await window.crypto.subtle.importKey(
    'raw', 
    keyBytes as BufferSource, 
    { name: 'AES-GCM' }, 
    false, 
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12)); 
  const fileData = await file.arrayBuffer();

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, fileData
  );

  // Combine IV + Ciphertext
  return new Blob([iv, encryptedContent], { type: 'application/octet-stream' });
};

/** DECRYPT FILE */
export const decryptFile = async (encryptedBlob: Blob, keyString: string, mimeType: string = 'application/octet-stream'): Promise<Blob> => {
  try {
    // 1. Validate Input Size (IV is 12 bytes, so file must be > 12)
    if (!encryptedBlob || encryptedBlob.size < 13) {
      throw new Error("File is empty or too small. It may be corrupted or an error page.");
    }

    // 2. Validate Key
    const keyBytes = validateKey(keyString);
    
    const key = await window.crypto.subtle.importKey(
      'raw', 
      keyBytes as BufferSource, 
      { name: 'AES-GCM' }, 
      false, 
      ['decrypt']
    );

    // 3. Read Buffer
    const buffer = await encryptedBlob.arrayBuffer();
    
    // 4. Extract IV (First 12 bytes) and Data
    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);

    // 5. Decrypt
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, data
    );

    return new Blob([decryptedContent], { type: mimeType });
  } catch (e: any) {
    console.error("Crypto Error:", e);
    if (e.name === 'OperationError') {
      throw new Error("Wrong Key. The provided key does not match this file, or the file is corrupted.");
    }
    throw e;
  }
};