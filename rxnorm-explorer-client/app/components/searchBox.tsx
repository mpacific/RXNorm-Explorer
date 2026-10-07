import { TextField } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function SearchBox(props: { searchTerm: string }) {
  const router = useRouter();

  return (
    <div
      style={{
        paddingBottom: '2em',
      }}
    >
      <TextField
        fullWidth
        id="searchBox"
        label="Search by drug name, RXCUI, or NDC"
        helperText="Hit enter to submit search"
        variant="standard"
        defaultValue={props.searchTerm}
        onKeyUp={(e: React.KeyboardEvent<HTMLDivElement>) => {
          const target = e.target as HTMLInputElement;
          if (e.key === 'Enter') {
            // Built from scratch rather than copied from the current URL: a new
            // search carries nothing over, and reading useSearchParams() here
            // would stop every page with a search box from being prerendered.
            const params = new URLSearchParams({ search: target.value || '' });
            router.push(`/search?${params.toString()}`, { scroll: false });
          }
        }}
      />
    </div>
  );
}
