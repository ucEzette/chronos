/**
 * UPLOADS A FILE TO IPFS (VIA PINATA)
 * Used by: create-listing/page.tsx
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  if (!process.env.NEXT_PUBLIC_PINATA_JWT) {
    throw new Error("Missing NEXT_PUBLIC_PINATA_JWT environment variable.");
  }

  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({ name: file.name });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({ cidVersion: 1 });
  formData.append('pinataOptions', options);

  try {
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
      },
      body: formData
    });

    if (!res.ok) {
      throw new Error(`Pinata Upload Failed: ${res.statusText}`);
    }

    const data = await res.json();
    return `ipfs://${data.IpfsHash}`;
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    throw error;
  }
};

// --- HELPER: SANITIZE CID ---
const cleanCid = (cid: string) => {
  if (!cid) return "";
  return cid
    .replace("ipfs://", "")
    .replace("https://ipfs.io/ipfs/", "")
    .replace("https://gateway.pinata.cloud/ipfs/", "")
    .replace("https://cloudflare-ipfs.com/ipfs/", "")
    .trim();
};

/**
 * HELPER: GENERATE DIRECT GATEWAY URL
 * Used by: Marketplace Card & Item Page for <img src /> tags.
 * PRIORITIZES: Your Dedicated Gateway in .env.local
 */
export function getIPFSUrl(cid: string | undefined): string | null {
  if (!cid) return null;
  const clean = cleanCid(cid);
  
  // 1. Check for Dedicated Gateway
  const dedicated = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
  if (dedicated) {
    // Ensure no trailing slash to avoid double //
    return `${dedicated.replace(/\/$/, "")}/ipfs/${clean}`;
  }

  // 2. Fallback to Cloudflare (Fastest public gateway)
  return `https://cloudflare-ipfs.com/ipfs/${clean}`;
}

/**
 * ROBUST IPFS FETCHER (GATEWAY ROTATION)
 * Used by: dashboard/page.tsx & components/PayLock/Marketplace.tsx
 * Strategy: Tries Dedicated Gateway FIRST, then cycles public ones.
 */
export const fetchIPFS = async (cid: string, mimeType?: string): Promise<Blob> => {
  const clean = cleanCid(cid);
  
  if (!clean || clean.startsWith("{") || clean.includes("%7B")) {
    throw new Error("Invalid CID: The file reference appears corrupted.");
  }

  // 1. Build Priority List
  const dedicated = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
  
  const gateways = [
    // Priority #1: Dedicated Gateway
    dedicated ? `${dedicated.replace(/\/$/, "")}/ipfs/${clean}` : null,
    // Priority #2: Reliable Public Gateways
    `https://cloudflare-ipfs.com/ipfs/${clean}`,
    `https://ipfs.io/ipfs/${clean}`,
    `https://gateway.pinata.cloud/ipfs/${clean}`, // Public Pinata (often rate limited)
    `https://dweb.link/ipfs/${clean}`
  ].filter(Boolean) as string[]; // Remove nulls

  // 2. Try fetching sequentially
  for (const url of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const blob = await response.blob();
        
        // Reject HTML error pages disguised as 200 OK
        if (blob.type.includes("text/html") && (!mimeType || !mimeType.includes("html"))) {
           continue; 
        }
        
        return blob; // Success!
      }
    } catch (e) {
      // Continue to next gateway on failure
      continue; 
    }
  }
  
  throw new Error("All IPFS gateways failed. Network may be busy or CID is invalid.");
};

/**
 * HELPER: RESOLVE METADATA JSON
 */
export const resolveMetadata = async (cid: string) => {
  try {
    const blob = await fetchIPFS(cid);
    const text = await blob.text();
    return JSON.parse(text);
  } catch (e) {
    console.warn("Failed to resolve metadata for CID:", cid);
    return null;
  }
};