import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MindCopilot — Real-time Meeting Assistant',
  description:
    'AI-powered meeting copilot: live transcription, smart suggestions, and contextual chat.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
