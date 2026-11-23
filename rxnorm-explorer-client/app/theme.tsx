'use client';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// MUI asks for the "Roboto" family by name; next/font self-hosts it under a
// generated name exposed as --font-roboto (see layout.tsx), so the theme
// points typography at that variable instead.
const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-roboto), "Helvetica", "Arial", sans-serif',
  },
});

export default function AppThemeProvider(props: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{props.children}</ThemeProvider>;
}
