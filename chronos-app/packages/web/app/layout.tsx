import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "../components/Providers";

// Using system fonts to avoid Google Fonts timeout issues
// If you want Google Fonts, uncomment below when network is stable:
// import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
// const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: 'swap', variable: '--font-display' });
// const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], display: 'swap', variable: '--font-mono' });

// System font stack (fast loading, no network dependency)
const fontClasses = "";  // No font classes when using system fonts

export const viewport: Viewport = {
  themeColor: '#00E5FF',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "CHRONOS | Decentralized Digital Marketplace",
  description: "Secure peer-to-peer encrypted file trading on the blockchain. Buy and sell digital assets with confidence.",
  keywords: ["marketplace", "crypto", "NFT", "decentralized", "encrypted", "files", "blockchain"],
  authors: [{ name: "CHRONOS" }],
  icons: {
    icon: [
      { url: '/chronos-logo.png', type: 'image/png' },
    ],
    apple: '/chronos-logo.png',
  },
  openGraph: {
    title: "CHRONOS | Decentralized Digital Marketplace",
    description: "Secure peer-to-peer encrypted file trading on the blockchain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Suppress hydration warnings from browser extensions */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress browser extension errors in console
              const originalError = console.error;
              console.error = (...args) => {
                const msg = args[0]?.toString() || '';
                // Filter out known extension-related errors
                if (
                  msg.includes('MetaMask') ||
                  msg.includes('Backpack') ||
                  msg.includes('window.ethereum') ||
                  msg.includes('MutationObserver') ||
                  msg.includes('solanaActions') ||
                  msg.includes('provider-injection') ||
                  msg.includes('isZerion')
                ) return;
                originalError.apply(console, args);
              };
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}