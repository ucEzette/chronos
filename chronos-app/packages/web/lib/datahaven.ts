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

// --- AUTHENTICATION HELPER ---
export const authenticateDataHaven = async (walletClient: WalletClient, address: string) => {
  const mspClient = await MspClient.connect({ baseUrl: MSP_URL });
  const domain = window.location.host; 
  const uri = window.location.origin;
  
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
    
    if (txHash) await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 300_000 });
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
  
  if (requestTx) await publicClient.waitForTransactionReceipt({ hash: requestTx, timeout: 300_000 });

  const registry = polkadotApi.registry;
  const ownerType = registry.createType('AccountId20', address) as unknown as AccountId20;
  const bucketIdType = registry.createType('H256', bucketId) as unknown as H256;
  const fileKey = await fileManager.computeFileKey(ownerType, bucketIdType, file.name);

  let token = authToken;
  if (!token) {
    const domain = window.location.host; 
    const uri = window.location.origin;
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
export const getDataHavenUrl = (input: string | undefined) => {
  if (!input) return "";
  
  let clean = String(input).trim();

  // 1. Remove "ipfs://" scheme
  clean = clean.replace(/^ipfs:\/\//, "");

  // 2. Remove accidental localhost or proxy prefixes (This fixes the double path error)
  // This regex matches "http://localhost:3000/api/files/" or just "/api/files/" at the start
  clean = clean.replace(/^(https?:\/\/[^\/]+)?(\/api\/files\/)+/, "");

  // 3. Remove leading slashes
  clean = clean.replace(/^\/+/, "");

  // 4. CHECK: Legacy IPFS CID (Starts with Qm)
  if (clean.startsWith("Qm")) {
    return `https://cloudflare-ipfs.com/ipfs/${clean}`;
  }

  // 5. CHECK: Is it already a full HTTP URL? (External links)
  if (clean.startsWith("http")) {
    return clean;
  }

  // 6. DEFAULT: DataHaven Key (Hex) -> Route to Local Proxy
  // We prepend the single, correct proxy path here
  return `/api/files/${clean}`;
};