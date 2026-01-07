/**
 * UPLOADS A FILE TO IPFS (VIA PINATA)
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

    if (!res.ok) throw new Error(`Pinata Upload Failed: ${res.statusText}`);

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
 */
export function getIPFSUrl(cid: string | undefined): string | null {
  if (!cid) return null;
  const clean = cleanCid(cid);
  
  // 1. Check for Dedicated Gateway
  const dedicated = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
  if (dedicated) {
    return `${dedicated.replace(/\/$/, "")}/ipfs/${clean}`;
  }

  // 2. Fallback to Cloudflare
  return `https://cloudflare-ipfs.com/ipfs/${clean}`;
}

/**
 * ROBUST IPFS FETCHER (GATEWAY ROTATION)
 * Returns JSON object if metadata, Blob if file.
 */
export const fetchIPFS = async (cid: string, mimeType?: string): Promise<Blob | any> => {
  const clean = cleanCid(cid);
  if (!clean || clean.startsWith("{")) throw new Error("Invalid CID");

  const dedicated = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
  
  const gateways = [
    dedicated ? `${dedicated.replace(/\/$/, "")}/ipfs/${clean}` : null,
    `https://cloudflare-ipfs.com/ipfs/${clean}`,
    `https://ipfs.io/ipfs/${clean}`,
    `https://dweb.link/ipfs/${clean}`,
    `https://gateway.pinata.cloud/ipfs/${clean}`
  ].filter(Boolean) as string[];

  for (const url of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        
        // Return JSON if metadata
        if (contentType && contentType.includes("application/json")) {
          return await response.json();
        }
        
        // Return Blob if file
        const blob = await response.blob();
        if (blob.type.includes("text/html") && (!mimeType || !mimeType.includes("html"))) {
           continue; 
        }
        return blob;
      }
    } catch (e) { continue; }
  }
  
  throw new Error("All IPFS gateways failed.");
};

export const resolveMetadata = async (cid: string) => {
  try {
    const data = await fetchIPFS(cid);
    if (data instanceof Blob) {
       const text = await data.text();
       return JSON.parse(text);
    }
    return data;
  } catch (e) {
    console.warn("Failed to resolve metadata:", cid);
    return null;
  }
};