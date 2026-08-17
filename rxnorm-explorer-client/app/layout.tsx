import 'dotenv/config';
import type { Metadata } from 'next';
import './globals.css';
import ApolloProvider from './providers/apolloProvider';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { AppBar, Toolbar, Typography } from '@mui/material';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RXNorm',
  description: 'RXNorm GraphQL example',
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
    <html lang="en">
      <ApolloProvider>
        <AppRouterCacheProvider>
          <body>
            <Header />
            <div className="content-root">{children}</div>
          </body>
        </AppRouterCacheProvider>
      </ApolloProvider>
    </html>
  );
}
