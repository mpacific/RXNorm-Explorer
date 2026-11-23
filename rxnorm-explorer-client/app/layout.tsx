import type { Metadata } from 'next';
import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { AppBar, Toolbar, Typography } from '@mui/material';
import { Roboto } from 'next/font/google';
import Link from 'next/link';
import AppThemeProvider from './theme';

// Self-hosted at build time, with only the Latin subset preloaded and a
// metric-matched fallback so text doesn't shift when the font arrives.
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'RXNorm Explorer',
  description:
    'RXNorm Explorer allows you to look up prescribable drugs and view the relationships between them',
};

const Header = () => {
  return (
    <AppBar>
      <Toolbar>
        <Typography variant="h4">
          <Link href="/">RXNorm Explorer</Link>
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <AppRouterCacheProvider>
          <AppThemeProvider>
            <Header />
            <div className="content-root">{children}</div>
          </AppThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
