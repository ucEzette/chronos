// packages/web/lib/ipfs.ts

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

  // Optional: Add metadata to pinata for better organization
  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 1,
  });
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

/**
 * ROBUST IPFS FETCHER (GATEWAY ROTATION)
 * Used by: dashboard/page.tsx & components/PayLock/Marketplace.tsx
 * Strategy: Cycles through multiple public gateways to bypass 429 Rate Limits and CORS.
 */
export const fetchIPFS = async (cid: string, mimeType?: string): Promise<Blob> => {
  const cleanCid = cid.replace("ipfs://", "").trim();
  
  if (!cleanCid || cleanCid.startsWith("{") || cleanCid.includes("%7B")) {
    throw new Error("Invalid CID: The file reference appears corrupted.");
  }

  // Gateway Priority List (Fastest/Most Reliable First)
  // If you have a dedicated gateway, add it to the top of this list.
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cleanCid}`,
    `https://cloudflare-ipfs.com/ipfs/${cleanCid}`,
    `https://ipfs.io/ipfs/${cleanCid}`,
    `https://dweb.link/ipfs/${cleanCid}`,
    `https://w3s.link/ipfs/${cleanCid}`
  ];

  for (const url of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per gateway
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const blob = await response.blob();
        
        // Validation: Reject HTML error pages (Common issue with some gateways returning 200 OK for 404 pages)
        if (blob.type.includes("text/html") && (!mimeType || !mimeType.includes("html"))) {
           // console.warn(`Gateway ${url} returned HTML instead of data. Skipping.`);
           continue; 
        }
        
        return blob; // Success!
      }
    } catch (e) {
      // Gateway failed or timed out, silently continue to the next one
      continue; 
    }
  }
  
  throw new Error("All IPFS gateways failed to retrieve the file. The network might be busy.");
};

/**
 * HELPER: RESOLVE METADATA JSON
 * Used to quickly fetch descriptions/images for the Marketplace
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