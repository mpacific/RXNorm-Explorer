import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import LoadingSearchResults from './loadingSearchResults';
import SearchError from './searchError';
import NoSearchResults from './noSearchResults';
import SearchResultsList from './searchResultsList';

const searchString = gql`
  query searchRXNCONSO($searchTerm: String!, $page: Int!) {
    searchRXNCONSO(searchTerm: $searchTerm, page: $page) {
      id
      RXCUI
      TTY
      STR
    }
  }
`;

export default function SearchResults(props: {
  searchTerm: string;
  page: number;
}) {
  const { loading, error, data } = useQuery<{
    searchRXNCONSO: {
      id: number;
      RXCUI: string;
      TTY: string;
      STR: string;
    }[];
  }>(searchString, {
    variables: {
      searchTerm: props.searchTerm,
      page: props.page || 1,
    },
  });

  const searchParams: URLSearchParams = useSearchParams();

  const [searchLoading, searchError, searchResults] = useMemo(() => {
    const params: {
      set: (key: string, value: string) => void;
    } = new URLSearchParams(searchParams.toString());

    let searchLoading: boolean = false;
    let searchError: string = '';
    let searchResults: {
      id: number;
      RXCUI: string;
      TTY: string;
      STR: string;
    }[] = [];

    if (loading) {
      searchLoading = true;
    }

    if (error) {
      searchError = error.message;
    }

    if (props.searchTerm && data?.searchRXNCONSO?.length) {
      searchResults = data?.searchRXNCONSO;

      params.set('search', props.searchTerm);
    }

    return [searchLoading, searchError, searchResults];
  }, [loading, error, data, props.searchTerm]);

  return (
    <div>
      {searchLoading && <LoadingSearchResults />}
      {searchError && <SearchError searchError={searchError} />}
      {!data?.searchRXNCONSO?.length && !searchLoading && !searchError && (
        <NoSearchResults />
      )}
      {data?.searchRXNCONSO?.length && !searchLoading && !searchError && (
        <SearchResultsList searchResults={searchResults} />
      )}
    </div>
  );
}
