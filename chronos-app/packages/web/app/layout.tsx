import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers"; // Import the file you created above

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chronos PayLock",
  description: "Decentralized Digital Marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* CRITICAL FIX: Everything must be inside <Providers> */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}