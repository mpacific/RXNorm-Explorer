import "dotenv/config";
import type { Metadata } from "next";
import "./globals.css";
import ApolloProvider from './providers/apolloProvider'

export const metadata: Metadata = {
  title: "RXNorm",
  description: "RXNorm GraphQL example",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
    >
      <ApolloProvider>
        <body className="p-10">{children}</body>
      </ApolloProvider>
    </html>
  );
}
