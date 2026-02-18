import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ActionCore - Merchant Dashboard',
  description: 'Manage your Solana Blinks and Orders',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
