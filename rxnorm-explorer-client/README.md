# rxnorm-explorer-client

The RxNorm Explorer web app: a Next.js (App Router) front end for the API in `../rxnorm-explorer-server`. Setup and testing are in the [main README](../README.md).

- `npm run dev`: start the development server
- `npm run build` / `npm start`: build and serve the production app
- `npm test`: component and page tests (Vitest)

`NEXT_PUBLIC_API_URL` (in `.env`) is the API's address. It is inlined at build time and also sets the CSP's `connect-src`, so rebuild after changing it.
