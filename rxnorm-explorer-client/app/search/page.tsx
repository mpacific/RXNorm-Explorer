'use client';
import { Container, Typography } from '@mui/material';
import { useMemo } from 'react';
import SearchBox from '../components/searchBox';
import { useSearchParams } from 'next/navigation';
import NoSearchTerm from '../components/noSearchTerm';
import SearchResults from '../components/searchResults';
import { SearchTerm } from '../types/searchTerm';

export default function Search(props: SearchTerm) {
  const searchParams: URLSearchParams = useSearchParams();
  const params: {
    search?: string;
    get: (key: string) => string | null;
  } = new URLSearchParams(searchParams.toString());
  const urlSearchTerm: string | null = params.get('search');

  const [pageSearchTerm, doSearch] = useMemo(() => {
    if (urlSearchTerm) {
      return [urlSearchTerm, true];
    }

    return [props.searchTerm, false];
  }, [urlSearchTerm]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Search Results
      </Typography>
      <SearchBox searchTerm={pageSearchTerm} />
      {pageSearchTerm && doSearch && (
        // Keyed on the search term so a new search remounts rather than
        // re-rendering -- otherwise the cursor from the old search survives
        // and pages us into the middle of the new results.
        <SearchResults key={pageSearchTerm} searchTerm={pageSearchTerm} />
      )}
      {!pageSearchTerm && <NoSearchTerm />}
    </Container>
  );
}
