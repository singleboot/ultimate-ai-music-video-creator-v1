import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata = {
  title: 'MV Creator v3 - Node Editor',
  description: 'Build AI music video workflows visually',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#05010d',
          color: '#ffffff',
          fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
