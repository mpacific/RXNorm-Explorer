import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Search from './page';
import { jsonResponse, requestedUrl, stubFetch } from '@/test-utils/fetch';

let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn() }),
}));

const searchBox = () =>
  screen.getByRole('textbox', { name: 'Search by drug name, RXCUI, or NDC' });

describe('Search page', () => {
  let fetch: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    searchParams = new URLSearchParams();
    fetch = stubFetch();
    fetch.mockImplementation(async () =>
      jsonResponse({
        totalResults: 1,
        searchResults: [
          { id: 1, RXCUI: '161', TTY: 'IN', STR: 'acetaminophen' },
        ],
      })
    );
  });

  it('searches for the term in the URL and shows the results', async () => {
    searchParams = new URLSearchParams({ search: 'acetaminophen' });

    render(<Search />);

    expect(
      screen.getByRole('heading', { name: 'Search Results' })
    ).toBeInTheDocument();
    expect(searchBox()).toHaveValue('acetaminophen');
    expect(await screen.findByText('acetaminophen')).toBeInTheDocument();
    expect(requestedUrl(fetch).searchParams.get('searchTerm')).toBe(
      'acetaminophen'
    );
  });

  it('asks for a term instead of searching when there is none', () => {
    render(<Search />);

    expect(screen.getByText('No search term provided')).toBeInTheDocument();
    expect(searchBox()).toHaveValue('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('treats an empty term as no term', () => {
    searchParams = new URLSearchParams({ search: '' });

    render(<Search />);

    expect(screen.getByText('No search term provided')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('starts a new search from its first page when the term changes', async () => {
    searchParams = new URLSearchParams({ search: 'acetaminophen' });
    const { rerender } = render(<Search />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    searchParams = new URLSearchParams({ search: 'ibuprofen' });
    rerender(<Search />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(Object.fromEntries(requestedUrl(fetch, 1).searchParams)).toEqual({
      searchTerm: 'ibuprofen',
      sortField: 'STR',
      sortDirection: 'asc',
    });
  });
});
