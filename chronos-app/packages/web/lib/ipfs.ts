import { getDataHavenUrl } from "./datahaven";

/**
 * DEPRECATED: Redirects to DataHaven Proxy
 * Used by legacy components still importing from @lib/ipfs
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  throw new Error("Please use uploadToDataHaven from @lib/datahaven");
};

export function getIPFSUrl(cid: string | undefined): string | null {
  if (!cid) return null;
  // If it's a DataHaven key (pure hex), pass it through
  // If it has ipfs:// prefix, strip it
  return getDataHavenUrl(cid.replace("ipfs://", ""));
}

export const fetchIPFS = async (cid: string): Promise<Blob | any> => {
  const url = getIPFSUrl(cid);
  if (!url) throw new Error("Invalid Key");
  
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed");
  
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  return await res.blob();
};