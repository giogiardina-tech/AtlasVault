import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AtlasVault — TikTok Trivia Studio',
  description: 'Private AI-powered TikTok geography and history trivia game creator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
