import CryptoJS from 'crypto-js';

// Generate a random AES key
export const generateKey = () => {
    return CryptoJS.lib.WordArray.random(256/8).toString();
};

// Encrypt file data before upload
export const encryptFile = (fileData, secretKey) => {
    return CryptoJS.AES.encrypt(fileData, secretKey).toString();
};

// Encrypt the AES key itself (using a user password or public key)
// In a real app, use a more robust method like ECIES or a secret sharing scheme
export const encryptKey = (secretKey, userPassword) => {
    return CryptoJS.AES.encrypt(secretKey, userPassword).toString();
};