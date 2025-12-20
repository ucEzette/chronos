// watchtower/monitor.js
require('dotenv').config();
const { ethers } = require("ethers");
const nodemailer = require("nodemailer");
const cron = require('node-cron');

// Configuration
const PROVIDER_URL = process.env.DATAHAVEN_RPC_URL;
const CONTRACT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS;
const VAULT_ABI = require("./ChronosVaultABI.json"); 

const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const vaultContract = new ethers.Contract(CONTRACT_ADDRESS, VAULT_ABI, provider);

// Email Transporter (Use SendGrid/AWS SES in production)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// --- TASK 1: THE VAULT UNLOCKER ---
// Run every hour to check for unlocked capsules
cron.schedule('0 * * * *', async () => {
    console.log("Checking for unlocked capsules...");
    // In production, you would query an indexer (like The Graph) for 'CapsuleCreated' events
    // and check only those that are due.
    
    // Mock logic: Check a specific ID
    const capsuleId = 1; 
    const isReady = await vaultContract.isReady(capsuleId);
    
    if (isReady) {
        const capsule = await vaultContract.getCapsule(capsuleId);
        // If you stored the user's email (encrypted) or have an off-chain DB mapping:
        sendEmail("user@example.com", "Your Time Capsule is Open!", 
            `Retrieve your file with ID: ${capsule.fileId}. Key: [Attached]`);
    }
});

// --- TASK 2: THE VOID (DELETION PROOF) ---
// Listen for real-time deletion events
async function listenForDeletions() {
    // Note: DataHaven deletion events might be on the Substrate layer, not EVM.
    // You might need @polkadot/api to listen to the 'storageHub' pallet.
    
    console.log("Listening for deletion proofs...");
    
    // specific EVM event listener example
    // provider.on(filter, (log) => { ... }) 
    
    // If listening to Substrate events:
    // const api = await ApiPromise.create({ provider: wsProvider });
    // api.query.system.events((events) => {
    //     events.forEach((record) => {
    //         const { event } = record;
    //         if (event.section === 'storageHub' && event.method === 'FileDeleted') {
    //             const [fileId] = event.data;
    //             const txHash = record.phase.asApplyExtrinsic.toHex();
    //             
    //             sendEmail("user@example.com", "Certificate of Oblivion", 
    //                 `File ${fileId} confirmed deleted. Proof Tx: ${txHash}`);
    //         }
    //     });
    // });
}

function sendEmail(to, subject, text) {
    transporter.sendMail({ from: "chronos@bot.com", to, subject, text });
    console.log(`Email sent to ${to}`);
}

listenForDeletions();