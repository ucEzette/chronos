/**
 * File Upload API Route
 * 
 * Handles file uploads to decentralized storage.
 * S3 credentials are kept server-side for security.
 * 
 * POST /api/upload
 * Body: FormData with 'file' field
 * Returns: { cid, url, provider, size, contentType }
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const FILEBASE_ENDPOINT = 'https://s3.filebase.com';
const FILEBASE_REGION = 'us-east-1';

// Create S3 client for Filebase
function getFilebaseClient(): S3Client | null {
    const accessKey = process.env.FILEBASE_ACCESS_KEY;
    const secretKey = process.env.FILEBASE_SECRET_KEY;

    if (!accessKey || !secretKey) {
        return null;
    }

    return new S3Client({
        endpoint: FILEBASE_ENDPOINT,
        region: FILEBASE_REGION,
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
        },
        forcePathStyle: true,
    });
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const isEncrypted = formData.get('encrypted') === 'true';

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const provider = process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'mock';

        // Handle Filebase uploads
        if (provider === 'filebase') {
            const client = getFilebaseClient();

            if (!client) {
                return NextResponse.json(
                    { error: 'Filebase not configured. Set FILEBASE_ACCESS_KEY and FILEBASE_SECRET_KEY.' },
                    { status: 500 }
                );
            }

            const bucket = process.env.FILEBASE_BUCKET || 'chronos-files';
            const gateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY || 'https://ipfs.filebase.io/ipfs';

            // Generate unique key
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 10);
            const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `${timestamp}-${randomId}-${safeFilename}`;

            // Convert to buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Upload to Filebase
            await client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: buffer,
                ContentType: file.type || 'application/octet-stream',
                Metadata: {
                    encrypted: isEncrypted ? 'true' : 'false',
                    originalName: file.name,
                },
            }));

            // Get CID from metadata
            const headResponse = await client.send(new HeadObjectCommand({
                Bucket: bucket,
                Key: key,
            }));

            const cid = headResponse.Metadata?.['cid'];

            if (!cid) {
                return NextResponse.json(
                    { error: 'Failed to get CID from Filebase' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                cid,
                url: `${gateway}/${cid}`,
                provider: 'filebase',
                size: file.size,
                contentType: file.type,
            });
        }

        // Mock provider for development
        await new Promise(resolve => setTimeout(resolve, 1000));

        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let mockCid = 'Qm';
        for (let i = 0; i < 44; i++) {
            mockCid += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return NextResponse.json({
            cid: mockCid,
            url: '',
            provider: 'mock',
            size: file.size,
            contentType: file.type,
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
