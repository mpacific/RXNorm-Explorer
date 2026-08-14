'use client';
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import { Box, Container, TextField, Typography } from "@mui/material"
import React, { useMemo, useState } from "react";

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
    <Container maxWidth="xl">
      <Box><Typography>No search term provided</Typography></Box>
    </Container>
  )
}

const LoadingSearchResults = () => {
  return (
    <Container>
      <Typography>Loading...</Typography>
    </Container>
  )
}

const NoSearchResults = () => {
    return (
      <Container maxWidth="xl">
        <Box><Typography>No search results found.</Typography></Box>
      </Container>
    )
}

const SearchError = (props: {
  searchError: string
}) => {
  return (
    <Container>
      <Typography><strong>Error while trying to fetch search results: </strong> {props.searchError}</Typography>
    </Container>
  )
}

const SearchResults = (props: {
  searchTerm: string,
  page: number
}) => {
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<{ 
    id: number,
    RXCUI: string,
    TTY: string,
    STR: string; 
  }[]>([]);

  let { loading, error, data } = useQuery<{
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

  useMemo(() => {
    if (loading) {
      setSearchLoading(true)
    } else {
      setSearchLoading(false)
    }

    if (error) {
      setSearchError(error.message)
    } else {
      setSearchError("")
    }

    if (props.searchTerm && data?.searchRXNCONSO?.length) {
      setSearchResults(data?.searchRXNCONSO)
      console.log(data?.searchRXNCONSO)
    } else {
      setSearchResults([])
    }
  }, [loading, error, data]);

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

const SearchBox = (props: {
  searchTerm: string,
  setPageSearchTerm: (value: string) => void,
  setDoSearch: (doSearch: boolean) => void
}) => {
  return (
    <Container style={{
      paddingBottom: "2em"
    }}>
      <Typography variant="h4" gutterBottom>Search</Typography>
      <TextField fullWidth id="searchBox" label="Search by drug name or RXCUI" helperText="Hit enter to submit search" variant="standard" defaultValue={props.searchTerm} onKeyUp={(e: React.KeyboardEvent<HTMLDivElement>) => { 
        const target = e.target as HTMLInputElement
        props.setPageSearchTerm(target.value || "") 
        props.setDoSearch(e.key === "Enter")
      }} />
    </Container>
  )
}

export default function Search(props: {
  searchTerm: string,
  page: number
}) {
  const [pageSearchTerm, setPageSearchTerm] = useState(props.searchTerm);
  const [doSearch, setDoSearch] = useState(false)

  return (
    <div>
      <SearchBox searchTerm={pageSearchTerm} setPageSearchTerm={setPageSearchTerm} setDoSearch={setDoSearch} />
      {pageSearchTerm && doSearch && 
        <SearchResults searchTerm={pageSearchTerm} page={props.page} />
      }
      {!pageSearchTerm && 
        <NoSearchTermMessage />
      }
    </div>
  )
}