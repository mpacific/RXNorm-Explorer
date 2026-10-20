import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchResultsList from './searchResultsList';
import { SearchResult } from '../types/searchResult';
import { SortFields } from '../types/sortFields';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// One page of results, named so they sort the way they're numbered
const resultsPage = (page: number, size = 50): SearchResult[] =>
  Array.from({ length: size }, (_, i) => {
    const n = page * 50 + i + 1;
    return {
      id: n,
      RXCUI: String(1000 + n),
      TTY: 'SCD',
      STR: `drug ${String(n).padStart(3, '0')}`,
    };
  });

describe('SearchResultsList', () => {
  const setCursor = vi.fn();
  const changeSort = vi.fn();

  beforeEach(() => {
    push.mockReset();
    setCursor.mockReset();
    changeSort.mockReset();
  });

  const props = (
    overrides: Partial<Parameters<typeof SearchResultsList>[0]> = {}
  ) => ({
    searchResults: resultsPage(0),
    totalCount: 120,
    loading: false,
    sortField: 'STR' as SortFields,
    sortDirection: 'asc',
    setCursor,
    changeSort,
    ...overrides,
  });

  const nextPage = () => screen.getByRole('button', { name: /next page/i });
  const previousPage = () =>
    screen.getByRole('button', { name: /previous page/i });
  const header = (name: string) =>
    screen.getByRole('columnheader', { name: new RegExp(name) });
  const dataRows = () => screen.getAllByRole('row').slice(1); // minus the header

  it('shows a row per result with its name, RXCUI and TTY', () => {
    render(<SearchResultsList {...props()} />);

    expect(dataRows()).toHaveLength(50);
    const first = within(dataRows()[0]);
    expect(first.getByText('drug 001')).toBeInTheDocument();
    expect(first.getByText('1001')).toBeInTheDocument();
    expect(first.getByText('SCD')).toBeInTheDocument();
  });

  it('shows the total from the server, not the rows it has', () => {
    render(<SearchResultsList {...props()} />);

    expect(screen.getByText(/1–50 of 120/)).toBeInTheDocument();
  });

  it('treats a missing total as no results', () => {
    render(
      <SearchResultsList
        {...props({ totalCount: undefined, searchResults: [] })}
      />
    );

    expect(screen.getByText(/0–0 of 0/)).toBeInTheDocument();
    expect(screen.getByText('No rows')).toBeInTheDocument();
  });

  it('shows nothing yet when results have not arrived', () => {
    render(
      <SearchResultsList
        {...props({ searchResults: undefined, loading: true })}
      />
    );

    expect(screen.queryAllByRole('row')).toHaveLength(1); // just the header
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('opens a drug when its row is clicked', async () => {
    render(<SearchResultsList {...props()} />);

    await userEvent.click(screen.getByText('drug 002'));

    expect(push).toHaveBeenCalledWith('/drug/2');
  });

  describe('paging', () => {
    it('pages forward from the last row on the page', async () => {
      render(<SearchResultsList {...props()} />);

      await userEvent.click(nextPage());

      expect(setCursor).toHaveBeenCalledWith({ value: 'drug 050', id: 50 });
    });

    it.each([
      ['RXCUI', '1050'],
      ['TTY', 'SCD'],
    ] as const)(
      'uses the %s of the last row when sorted by it',
      async (sortField, value) => {
        render(<SearchResultsList {...props({ sortField })} />);

        await userEvent.click(nextPage());

        expect(setCursor).toHaveBeenCalledWith({ value, id: 50 });
      }
    );

    it('goes back to the cursor each earlier page was reached with', async () => {
      const { rerender } = render(<SearchResultsList {...props()} />);

      await userEvent.click(nextPage()); // to page 2
      rerender(
        <SearchResultsList {...props({ searchResults: resultsPage(1) })} />
      );
      await userEvent.click(nextPage()); // to page 3
      rerender(
        <SearchResultsList {...props({ searchResults: resultsPage(2, 20) })} />
      );
      expect(setCursor).toHaveBeenLastCalledWith({
        value: 'drug 100',
        id: 100,
      });
      expect(screen.getByText(/101–120 of 120/)).toBeInTheDocument();

      await userEvent.click(previousPage()); // back to page 2
      expect(setCursor).toHaveBeenLastCalledWith({ value: 'drug 050', id: 50 });

      await userEvent.click(previousPage()); // back to page 1
      expect(setCursor).toHaveBeenLastCalledWith(null);
    });

    it('stays put when there is no row to page forward from', async () => {
      // A total that says there's more, but the page came back empty
      render(<SearchResultsList {...props({ searchResults: [] })} />);

      await userEvent.click(nextPage());

      expect(setCursor).not.toHaveBeenCalled();
      expect(screen.getByText(/1–50 of 120/)).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('starts sorted by name, ascending', () => {
      render(<SearchResultsList {...props()} />);

      expect(header('Drug Name')).toHaveAttribute('aria-sort', 'ascending');
    });

    it('asks for a new sort when a column header is clicked', async () => {
      render(<SearchResultsList {...props()} />);

      await userEvent.click(header('RXCUI'));

      expect(changeSort).toHaveBeenCalledWith('RXCUI', 'asc');
      expect(header('RXCUI')).toHaveAttribute('aria-sort', 'ascending');
    });

    it('flips the direction when the sorted column is clicked again', async () => {
      render(<SearchResultsList {...props()} />);

      await userEvent.click(header('Drug Name'));

      expect(changeSort).toHaveBeenCalledWith('STR', 'desc');
      expect(header('Drug Name')).toHaveAttribute('aria-sort', 'descending');
    });

    it('flips back rather than going unsorted on a third click', async () => {
      const { rerender } = render(<SearchResultsList {...props()} />);

      await userEvent.click(header('Drug Name')); // asc -> desc
      rerender(<SearchResultsList {...props({ sortDirection: 'desc' })} />);
      await userEvent.click(header('Drug Name')); // desc -> (none) -> asc

      expect(changeSort).toHaveBeenLastCalledWith('STR', 'asc');
      expect(header('Drug Name')).toHaveAttribute('aria-sort', 'ascending');
    });

    it('flips from what the parent last asked for if the grid runs ahead of it', async () => {
      // Two quick clicks before the parent passes the new direction back
      // down: the grid has gone asc -> desc -> unsorted, but as far as the
      // parent knows the sort is still ascending.
      render(<SearchResultsList {...props()} />);

      await userEvent.click(header('Drug Name'));
      await userEvent.click(header('Drug Name'));

      expect(changeSort).toHaveBeenLastCalledWith('STR', 'desc');
      expect(header('Drug Name')).toHaveAttribute('aria-sort', 'descending');
    });

    it('goes back to the first page and forgets old cursors', async () => {
      const { rerender } = render(<SearchResultsList {...props()} />);

      await userEvent.click(nextPage());
      rerender(
        <SearchResultsList {...props({ searchResults: resultsPage(1) })} />
      );
      await userEvent.click(header('TTY'));

      expect(screen.getByText(/1–50 of 120/)).toBeInTheDocument();

      // Paging forward again starts from the newly sorted first page
      rerender(
        <SearchResultsList
          {...props({ sortField: 'TTY', searchResults: resultsPage(0) })}
        />
      );
      setCursor.mockReset();
      await userEvent.click(nextPage());
      expect(setCursor).toHaveBeenCalledWith({ value: 'SCD', id: 50 });
    });
  });
});
