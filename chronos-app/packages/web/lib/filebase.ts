/**
 * Filebase S3 Integration
 * 
 * Filebase provides S3-compatible IPFS pinning with 5GB free tier.
 * Files uploaded here are automatically pinned to IPFS and get a CID.
 * 
 * Setup:
 * 1. Create account at https://filebase.com
 * 2. Create an IPFS bucket named 'chronos-files'
 * 3. Get Access Key and Secret Key from dashboard
 * 4. Add to .env.local:
 *    FILEBASE_ACCESS_KEY=your_key
 *    FILEBASE_SECRET_KEY=your_secret
 *    FILEBASE_BUCKET=chronos-files
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { StorageResult, UploadOptions } from './storage';

// Filebase S3 endpoint
const FILEBASE_ENDPOINT = 'https://s3.filebase.com';
const FILEBASE_REGION = 'us-east-1';

// Create S3 client for Filebase
function getFilebaseClient(): S3Client {
    const accessKey = process.env.FILEBASE_ACCESS_KEY;
    const secretKey = process.env.FILEBASE_SECRET_KEY;

    if (!accessKey || !secretKey) {
        throw new Error(
            'Filebase credentials not configured. Set FILEBASE_ACCESS_KEY and FILEBASE_SECRET_KEY in .env.local'
        );
    }

    return new S3Client({
        endpoint: FILEBASE_ENDPOINT,
        region: FILEBASE_REGION,
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
        },
        forcePathStyle: true, // Required for S3-compatible services
    });
}

/**
 * Upload a file to Filebase IPFS
 * 
 * @param file - File to upload
 * @param options - Upload options
 * @returns StorageResult with CID and gateway URL
 */
export async function uploadToFilebase(
    file: File,
    options: UploadOptions = {}
): Promise<StorageResult> {
    const client = getFilebaseClient();
    const bucket = process.env.FILEBASE_BUCKET || 'chronos-files';
    const gateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY || 'https://ipfs.filebase.io/ipfs';

    // Generate unique key for the file
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const safeFilename = (options.filename || file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${timestamp}-${randomId}-${safeFilename}`;

    // Convert File to Buffer/ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Filebase
    const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || file.type || 'application/octet-stream',
        // Filebase-specific metadata
        Metadata: {
            'x-amz-meta-encrypted': options.isEncrypted ? 'true' : 'false',
            'x-amz-meta-original-name': file.name,
        },
    });

    await client.send(putCommand);

    // Retrieve the CID from the uploaded object's metadata
    // Filebase stores the IPFS CID in the x-amz-meta-cid header
    const headCommand = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    const headResponse = await client.send(headCommand);

    // Filebase returns CID in the 'x-amz-meta-cid' metadata field
    const cid = headResponse.Metadata?.['cid'] || headResponse.Metadata?.['x-amz-meta-cid'];

    if (!cid) {
        throw new Error('Failed to get IPFS CID from Filebase. Check bucket configuration.');
    }

    return {
        cid,
        url: `${gateway}/${cid}`,
        provider: 'filebase',
        size: file.size,
        contentType: file.type || 'application/octet-stream',
    };
}

/**
 * Get the gateway URL for a Filebase/IPFS CID
 */
export function getFilebaseUrl(cid: string): string {
    const gateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY || 'https://ipfs.filebase.io/ipfs';
    return `${gateway}/${cid}`;
}

/**
 * Validate Filebase configuration
 */
export function isFilebaseConfigured(): boolean {
    return !!(
        process.env.FILEBASE_ACCESS_KEY &&
        process.env.FILEBASE_SECRET_KEY &&
        process.env.FILEBASE_BUCKET
    );
}
