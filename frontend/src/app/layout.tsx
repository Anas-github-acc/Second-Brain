import type { Metadata } from 'next';
import '@xyflow/react/dist/style.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Second Brain | Career Choice to Nodes',
  description: 'Compare your major life or career path via interactive graph and explore possible outcomes as nodes and query what-if.',
  keywords: ['career path', 'AI', 'scenario graph', 'decision simulator', 'life decisions', 'second brain'],
  openGraph: {
    title: 'Second Brain — Career Choice to Nodes',
    description: 'Visualize every possible outcome of your career decision with a dynamic interactive graph.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400;0,500;1,400&family=Google+Sans+Display:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
