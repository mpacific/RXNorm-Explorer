import { Typography } from '@mui/material';

// role="alert" so screen readers announce the failure as soon as it appears
export default function ErrorMessage(props: { searchError: string }) {
  return (
    <Typography role="alert">
      <strong>Error: </strong> {props.searchError}
    </Typography>
  );
}
