import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/Providers'; // Import the new component

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chronos',
  description: 'Master Your Past. Secure Your Future.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap children with Providers to enable Wallet/Blockchain features */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}