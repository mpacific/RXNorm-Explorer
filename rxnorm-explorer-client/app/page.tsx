'use client';
import { Container, Typography } from '@mui/material';
import SearchBox from './components/searchBox';

export default function Home() {
  return (
    <Container>
      <Typography variant="h6" gutterBottom>
        Welcome to RxNorm Explorer. To begin, enter a search term below.
      </Typography>
      <SearchBox searchTerm="" />
    </Container>
  );
}
