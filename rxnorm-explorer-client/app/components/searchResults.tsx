import { useEffect, useState } from 'react';
import ErrorMessage from './error';
import SearchResultsList from './searchResultsList';
import { SearchResult } from '../types/searchResult';
import { SortFields } from '../types/sortFields';
import { Cursor } from '../types/cursor';

const fetchSearchResults = async (
  searchTerm: string,
  cursor: Cursor | null,
  sortField: string,
  sortDirection: string
): Promise<{
  searchResults: SearchResult[];
  totalResults?: number;
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

type SearchResponse = {
  request: string;
  searchResults?: SearchResult[];
  error?: string;
};

export default function SearchResults(props: { searchTerm: string }) {
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [sortField, setSortField] = useState<SortFields>('STR');
  const [sortDirection, setSortDirection] = useState('asc');
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);

  // Identifies what the current state is asking for, so each response can be
  // matched to the request it answers.
  const request = JSON.stringify([
    props.searchTerm,
    cursor,
    sortField,
    sortDirection,
  ]);

  // A cursor is only meaningful for the sort it was taken under, so changing
  // the sort has to send us back to the first page.
  const changeSort = (newSortField: SortFields, newSortDirection: string) => {
    setSortField(newSortField);
    setSortDirection(newSortDirection);
    setCursor(null);
  };

  useEffect(() => {
    // Paging quickly can leave an older request still in flight, and it must
    // not overwrite the newer page when it lands.
    let ignore = false;

    fetchSearchResults(props.searchTerm, cursor, sortField, sortDirection)
      .then((data) => {
        if (ignore) {
          return;
        }

        // The server only counts on the first page, so later pages leave the
        // total from that page in place.
        if (data?.totalResults !== undefined) {
          setTotalCount(data.totalResults);
        }
        setResponse({ request, searchResults: data?.searchResults });
      })
      .catch((error) => {
        if (!ignore) {
          setResponse({ request, error: error.message });
        }
      });

    return () => {
      ignore = true;
    };
  }, [request, props.searchTerm, cursor, sortField, sortDirection]);

  // Loading until the latest response is for the current request. Derived
  // rather than set when the request starts; the grid keeps showing the
  // previous page's rows under its loading overlay meanwhile.
  const loading = response?.request !== request;

  return (
    <div>
      {response?.error && <ErrorMessage searchError={response.error} />}
      {!response?.error && (
        <SearchResultsList
          searchResults={response?.searchResults}
          totalCount={totalCount}
          loading={loading}
          sortField={sortField}
          sortDirection={sortDirection}
          setCursor={setCursor}
          changeSort={changeSort}
        />
      )}
    </div>
  );
}
