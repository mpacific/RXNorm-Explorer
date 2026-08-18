import { Typography } from '@mui/material';

export default function ErrorMessage(props: { searchError: string }) {
  return (
    <Typography>
      <strong>Error: </strong> {props.searchError}
    </Typography>
  );
}
