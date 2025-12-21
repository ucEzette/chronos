export const generateFileKey = () => {
  const array = new Uint8Array(32); // 256-bit key
  window.crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

const hexToBytes = (hex: string): Uint8Array => {
  if (!hex || typeof hex !== 'string') throw new Error("Key is missing");
  const cleanHex = hex.replace(/^0x/i, '').replace(/"/g, '').trim(); 
  if (cleanHex.length % 2 !== 0) throw new Error("Invalid key length");
  
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
};

// 1. ENCRYPT
export const encryptFile = async (file: File, keyString: string): Promise<Blob> => {
  const keyBytes = hexToBytes(keyString);
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

// 2. DECRYPT
export const decryptFile = async (encryptedBlob: Blob, keyString: string, mimeType: string = 'application/octet-stream'): Promise<Blob> => {
  try {
    const keyBytes = hexToBytes(keyString);
    const key = await window.crypto.subtle.importKey(
      'raw', keyBytes as BufferSource, { name: 'AES-GCM' }, false, ['decrypt']
    );

    const buffer = await encryptedBlob.arrayBuffer();
    if (buffer.byteLength <= 12) throw new Error("File corrupted (too small)");

    // Slice carefully
    const iv = buffer.slice(0, 12);
    const data = buffer.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, data
    );

    return new Blob([decryptedContent], { type: mimeType });
  } catch (e: any) {
    console.error("Crypto Error Details:", e);
    throw new Error("Decryption failed. The key is incorrect or the file is corrupted.");
  }
};