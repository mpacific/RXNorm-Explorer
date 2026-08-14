'use client';
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Box, Container, Typography } from "@mui/material"
import { useMemo } from "react";
import SearchBox from "../components/searchBox";
import { useSearchParams } from "next/navigation";

const searchString = gql`
  query searchRXNCONSO($searchTerm: String!, $page: Int!) {
    searchRXNCONSO(searchTerm: $searchTerm, page: $page) {
      id,
      RXCUI,
      TTY,
      STR
    }
  }
`

const NoSearchTermMessage = () => {
  return (
    <Box><Typography>No search term provided</Typography></Box>
  )
}

const LoadingSearchResults = () => {
  return (
    <Typography>Loading...</Typography>
  )
}

const NoSearchResults = () => {
    return (
      <Box><Typography>No search results found.</Typography></Box>
    )
}

const SearchError = (props: {
  searchError: string
}) => {
  return (
    <Typography><strong>Error while trying to fetch search results: </strong> {props.searchError}</Typography>
  )
}

const SearchResults = (props: {
  searchTerm: string,
  page: number
}) => {
  const { loading, error, data } = useQuery<{
    searchRXNCONSO: {
      id: number,
      RXCUI: string,
      TTY: string,
      STR: string
    }[]
  }>(searchString, {
    variables: {
      searchTerm: props.searchTerm,
      page: props.page || 1
    }
  })

  const searchParams: URLSearchParams = useSearchParams()
  const params: {
    set: (key: string, value: string) => void
  } = new URLSearchParams(searchParams.toString())

  const [searchLoading, searchError, searchResults] = useMemo(() => {
    let searchLoading: boolean = false
    let searchError: string = ""
    let searchResults: {
      id: number,
      RXCUI: string,
      TTY: string,
      STR: string
    }[] = []

    if (loading) {
      searchLoading = true
    }

    if (error) {
      searchError = error.message
    }

    if (props.searchTerm && data?.searchRXNCONSO?.length) {
      searchResults = data?.searchRXNCONSO

      params.set('search', props.searchTerm)
    }

    return [searchLoading, searchError, searchResults]
  }, [loading, error, data, props.searchTerm]);

  return (
    <div>
      {searchLoading && 
        <LoadingSearchResults />
      }
      {searchError && 
        <SearchError searchError={searchError} />
      }
      {!data?.searchRXNCONSO?.length && !searchLoading && !searchError && <NoSearchResults />}
    </div>
  )
}

export default function Search(props: {
  searchTerm: string,
  page: number
}) {
  const searchParams: URLSearchParams = useSearchParams()
  const params: {
    search?: string,
    get: (key: string) => string | null
  } = new URLSearchParams(searchParams.toString())
  const urlSearchTerm: string | null = params.get('search')
  
  const [pageSearchTerm, doSearch] = useMemo(() => {
    if (urlSearchTerm) {
      return [urlSearchTerm, true]
    }

    return [props.searchTerm, false]
  }, [urlSearchTerm])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Search Results</Typography>
      <SearchBox searchTerm={pageSearchTerm} />
      {pageSearchTerm && doSearch && 
        <SearchResults searchTerm={pageSearchTerm} page={props.page} />
      }
      {!pageSearchTerm && 
        <NoSearchTermMessage />
      }
    </Container>
  )
}