import {
  StorageHubClient,
  initWasm,
  FileManager,
  ReplicationLevel
} from '@storagehub-sdk/core';
import { MspClient } from '@storagehub-sdk/msp-client';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { types } from '@storagehub/types-bundle';
import { WalletClient, createPublicClient, http } from 'viem';
import { datahaven } from './chains';
import { AccountId20, H256 } from '@polkadot/types/interfaces';

// Configuration
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://services.datahaven-testnet.network/testnet';
const WSS_URL = process.env.NEXT_PUBLIC_WSS_URL || 'wss://services.datahaven-testnet.network/testnet';
const MSP_URL = process.env.NEXT_PUBLIC_MSP_URL || 'https://deo-dh-backend.testnet.datahaven-infra.network/';
const FILESYSTEM_CONTRACT = '0x0000000000000000000000000000000000000404';

// Timeouts for slow testnets (5 minutes)
const TX_TIMEOUT_MS = 300_000;

let wasmInitialized = false;

// --- INITIALIZATION ---
export const initDataHaven = async (walletClient: WalletClient) => {
  if (!wasmInitialized) {
    await initWasm();
    wasmInitialized = true;
  }

  const publicClient = createPublicClient({
    chain: datahaven,
    transport: http(RPC_URL)
  });

  const storageHubClient = new StorageHubClient({
    rpcUrl: RPC_URL,
    chain: datahaven,
    walletClient: walletClient,
    filesystemContractAddress: FILESYSTEM_CONTRACT,
  });

  const mspClient = await MspClient.connect({ baseUrl: MSP_URL });
  const provider = new WsProvider(WSS_URL);
  const polkadotApi = await ApiPromise.create({ provider, typesBundle: types, noInitWarn: true });

  return { storageHubClient, mspClient, polkadotApi, publicClient };
};

// --- AUTHENTICATION HELPER (Session Reuse) ---
// Call this ONCE before multiple uploads to get a reusable token
export const authenticateDataHaven = async (walletClient: WalletClient, address: string): Promise<string> => {
  const mspClient = await MspClient.connect({ baseUrl: MSP_URL });

  // Get domain safely (works in browser and prevents SSR issues)
  const domain = typeof window !== 'undefined' ? window.location.host : 'chronos.app';
  const uri = typeof window !== 'undefined' ? window.location.origin : 'https://chronos.app';

  console.log("Authenticating DataHaven Session...", { domain, uri });
  const siwe = await mspClient.auth.SIWE(walletClient, domain, uri);
  return siwe.token;
};

// --- UPLOAD HELPER ---
export const uploadToDataHaven = async (
  file: File,
  walletClient: WalletClient,
  address: `0x${string}`,
  authToken?: string
) => {
  const { storageHubClient, mspClient, polkadotApi, publicClient } = await initDataHaven(walletClient);

  const fileBuffer = await file.arrayBuffer();
  const fileManager = new FileManager({
    size: file.size,
    stream: () => new Blob([fileBuffer]).stream() as any,
  });
  const fingerprint = await fileManager.getFingerprint();

  const bucketName = `user-${address.toLowerCase().slice(2, 8)}`;
  const bucketId = (await storageHubClient.deriveBucketId(address, bucketName)) as `0x${string}`;

  const bucketQuery = await polkadotApi.query.providers.buckets(bucketId);

  if (bucketQuery.isEmpty) {
    const mspInfo = await mspClient.info.getInfo();
    const valueProps = await mspClient.info.getValuePropositions();

    const txHash = await storageHubClient.createBucket(
      mspInfo.mspId as `0x${string}`,
      bucketName,
      false,
      valueProps[0].id as `0x${string}`
    );

    if (txHash) await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: TX_TIMEOUT_MS });
  }

  const mspInfo = await mspClient.info.getInfo();
  const peerIds = mspInfo.multiaddresses.map((addr: string) => addr.split('/p2p/').pop()!).filter(Boolean);

  const requestTx = await storageHubClient.issueStorageRequest(
    bucketId,
    file.name,
    fingerprint.toHex() as `0x${string}`,
    BigInt(file.size),
    mspInfo.mspId as `0x${string}`,
    peerIds,
    ReplicationLevel.Custom,
    1
  );

  if (requestTx) await publicClient.waitForTransactionReceipt({ hash: requestTx, timeout: TX_TIMEOUT_MS });

  const registry = polkadotApi.registry;
  const ownerType = registry.createType('AccountId20', address) as unknown as AccountId20;
  const bucketIdType = registry.createType('H256', bucketId) as unknown as H256;
  const fileKey = await fileManager.computeFileKey(ownerType, bucketIdType, file.name);

  // Session token reuse - only sign if no token provided
  let token = authToken;
  if (!token) {
    const domain = typeof window !== 'undefined' ? window.location.host : 'chronos.app';
    const uri = typeof window !== 'undefined' ? window.location.origin : 'https://chronos.app';
    const siwe = await mspClient.auth.SIWE(walletClient, domain, uri);
    token = siwe.token;
  }

  const authMspClient = await MspClient.connect(
    { baseUrl: MSP_URL },
    async () => ({ token: token!, user: { address } })
  );

  const receipt = await authMspClient.files.uploadFile(
    bucketId,
    fileKey.toHex(),
    await fileManager.getFileBlob(),
    address,
    file.name
  );

  if (receipt.status !== 'upload_successful') throw new Error(`Upload failed: ${receipt.status}`);

  return fileKey.toHex();
};

