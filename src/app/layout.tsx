import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agenda - Campanha',
  description: 'Agenda da campanha (Google Calendar)',
  applicationName: 'Agenda Campanha',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Agenda Campanha' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
