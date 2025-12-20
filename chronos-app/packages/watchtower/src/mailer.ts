import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', // Or use 'SMTP' for SendGrid/AWS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendProofEmail = async (to: string, fileId: string, txHash: string) => {
  await transporter.sendMail({
    from: '"Chronos Watchtower" <no-reply@chronos.xyz>',
    to: to,
    subject: `🚫 Proof of Deletion: File #${fileId}`,
    text: `Your file has been confirmed deleted from the DataHaven network.\n\nTransaction Hash: ${txHash}\n\nThis proof is cryptographically verifiable on-chain.`,
  });
};