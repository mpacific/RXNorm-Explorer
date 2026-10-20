import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('Home page', () => {
  it('welcomes the user and offers an empty search box', () => {
    render(<Home />);

    expect(screen.getByText(/Welcome to RxNorm Explorer/)).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', {
        name: 'Search by drug name, RXCUI, or NDC',
      })
    ).toHaveValue('');
  });
});
