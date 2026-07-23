"use client";
import { ApolloProvider } from "@apollo/client/react";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:6109' }),
  cache: new InMemoryCache(),
})

export default function({
  children
}: {
  children: React.ReactNode
}) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
}