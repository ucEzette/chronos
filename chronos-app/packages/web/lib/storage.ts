/**
 * Storage Abstraction Layer
 * 
 * Provides a unified interface for decentralized file storage.
 * Designed for easy migration between providers (Filebase → Ocean Protocol).
 * 
 * Usage:
 *   import { uploadFile, getFileUrl } from '@/lib/storage';
 *   
 *   const result = await uploadFile(myFile);
 *   const url = getFileUrl(result.cid);
 */

export type StorageProvider = 'filebase' | 'ocean' | 'mock';

export interface StorageResult {
    /** IPFS CID or unique storage identifier */
    cid: string;
    /** Direct access URL via gateway */
    url: string;
    /** Provider used for this upload */
    provider: StorageProvider;
    /** Size in bytes */
    size: number;
    /** Content type */
    contentType: string;
}

export interface UploadOptions {
    /** Override the default provider */
    provider?: StorageProvider;
    /** Custom filename (optional) */
    filename?: string;
    /** Content type override */
    contentType?: string;
    /** Encryption status (for metadata) */
    isEncrypted?: boolean;
}

// Get current storage provider from environment
export function getStorageProvider(): StorageProvider {
    const provider = process.env.NEXT_PUBLIC_STORAGE_PROVIDER as StorageProvider;
    return provider || 'mock';
}

// Import provider implementations dynamically to avoid server/client issues
async function getFilebaseUploader() {
    const { uploadToFilebase, getFilebaseUrl } = await import('./filebase');
    return { upload: uploadToFilebase, getUrl: getFilebaseUrl };
}

/**
 * Upload a file to decentralized storage
 */
export async function uploadFile(
    file: File,
    options: UploadOptions = {}
): Promise<StorageResult> {
    const provider = options.provider || getStorageProvider();

    switch (provider) {
        case 'filebase': {
            const { upload } = await getFilebaseUploader();
            return upload(file, options);
        }

        case 'ocean': {
            // Future: Implement Ocean Protocol Uploader.js integration
            // For now, fall through to mock
            console.warn('Ocean provider not yet implemented, using mock');
            return mockUpload(file, options);
        }

        case 'mock':
        default:
            return mockUpload(file, options);
    }
}

/**
 * Get the access URL for a stored file
 */
export function getFileUrl(cid: string, provider?: StorageProvider): string {
    const activeProvider = provider || getStorageProvider();

    switch (activeProvider) {
        case 'filebase': {
            const gateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY || 'https://ipfs.filebase.io/ipfs';
            return `${gateway}/${cid}`;
        }

        case 'ocean': {
            // Future: Ocean gateway URL
            return `https://v4.gateway.oceanprotocol.com/${cid}`;
        }

        case 'mock':
        default:
            // Return a placeholder for mock data
            return '';
    }
}

/**
 * Check if a CID looks like a valid IPFS CID
 */
export function isValidCid(cid: string): boolean {
    if (!cid || typeof cid !== 'string') return false;

    // CIDv0 (Qm...)
    if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)) return true;

    // CIDv1 (baf...)
    if (/^baf[a-z2-7]{56,}$/i.test(cid)) return true;

    return false;
}

/**
 * Mock upload for development/testing
 */
async function mockUpload(file: File, options: UploadOptions = {}): Promise<StorageResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate a mock CID that looks realistic
    const mockCid = `Qm${generateRandomBase58(44)}`;

    return {
        cid: mockCid,
        url: '', // Empty URL triggers fallback UI
        provider: 'mock',
        size: file.size,
        contentType: options.contentType || file.type || 'application/octet-stream'
    };
}

/**
 * Generate random base58 string (IPFS CID compatible)
 */
function generateRandomBase58(length: number): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Upload multiple files in parallel
 */
export async function uploadFiles(
    files: File[],
    options: UploadOptions = {}
): Promise<StorageResult[]> {
    return Promise.all(files.map(file => uploadFile(file, options)));
}

/**
 * Client-side upload via API route
 * This is the preferred method from browser as it keeps S3 credentials server-side
 */
export async function uploadFileViaApi(
    file: File,
    options: { encrypted?: boolean } = {}
): Promise<StorageResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.encrypted) {
        formData.append('encrypted', 'true');
    }

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }

    return response.json();
}
