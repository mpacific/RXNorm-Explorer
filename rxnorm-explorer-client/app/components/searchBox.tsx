'use client';
import { Button, Stack, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function SearchBox(props: { searchTerm: string }) {
  const router = useRouter();

  // A real form rather than an Enter key handler: it's announced as a search
  // landmark, works from the button, and browsers don't submit it on the
  // Enter that confirms an IME (e.g. CJK) composition.
  const search = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const term = new FormData(e.currentTarget).get('search');
    // Built from scratch rather than copied from the current URL: a new
    // search carries nothing over, and reading useSearchParams() here would
    // stop every page with a search box from being prerendered.
    const params = new URLSearchParams({ search: String(term ?? '') });
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  return (
    <form
      role="search"
      onSubmit={search}
      style={{
        paddingBottom: '2em',
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          id="searchBox"
          name="search"
          label="Search by drug name, RXCUI, or NDC"
          helperText="Press Enter or select Search. One-letter words are ignored."
          variant="standard"
          defaultValue={props.searchTerm}
        />
        <Button type="submit" variant="contained" sx={{ mt: 1.5 }}>
          Search
        </Button>
      </Stack>
    </form>
  );
}
