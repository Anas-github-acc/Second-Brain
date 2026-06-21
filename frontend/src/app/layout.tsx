import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@xyflow/react/dist/style.css';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Career Path Simulator | Scenario Graph Engine',
  description: 'Compare major career paths and life decisions with an AI-powered interactive scenario graph.',
  keywords: ['career path', 'AI', 'scenario graph', 'decision simulator', 'life decisions'],
  openGraph: {
    title: 'AI Career Path Scenario Simulator',
    description: 'Visualize every possible outcome of your career decision with a dynamic interactive graph.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
