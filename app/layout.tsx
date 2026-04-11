import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Andrey | gmotiatime',
  description: 'Modern portfolio for Andrey, a 14-year-old developer from Gomel, Belarus building AI-driven products like Domain Traffic Light.',
  metadataBase: new URL('https://gmotia.online')
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
