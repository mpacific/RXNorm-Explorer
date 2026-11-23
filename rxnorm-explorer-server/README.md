# rxnorm-explorer-server

The RxNorm Explorer API: a NestJS app that reads the RxNorm tables in MySQL. Setup, the monthly data refresh and how to run the tests are in the [main README](../README.md).

## Endpoints

| Route | Returns |
|---|---|
| `GET /search?searchTerm=…` | Up to 50 matches by name (every word, in any order), RXCUI or NDC. Optional `sortField` (`STR`, `RXCUI`, `TTY`), `sortDirection` (`asc`, `desc`), and `cursor`/`cursorId` from the last row of the previous page. `totalResults` is only sent with the first page. |
| `GET /drug/:rxaui` | One drug (atom) by RXAUI, with its NDCs and related drugs. |
| `GET /health` | `{ "status": "ok" }` while the database answers, otherwise a 503. Not throttled. |

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Start in watch mode |
| `npm run build` / `npm run start:prod` | Build to `dist/` and run it |
| `npm test` / `npm run test:e2e` | Unit tests / end-to-end tests against the database in `.env` |
| `npm run migration:run` / `migration:revert` | Apply or undo migrations, as `MIGRATION_DATABASE_USER` when set |

Configuration is validated at startup (`src/config/env.validation.ts`); see `.env.example` for every variable.
