import { Typography } from '@mui/material';

// role="status" so screen readers announce it without moving focus
export default function LoadingMessage() {
  return <Typography role="status">Loading...</Typography>;
}
