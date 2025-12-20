import { createPublicClient, http, parseAbiItem } from 'viem';
import { cron } from 'node-cron';
import nodemailer from 'nodemailer';
import 'dotenv/config';

// 1. Configure DataHaven Client
const client = createPublicClient({ 
    transport: http(process.env.DATAHAVEN_RPC_URL) 
});

// 2. Configure Emailer
const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// 3. Task: Listen for "Void" (Deletion) Signals
// This runs continuously looking for new events
async function watchTheVoid() {
    console.log("👁️ Watchtower monitoring for deletions...");
    
    client.watchEvent({
        address: process.env.VAULT_ADDRESS,
        event: parseAbiItem('event VoidSignal(uint256 indexed fileId, address indexed user)'),
        onLogs: async (logs) => {
            for (const log of logs) {
                const { fileId, user } = log.args;
                const txHash = log.transactionHash;

                // In a real app, you fetch the user's email from your DB using the 'user' address
                const userEmail = await getUserEmail(user); 

                await mailer.sendMail({
                    to: userEmail,
                    subject: "🚫 Certificate of Oblivion",
                    text: `Your file (ID: ${fileId}) has been sent to the Void.\n\nProof of Signal: ${txHash}\n\nVerify on Explorer: https://explorer.datahaven.xyz/tx/${txHash}`
                });
                console.log(`Proof sent for File ${fileId}`);
            }
        }
    });
}

// 4. Task: Check for Unlocked Capsules
// Runs every midnight
cron.schedule('0 0 * * *', async () => {
    console.log("Checking for unlocked capsules...");
    // Logic: Query The Graph or an indexer for capsules where unlockTime < now
    // Then email the keys to the recipients.
});

watchTheVoid();