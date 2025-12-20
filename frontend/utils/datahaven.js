// utils/datahaven.js
const DATAHAVEN_RPC = "https://services.datahaven-testnet.network/testnet"; // datahaven RPC

export const uploadToDataHaven = async (encryptedFileBlob, duration) => {
    // 1. Request Storage (Find Provider)
    // This is a simplified flow. In production, you'd select an MSP from the list.
    
    // 2. Upload Data
    // Assuming DataHaven provides an endpoint or IPFS-like gateway for raw data
    const formData = new FormData();
    formData.append("file", encryptedFileBlob);
    
    // Mocking the upload response for this guide
    const response = await fetch(`${DATAHAVEN_RPC}/store`, {
        method: "POST",
        body: formData
    });
    
    const data = await response.json();
    return data.fileId; // The File ID is critical for the "Breakup Button"
};

export const deleteFromDataHaven = async (fileId, userSignature) => {
    // Call the custom RPC for deletion
    const payload = {
        jsonrpc: "2.0",
        method: "storageHub_deleteFile",
        params: [fileId, userSignature],
        id: 1
    };
    
    const response = await fetch(DATAHAVEN_RPC, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    
    return await response.json();
};