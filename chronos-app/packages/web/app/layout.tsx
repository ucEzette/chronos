import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "../components/Providers";

export const viewport: Viewport = {
  themeColor: '#13ecda',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "ONEWAY | Decentralized Digital Marketplace",
  description: "Secure peer-to-peer encrypted file trading on the blockchain. Buy and sell digital assets with confidence.",
  keywords: ["marketplace", "crypto", "NFT", "decentralized", "encrypted", "files", "blockchain"],
  authors: [{ name: "ONEWAY" }],
  icons: {
    icon: [
      { url: '/oneway-logo.jpg', type: 'image/jpeg' },
    ],
    apple: '/oneway-logo.jpg',
  },
  openGraph: {
    title: "ONEWAY | Decentralized Digital Marketplace",
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
    <html lang="en" className="dark">
      <head>
        {/* Google Fonts: Sora, Satoshi (via Fontshare proxy), Manrope, Space Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols for icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        {/* Suppress hydration warnings from browser extensions */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const originalError = console.error;
              console.error = (...args) => {
                const msg = args[0]?.toString() || '';
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
      <body className="font-body bg-background text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}