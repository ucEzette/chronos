export async function uploadToIPFS(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT; 

  if (!PINATA_JWT) {
    throw new Error("Missing Pinata JWT");
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!res.ok) throw new Error("IPFS Upload Failed");
  
  const data = await res.json();
  return data.IpfsHash;
}