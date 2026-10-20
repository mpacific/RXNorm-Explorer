import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchResults from './searchResults';
import type SearchResultsList from './searchResultsList';
import { SearchResult } from '../types/searchResult';
import {
  deferredResponse,
  jsonResponse,
  requestedUrl,
  stubFetch,
} from '@/test-utils/fetch';

// The list is stood in for so these tests can see exactly what it's given
// and drive paging and sorting through the callbacks it receives.
type ListProps = Parameters<typeof SearchResultsList>[0];
const listRenders: ListProps[] = [];
vi.mock('./searchResultsList', () => ({
  default: (props: ListProps) => {
    listRenders.push(props);
    return <div data-testid="results-list" />;
  },
}));

const lastListProps = () => listRenders[listRenders.length - 1];

const row = (id: number, STR = `drug ${id}`): SearchResult => ({
  id,
  RXCUI: String(1000 + id),
  TTY: 'SCD',
  STR,
});

describe('SearchResults', () => {
  let fetch: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    listRenders.length = 0;
    fetch = stubFetch();
  });

  it('asks for the first page, sorted by name ascending', async () => {
    fetch.mockImplementation(async () =>
      jsonResponse({ totalResults: 0, searchResults: [] })
    );

    render(<SearchResults searchTerm="acetaminophen" />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const url = requestedUrl(fetch);
    expect(url.origin + url.pathname).toBe('http://api.test/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      searchTerm: 'acetaminophen',
      sortField: 'STR',
      sortDirection: 'asc',
    });
  });

  it('shows the list as loading until the results arrive', async () => {
    const response = deferredResponse();
    fetch.mockReturnValue(response.promise);

    render(<SearchResults searchTerm="acetaminophen" />);

    expect(lastListProps()).toMatchObject({
      loading: true,
      searchResults: undefined,
      totalCount: 0,
      sortField: 'STR',
      sortDirection: 'asc',
    });

    await act(async () => {
      response.respond({ totalResults: 2, searchResults: [row(1), row(2)] });
    });

    expect(lastListProps()).toMatchObject({
      loading: false,
      searchResults: [row(1), row(2)],
      totalCount: 2,
    });
  });

  it('asks for the next page with the cursor it is given, encoded', async () => {
    fetch.mockImplementation(async () =>
      jsonResponse({ totalResults: 120, searchResults: [row(1)] })
    );
    render(<SearchResults searchTerm="a" />);
    await waitFor(() => expect(lastListProps().loading).toBe(false));

    fetch.mockImplementation(async () =>
      jsonResponse({ searchResults: [row(51)] })
    );
    act(() => lastListProps().setCursor({ value: 'a & b/c?', id: 50 }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(String(fetch.mock.calls[1][0])).toContain(
      'cursor=a+%26+b%2Fc%3F&cursorId=50'
    );
    expect(Object.fromEntries(requestedUrl(fetch, 1).searchParams)).toEqual({
      searchTerm: 'a',
      sortField: 'STR',
      sortDirection: 'asc',
      cursor: 'a & b/c?',
      cursorId: '50',
    });
  });

  it('keeps the first page total on later pages, which do not send one', async () => {
    fetch.mockImplementation(async () =>
      jsonResponse({ totalResults: 120, searchResults: [row(1)] })
    );
    render(<SearchResults searchTerm="a" />);
    await waitFor(() => expect(lastListProps().totalCount).toBe(120));

    fetch.mockImplementation(async () =>
      jsonResponse({ searchResults: [row(51)] })
    );
    act(() => lastListProps().setCursor({ value: 'drug 50', id: 50 }));

    await waitFor(() =>
      expect(lastListProps().searchResults).toEqual([row(51)])
    );
    expect(lastListProps().totalCount).toBe(120);
  });

  it('starts again from the first page when the sort changes', async () => {
    fetch.mockImplementation(async () =>
      jsonResponse({ totalResults: 120, searchResults: [row(1)] })
    );
    render(<SearchResults searchTerm="a" />);
    await waitFor(() => expect(lastListProps().loading).toBe(false));
    act(() => lastListProps().setCursor({ value: 'drug 50', id: 50 }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    act(() => lastListProps().changeSort('RXCUI', 'desc'));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(Object.fromEntries(requestedUrl(fetch, 2).searchParams)).toEqual({
      searchTerm: 'a',
      sortField: 'RXCUI',
      sortDirection: 'desc',
    });
    await waitFor(() =>
      expect(lastListProps()).toMatchObject({
        sortField: 'RXCUI',
        sortDirection: 'desc',
        loading: false,
      })
    );
  });

  it('ignores a response that arrives after a newer request was made', async () => {
    const firstPage = deferredResponse();
    const secondPage = deferredResponse();
    fetch
      .mockReturnValueOnce(firstPage.promise)
      .mockReturnValueOnce(secondPage.promise);

    render(<SearchResults searchTerm="a" />);
    act(() => lastListProps().setCursor({ value: 'drug 50', id: 50 }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    await act(async () => {
      secondPage.respond({ searchResults: [row(51)] });
    });
    await act(async () => {
      firstPage.respond({ totalResults: 999, searchResults: [row(1)] });
    });

    expect(lastListProps()).toMatchObject({
      searchResults: [row(51)],
      totalCount: 0, // the stale first page's total wasn't taken either
      loading: false,
    });
  });

  it('ignores a failure that arrives after a newer request was made', async () => {
    const firstPage = deferredResponse();
    fetch
      .mockReturnValueOnce(firstPage.promise)
      .mockImplementationOnce(async () =>
        jsonResponse({ searchResults: [row(51)] })
      );

    render(<SearchResults searchTerm="a" />);
    act(() => lastListProps().setCursor({ value: 'drug 50', id: 50 }));
    await waitFor(() => expect(lastListProps().loading).toBe(false));

    await act(async () => {
      firstPage.fail(new Error('network down'));
    });

    expect(screen.queryByText(/network down/)).not.toBeInTheDocument();
    expect(screen.getByTestId('results-list')).toBeInTheDocument();
  });

  it('shows an error instead of the list when the server says no', async () => {
    fetch.mockImplementation(
      async () => new Response('{}', { status: 400, statusText: 'Bad Request' })
    );

    render(<SearchResults searchTerm="a" />);

    expect(
      await screen.findByText(/Search results error: Bad Request/)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('results-list')).not.toBeInTheDocument();
  });

  it('shows an error when the server cannot be reached', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<SearchResults searchTerm="a" />);

    expect(await screen.findByText(/Failed to fetch/)).toBeInTheDocument();
  });

  it('copes with a response that has no body', async () => {
    fetch.mockImplementation(async () => jsonResponse(null));

    render(<SearchResults searchTerm="a" />);

    await waitFor(() => expect(lastListProps().loading).toBe(false));
    expect(lastListProps()).toMatchObject({
      searchResults: undefined,
      totalCount: 0,
    });
  });
});
