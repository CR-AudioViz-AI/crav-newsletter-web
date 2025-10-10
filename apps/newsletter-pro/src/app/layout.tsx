import { TRPCProvider } from '@/lib/trpc/Provider';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Newsletter Pro - CRAudioVizAI',
  description: 'Enterprise email marketing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
