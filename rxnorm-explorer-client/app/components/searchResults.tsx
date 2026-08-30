import { useEffect, useState } from 'react';
import ErrorMessage from './error';
import SearchResultsList from './searchResultsList';
import { Drug } from '@/types/drug';
import { SortFields } from '../types/sortFields';
import { Cursor } from '../types/cursor';

const fetchSearchResults = async (
  searchTerm: string,
  cursor: Cursor | null,
  sortField: string,
  sortDirection: string
): Promise<{
  searchResults: Drug[];
  totalResults: number;
} | null> => {
  // Cursor values are drug names, so they have to be encoded rather than
  // interpolated straight into the query string.
  const params = new URLSearchParams({
    searchTerm,
    sortField,
    sortDirection,
  });

  if (cursor) {
    params.set('cursor', cursor.value);
    params.set('cursorId', String(cursor.id));
  }

  const searchResults = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/search?${params.toString()}`
  );

  if (!searchResults.ok) {
    throw new Error(`Search results error: ${searchResults.statusText}`);
  }

  return searchResults.json();
};

export default function SearchResults(props: { searchTerm: string }) {
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [sortField, setSortField] = useState<SortFields>('STR');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<Drug[] | undefined>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);

  // A cursor is only meaningful for the sort it was taken under, so changing
  // the sort has to send us back to the first page.
  const changeSort = (newSortField: SortFields, newSortDirection: string) => {
    setSortField(newSortField);
    setSortDirection(newSortDirection);
    setCursor(null);
  };

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
          changeSort={changeSort}
        />
      )}
    </div>
  );
}
