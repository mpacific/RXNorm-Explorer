import { useEffect, useState } from 'react';
import ErrorMessage from './error';
import SearchResultsList from './searchResultsList';
import { Drug } from '@/types/drug';
import { SearchTerm } from '../types/searchTerm';
import { SortFields } from '../types/sortFields';

const fetchSearchResults = async (
  searchTerm: string,
  cursor: string,
  sortField: string,
  sortDirection: string
): Promise<{
  searchResults: Drug[];
  totalResults: number;
} | null> => {
  const searchResults = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/search?searchTerm=${searchTerm}&cursor=${cursor}&sortField=${sortField}&sortDirection=${sortDirection}`
  );

  if (!searchResults.ok) {
    throw new Error(`Search results error: ${searchResults.statusText}`);
  }

  return searchResults.json();
};

export default function SearchResults(props: SearchTerm) {
  const [cursor, setCursor] = useState(props.cursor || '');
  const [sortField, setSortField] = useState<SortFields>('STR');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<Drug[] | undefined>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);

  useEffect(() => {
    setSearchLoading(true);

    fetchSearchResults(props.searchTerm, cursor, sortField, sortDirection)
      .then((data) => {
        setSearchResults(data?.searchResults);
        setTotalCount(data?.totalResults);
      })
      .catch((error) => {
        setSearchError(error.message);
      })
      .finally(() => {
        setSearchLoading(false);
      });
  }, [props.searchTerm, cursor, sortField, sortDirection]);

  return (
    <div>
      {searchError && <ErrorMessage searchError={searchError} />}
      {!searchError && (
        <SearchResultsList
          searchResults={searchResults}
          totalCount={totalCount}
          loading={searchLoading}
          sortField={sortField}
          sortDirection={sortDirection}
          setCursor={setCursor}
          setSortField={setSortField}
          setSortDirection={setSortDirection}
        />
      )}
    </div>
  );
}
