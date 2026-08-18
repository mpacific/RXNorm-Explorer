import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ErrorMessage from './error';
import SearchResultsList from './searchResultsList';
import { Drug } from '../../../types/drug';

const searchString = gql`
  query searchRXNCONSO($searchTerm: String!, $cursor: Int) {
    searchRXNCONSO(searchTerm: $searchTerm, cursor: $cursor) {
      rows {
        id
        RXCUI
        TTY
        STR
      }
      totalCount
    }
  }
`;

export default function SearchResults(props: {
  searchTerm: string;
  cursor: number;
}) {
  const [cursor, setCursor] = useState(props.cursor || 0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: number; RXCUI: string; TTY: string; STR: string }[]
  >([]);
  const [totalCount, setTotalCount] = useState(0);

  const { loading, error, data } = useQuery<{
    searchRXNCONSO: {
      rows: Drug[];
      totalCount: number;
    };
  }>(searchString, {
    variables: {
      searchTerm: props.searchTerm,
      cursor: cursor || 0,
    },
  });

  const searchParams: URLSearchParams = useSearchParams();

  useEffect(() => {
    const params: {
      set: (key: string, value: string) => void;
    } = new URLSearchParams(searchParams.toString());

    if (loading) {
      setSearchLoading(true);
    } else {
      setSearchLoading(false);
    }

    if (error) {
      setSearchError(error.message);
    } else {
      setSearchError('');
    }

    if (props.searchTerm) {
      setSearchResults(data?.searchRXNCONSO?.rows || []);
      setTotalCount(data?.searchRXNCONSO?.totalCount || 0);

      params.set('search', props.searchTerm);
    } else {
    }
  }, [loading, error, data, props.searchTerm]);

  return (
    <div>
      {searchError && <ErrorMessage searchError={searchError} />}
      {!searchError && (
        <SearchResultsList
          searchResults={searchResults}
          totalCount={totalCount}
          loading={searchLoading}
          setCursor={setCursor}
        />
      )}
    </div>
  );
}
