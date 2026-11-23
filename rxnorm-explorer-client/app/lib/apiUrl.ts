// Builds a URL on the API from NEXT_PUBLIC_API_URL, with or without a trailing
// slash on it -- 'http://host/' + '/drug/1' would otherwise give '//drug/1',
// which Express doesn't route.
export const apiUrl = (path: string, params?: URLSearchParams): string => {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  const query = params?.toString();
  return `${base}/${path.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
};
