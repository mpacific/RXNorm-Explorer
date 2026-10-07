'use client';
import { Container, Typography } from '@mui/material';
import { Suspense } from 'react';
import SearchBox from '../components/searchBox';
import { useSearchParams } from 'next/navigation';
import LoadingMessage from '../components/loading';
import NoSearchTerm from '../components/noSearchTerm';
import SearchResults from '../components/searchResults';

// The search term only exists in the browser's URL, so everything that reads
// it renders on the client behind a Suspense boundary; the rest of the page
// is prerendered.
export default function Search() {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Search Results
      </Typography>
      <Suspense fallback={<LoadingMessage />}>
        <SearchForTerm />
      </Suspense>
    </Container>
  );
}

function SearchForTerm() {
  const searchTerm = useSearchParams().get('search') ?? '';

  return (
    <>
      <SearchBox searchTerm={searchTerm} />
      {searchTerm && (
        // Keyed on the search term so a new search remounts rather than
        // re-rendering -- otherwise the cursor from the old search survives
        // and pages us into the middle of the new results.
        <SearchResults key={searchTerm} searchTerm={searchTerm} />
      )}
      {!searchTerm && <NoSearchTerm />}
    </>
  );
}
