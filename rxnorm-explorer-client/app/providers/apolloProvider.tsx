'use client';
import { ApolloProvider } from '@apollo/client/react';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: process.env.NEXT_PUBLIC_APOLLO_URL }),
  cache: new InMemoryCache(),
  // We're ignoring this line because typescript complains it's not valid, but it is
  // @ts-ignore
  connectDevTools: true,
});

export default function ({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