// --- AGGRESSIVE URL SANITIZER ---
// Handles all edge cases: double paths, protocol prefixes, encoded characters
export const getDataHavenUrl = (input: string | undefined | null): string => {
  // Guard against null/undefined/empty
  if (!input || typeof input !== 'string') return "";

  let clean = input.trim();

  // Return empty for obviously invalid inputs
  if (clean.length === 0) return "";

  // 1. DECODE: Handle URL-encoded characters first
  try {
    // Decode up to 3 times for triple-encoded paths
    let decoded = clean;
    for (let i = 0; i < 3; i++) {
      const nextDecode = decodeURIComponent(decoded);
      if (nextDecode === decoded) break;
      decoded = nextDecode;
    }
    clean = decoded;
  } catch {
    // If decoding fails, continue with original
  }

  // 2. STRIP: Remove all known protocol prefixes
  // Handles: ipfs://, ar://, https://, http://
  clean = clean.replace(/^(ipfs|ar|https?):\/\//i, "");

  // 3. STRIP: Remove any domain/host prefixes (including localhost)
  // Matches: localhost:3000/, 127.0.0.1:8080/, example.com/, etc.
  clean = clean.replace(/^(localhost|127\.0\.0\.1|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})(:\d+)?\//, "");

  // 4. STRIP: Remove ANY occurrence of /api/files/ prefix (handles double/triple paths)
  // This is the critical fix for the 404 double-path bug
  // Uses global replace to catch repeated segments like /api/files//api/files/
  while (clean.includes('/api/files/') || clean.startsWith('api/files/')) {
    clean = clean.replace(/\/?api\/files\//g, "");
  }

  // 5. STRIP: Remove leading slashes and whitespace
  clean = clean.replace(/^[\s\/]+/, "").trim();

  // 6. STRIP: Remove trailing slashes
  clean = clean.replace(/\/+$/, "");

  // Return empty if nothing left after cleaning
  if (clean.length === 0) return "";

  // --- SMART ROUTING ---

  // 7. CHECK: Is it already a full HTTP/HTTPS URL? (External links)
  // Return external URLs as-is (they're already valid)
  if (/^https?:\/\//i.test(input) && !input.includes('localhost') && !input.includes('127.0.0.1') && !input.includes('/api/files/')) {
    return input.trim();
  }

  // 8. CHECK: Mock/Demo IPFS hash (contains "Hash", "Secure", or has numbers in suspicious positions)
  // These are generated by demo/mock upload functions and won't resolve on any network
  if (clean.startsWith('Qm') && (clean.includes('Hash') || clean.includes('Secure') || /\d{10,}/.test(clean))) {
    // Return a placeholder for mock data - the card will show its fallback UI
    return '';
  }

  // 9. CHECK: Legacy IPFS CID (Starts with Qm, exactly 46 chars of valid base58)
  // Valid base58 characters: 1-9, A-H, J-N, P-Z, a-k, m-z (no 0, I, O, l)
  // Using Filebase gateway as primary (for files we uploaded), Cloudflare as fallback
  const ipfsGateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY || 'https://ipfs.filebase.io/ipfs';

  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(clean)) {
    return `${ipfsGateway}/${clean}`;
  }

  // 10. CHECK: Any Qm-prefixed string (try IPFS gateway but may fail)
  if (clean.startsWith('Qm') && clean.length >= 46) {
    return `${ipfsGateway}/${clean}`;
  }

  // 11. CHECK: IPFS CIDv1 (Starts with bafy, bafk, etc.)
  if (/^baf[a-z2-7]{50,}$/i.test(clean)) {
    return `${ipfsGateway}/${clean}`;
  }

  // 10. CHECK: Arweave Transaction ID (43 characters, base64url)
  if (/^[a-zA-Z0-9_-]{43}$/.test(clean)) {
    return `https://arweave.net/${clean}`;
  }

  // 11. DEFAULT: DataHaven Key (Hex string starting with 0x, 66 chars)
  // Route through local proxy API
  if (/^0x[a-fA-F0-9]{64}$/.test(clean)) {
    return `/api/files/${clean}`;
  }

  // 12. FALLBACK: If it looks like a hex string without 0x prefix
  if (/^[a-fA-F0-9]{64}$/.test(clean)) {
    return `/api/files/0x${clean}`;
  }

  // 13. LAST RESORT: Assume it's a DataHaven key and route through proxy
  // This handles any other format we haven't explicitly matched
  return `/api/files/${clean}`;
};

// --- HELPER: Validate if a URL/key looks valid ---
export const isValidDataHavenKey = (key: string | undefined): boolean => {
  if (!key) return false;
  const clean = key.replace(/^0x/i, '').trim();
  return /^[a-fA-F0-9]{64}$/.test(clean);
};

// --- HELPER: Extract key from any URL format ---
export const extractKeyFromUrl = (url: string): string | null => {
  if (!url) return null;

  // Try to extract hex key from URL
  const hexMatch = url.match(/0x[a-fA-F0-9]{64}/);
  if (hexMatch) return hexMatch[0];

  // Try to extract IPFS CID
  const ipfsMatch = url.match(/Qm[1-9A-HJ-NP-Za-km-z]{44,}/);
  if (ipfsMatch) return ipfsMatch[0];

  // Try to extract CIDv1
  const cidv1Match = url.match(/baf[a-z2-7]{50,}/i);
  if (cidv1Match) return cidv1Match[0];

  return null;
};