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

  // Initial unauthenticated connection
  const mspClient = await MspClient.connect({ baseUrl: MSP_URL });

  const provider = new WsProvider(WSS_URL);
  const polkadotApi = await ApiPromise.create({ provider, typesBundle: types, noInitWarn: true });

  return { storageHubClient, mspClient, polkadotApi, publicClient };
};

// --- UPLOAD HELPER ---
export const uploadToDataHaven = async (file: File, walletClient: WalletClient, address: `0x${string}`) => {
  const { storageHubClient, mspClient, polkadotApi, publicClient } = await initDataHaven(walletClient);

  // 1. Prepare File
  const fileBuffer = await file.arrayBuffer();
  const fileManager = new FileManager({
    size: file.size,
    stream: () => new Blob([fileBuffer]).stream() as any,
  });
  const fingerprint = await fileManager.getFingerprint();
  
  // 2. Ensure Bucket Exists
  const bucketName = `user-${address.toLowerCase().slice(2, 8)}`;
  const bucketId = (await storageHubClient.deriveBucketId(address, bucketName)) as `0x${string}`;
  
  const bucketQuery = await polkadotApi.query.providers.buckets(bucketId);
  
  if (bucketQuery.isEmpty) {
    console.log("Creating new bucket:", bucketName);
    const mspInfo = await mspClient.info.getInfo();
    const valueProps = await mspClient.info.getValuePropositions();
    
    const txHash = await storageHubClient.createBucket(
      mspInfo.mspId as `0x${string}`, 
      bucketName, 
      false, 
      valueProps[0].id as `0x${string}`
    );
    
    // Increased timeout to 120s
    if (txHash) {
      await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 });
    }
  }

  // 3. Issue Storage Request
  const mspInfo = await mspClient.info.getInfo();
  const peerIds = mspInfo.multiaddresses.map((addr: string) => addr.split('/p2p/').pop()!).filter(Boolean);
  
  console.log("Issuing storage request...");
  
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
  
  // Increased timeout to 120s
  if (requestTx) {
    await publicClient.waitForTransactionReceipt({ hash: requestTx, timeout: 120_000 });
  }

  // 4. Calculate File Key
  const registry = polkadotApi.registry;
  const ownerType = registry.createType('AccountId20', address) as unknown as AccountId20;
  const bucketIdType = registry.createType('H256', bucketId) as unknown as H256;
  const fileKey = await fileManager.computeFileKey(ownerType, bucketIdType, file.name);

  // 5. Authenticate with MSP (SIWE)
  // FIX: Ensure domain matches browser exactly for successful verification
  const domain = window.location.hostname;
  const uri = window.location.origin;
  
  console.log("Authenticating...", { domain, uri });
  const siwe = await mspClient.auth.SIWE(walletClient, domain, uri);
  
  // 6. Connect with Auth Session
  // We create a NEW client instance with the session provider
  const authMspClient = await MspClient.connect(
    { baseUrl: MSP_URL },
    async () => ({ 
      token: siwe.token, 
      user: { address } 
    })
  );

  // 7. Upload
  console.log("Uploading bytes...");
  const receipt = await authMspClient.files.uploadFile(
    bucketId,
    fileKey.toHex(),
    await fileManager.getFileBlob(),
    address,
    file.name
  );

  if (receipt.status !== 'upload_successful') {
    throw new Error(`Upload failed: ${receipt.status}`);
  }

  return fileKey.toHex(); 
};

// --- URL GENERATOR ---
export const getDataHavenUrl = (fileKey: string) => {
  if (!fileKey) return "";
  return `/api/files/${fileKey}`;
};