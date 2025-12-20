import CryptoJS from 'crypto-js';

export const generateFileKey = () => {
  return CryptoJS.lib.WordArray.random(32).toString(); // 256-bit key
};

export const encryptFile = (file: File, key: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const binary = e.target?.result as string;
        const encrypted = CryptoJS.AES.encrypt(binary, key).toString();
        resolve(encrypted);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const encryptKey = (aesKey: string, secret: string) => {
  return CryptoJS.AES.encrypt(aesKey, secret).toString();
};