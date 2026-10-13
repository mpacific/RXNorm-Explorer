# Code Review: RxNorm Explorer

**Branch:** `nestjs` (at `dd9bf5b`) · **Date:** 2026-10-13 · **Scope:** the whole repo (`rxnorm-explorer-server`, `rxnorm-explorer-client`, docs and config)

## How this review was done

- Read all of the tracked source, config, migrations, tests and docs.
- Ran the tooling: server `jest`, `eslint` and `tsc`; client `eslint` and `tsc`; `npm audit --omit=dev` in both packages.
- Ran read-only queries against the local MySQL 26.7 database (246,041 `RXNCONSO`, 2,576,244 `RXNREL` and 3,361,610 `RXNSAT` rows). These were `EXPLAIN`s, timings and checks on grants and the schema. Nothing was written to the database.

Where a finding rests on a measurement, the measurement is quoted. Severity: **Critical / High / Medium / Low / Info**.

---

## Summary

The core of the app is in good shape. SQL is parameterized. The one value interpolated into SQL (`sortField`) is checked against an allow-list. LIKE wildcards are escaped. Keyset pagination uses a correct tie-breaker. The client handles out-of-order responses properly. The hot queries are fast on real data (see [What's done well](#whats-done-well)).

The main problems are around the code rather than in it:

1. **Dependencies have known vulnerabilities**, including a critical advisory against the installed Next.js (16.3.4).
2. **The API connects to MySQL as `root`**, and `local_infile` is still on globally.
3. **`npm run start:prod` is broken.** The build writes `dist/src/main.js`, but the script runs `dist/main`.
4. **4 of the 5 unit test suites fail**, and the only e2e test checks the scaffold's "Hello World".
5. **There is no request validation.** Malformed query strings cause 500s, and `/drug/127abc` returns drug 127.
6. **Drug URLs use a surrogate `id`** that the migration assigns. A reload of the RxNorm data will change or remove these ids.

---

## 1. Security

### S1 — High — Dependencies with known vulnerabilities (both packages)

`npm audit --omit=dev` output:

| Package | Installed | Severity | Notes |
|---|---|---|---|
| `next` (client) | 16.3.4 | **Critical** | Includes RCE in `next/og` `ImageResponse`, SSRF in Image Optimization, and SSG/ISR cache poisoning. This app does not use `next/og` or `next/image` today, so the exposure is lower than the rating suggests, but this is the framework and should be patched. |
| `sharp` (client, via next) | <0.35.5 | High | librsvg CVE |
| `source-map-js` (client) | ≤1.2.1 | High | Event-loop DoS |
| `proxy-addr` (server, via express) | ≤2.0.7 | **Critical** | IP spoofing via IPv4-mapped IPv6 trust subnets. This only matters when `trust proxy` is configured, which it isn't yet (see S5). |
| `multer` / `@nestjs/platform-express` (server) | ≤2.3.0 / ≤11.2.5 | High | Several DoS issues. There are no upload routes, but multer ships with the platform. |

**Fix:** run `npm audit fix` in both packages, re-run the build and tests, and commit the lockfiles. Add `npm audit --omit=dev --audit-level=high` to CI (see D2).

### S2 — High — The API connects to the database as `root`

`SHOW GRANTS` for the configured `DATABASE_USER` returns `GRANT ALL ... ON *.* TO root@% WITH GRANT OPTION`, plus every dynamic privilege. The API only ever reads. Any future bug in a query path (or a compromised dependency) would therefore run with full server control. That includes `FILE`, which together with `local_infile` can read files from the host.

The README (`README.md:17`) does say to create a separate user, but nothing enforces it, and the local `.env` doesn't follow it.

**Fix:** create two accounts.
- An app user with `GRANT SELECT ON rxnorm.* TO 'rxnorm_app'@'%'`, used by the API.
- A migration user with `SELECT, ALTER, INDEX, REFERENCES` on the same schema, used only by `npm run migration:*`. TypeORM's migration CLI could read it from separate env vars such as `MIGRATION_DATABASE_USER`.

### S3 — Medium — `local_infile` left enabled globally

`SELECT @@local_infile` returns `1`. The README (`README.md:18`) tells you to turn it on for the RRF import, but never to turn it off again. When it is on, a client can ask the server to load local files, which is a known data-exfiltration path for malicious or compromised clients.

**Fix:** add a step to the README to run `SET GLOBAL local_infile = 0;` after the import. Better still, pass `--local-infile=1` only on the import client and leave the server setting off.

### S4 — Medium — No input validation on request parameters

There is no global `ValidationPipe` and no DTOs. Controller parameter types are not enforced at runtime.

- `drug.controller.ts:19`: `@Param('id') id: number` is actually a string. MySQL coerces it, so `GET /drug/127abc` returns drug **127** (verified: `WHERE id = '127abc'` matches id 127). `GET /drug/abc` becomes `id = 0` and returns a 404 by luck.
- `search.controller.ts:12-16`: Express 5's query parser turns repeated keys into arrays.
  - `?searchTerm=a&searchTerm=b` → `searchTerm.trim is not a function` (`search.service.ts:36`) → **500**.
  - `?sortDirection=asc&sortDirection=desc` → `toUpperCase is not a function` (`search.service.ts:34`) → **500**.
  - A repeated `cursor` is expanded by the driver into a list (`STR > 'a', 'b'`), which is a SQL syntax error → **500**. This is not injection, because the values are still escaped, but it's an unhandled error path.
- There is no maximum length on `searchTerm`. Words are capped at 10, but each word can be any length.

**Fix:**
- Register `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` in `main.ts`.
- Add a `SearchQueryDto` (`@IsString() @Length(1, 200) searchTerm`, `@IsIn(['STR','RXCUI','TTY']) sortField`, `@IsIn(['asc','desc','ASC','DESC']) sortDirection`, `@IsOptional() @IsString() cursor`, `@IsOptional() @IsInt() cursorId`).
- Use `@Param('id', ParseIntPipe)` in the drug controller.

### S5 — Low — Rate limiting is per IP with no proxy awareness, and its config isn't validated

- `ThrottlerGuard` keys on `req.ip`. Behind a reverse proxy or load balancer, every user shares the proxy's IP, so one heavy user throttles everyone. If `trust proxy` is turned on later, configure it narrowly (and patch `proxy-addr`, see S1).
- `app.module.ts:21-22`: `Number(process.env.THROTTLE_MS!)` becomes `NaN` for a value like `"60s"`. `main.ts:15` only checks that the value is present, not that it's a number.
- Throttler state is in memory, so limits are per process.

**Fix:** validate the env (see Q4). Document the reverse-proxy setup when there is one, and use the Redis throttler storage if the API ever runs on more than one instance.

### S6 — Low — CORS sends `credentials: true` with no need for it

`main.ts:24-27`. The API uses no cookies or auth, so `Access-Control-Allow-Credentials` only widens what a whitelisted origin can do. **Fix:** remove `credentials: true`.

### S7 — Low — The client sets no security headers

`next.config.ts` has no `headers()`. **Fix:** add, at minimum:
- `Content-Security-Policy`, with `connect-src` limited to the API origin
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `frame-ancestors 'none'`

### S8 — Info — Things that were checked and are fine

- All SQL is parameterized through TypeORM. The only interpolated identifier, `field`, comes from the `SORT_FIELDS` allow-list (`search.service.ts:31-33`).
- LIKE metacharacters are escaped (`search.service.ts:65`).
- React escapes every value rendered from the API. There is no `dangerouslySetInnerHTML`.
- Helmet is enabled on the API, and `.env` files are git-ignored and not tracked.
- Error responses don't leak stack traces or SQL. Nest's default filter returns a generic 500.

---

## 2. Correctness and bugs

### C1 — High — `npm run start:prod` points at a file that doesn't exist

`package.json:15` runs `node dist/main`. Because `types/` lives outside `src/` and is compiled too, `tsc` raises the root to the project directory and writes **`dist/src/main.js`** (verified: `dist/` contains only `src/`, `types/` and the tsbuildinfo files). The production start command therefore fails with `Cannot find module`.

**Fix:** pick one.
- (a) Move `types/` to `src/types/`. The client imports these files, so update its paths too (see Q2).
- (b) Change the script to `node dist/src/main` and set `"entryFile": "src/main"` in `nest-cli.json`.

Option (a) is cleaner.

### C2 — Medium — A migration's `down()` has invalid SQL, so revert fails

`src/db/migrations/1789068330590-add-indexes-to-tables.ts:38-47` uses `DROP INDEX ON RXNCONSO RXNCONSO_RXCUI_idx`. MySQL's syntax is `DROP INDEX <name> ON <table>`, which `1790709373981-drop-unused-str-indexes.ts:7` already uses correctly. `npm run migration:revert` past this migration will throw a parse error.

There is a second problem. MySQL DDL commits implicitly, so `migrationsTransactionMode: 'all'` (`datasource.ts:20`) can't roll back a migration that fails partway. A failure leaves the migration half-applied and still unrecorded. Keep each migration small, or make the steps idempotent.

### C3 — Medium — Drug URLs depend on surrogate ids that won't survive a data reload

`/drug/:id` uses `RXNCONSO.id`, an `AUTO_INCREMENT` column added by migration `1788891213859`. RxNorm ships monthly. The NLM load scripts drop and recreate the tables, which has two effects:

1. The `migrations` table still says every migration has run, so **none of them re-run**. The `id` columns, indexes and FK disappear, and the app breaks.
2. If the migrations are re-run by hand, the ids are assigned again, so bookmarked or shared `/drug/127` links silently point to a different drug.

**Fix:**
- Use `RXAUI` as the public identifier in URLs and the API. It is the stable RxNorm atom id, it already has a unique index, and `id` can stay internal.
- Document a reload procedure in the README, for example: load into a fresh schema, run the migrations, then swap. Or turn the post-load steps into an idempotent script that isn't tied to the `migrations` table.

### C4 — Medium — Most tests fail, and the rest only test the scaffold

`npx jest`: **4 failed, 1 passed**. `SearchController`, `SearchService`, `DrugController` and `DrugService` each fail with `Nest can't resolve dependencies…` because their specs don't provide the service or the repository mocks. The one that passes tests `AppController`'s "Hello World". `test/app.e2e-spec.ts` boots the real `AppModule`, so it needs a live database, and it also only asserts "Hello World".

**Fix:**
1. Provide mocks (`{ provide: getRepositoryToken(RXNCONSO), useValue: … }`) so the specs compile.
2. The logic most worth unit testing is in `SearchService`: the sort-field allow-list fallback, direction normalization, word capping and LIKE escaping, keyset cursor building in both directions, and `totalResults` being present only on the first page.
3. Add e2e tests against a small fixture database, for example via Testcontainers or a seeded Docker MySQL. Cover paging (no skipped or duplicated rows across a run of equal `STR` values), NDC and RXCUI lookups, a 404 on an unknown drug, and 400s on bad input once S4 is done.

### C5 — Low — NDCs are formatted twice and end up with double spaces

The server joins NDCs with `', '` (`drug.service.ts:50`). The client splits on `','` and joins with `', '` again (`drugDetail.tsx:64,109`), which gives `"a,  b"`. **Fix:** return `NDCs: string[]` from the API and join once in the client.

### C6 — Low — The search box goes stale on back/forward

`searchBox.tsx:19` uses an uncontrolled `defaultValue`. On `/search`, if you search "a", then "b", then press Back, the URL and results show "a" but the text box still says "b". **Fix:** render `<SearchBox key={searchTerm} … />` in `search/page.tsx:31`.

### C7 — Low — The README's example API URL breaks requests

`README.md:33` gives `http://localhost:6109/` (with a trailing slash). The client builds `${NEXT_PUBLIC_API_URL}/drug/…` (`drug/[slug]/page.tsx:11`, `searchResults.tsx:31`), which produces `//drug/…`. Express doesn't collapse the double slash, so the request won't match the route. **Fix:** remove the trailing slash in the README, and/or build URLs with `new URL('drug/' + id, base)`.

### C8 — Low — SQL string literals use double quotes

`drug.service.ts:45` (`ATN = "NDC"`) and `:61` (the `RELA NOT IN ("…")` list) use double-quoted literals. These work under the current `sql_mode`. They would turn into identifiers, and break the query, if `ANSI_QUOTES` were ever enabled. **Fix:** use single quotes, or better, bind them as parameters, as `search.service.ts` already does.

### C9 — Low — Entity metadata no longer matches the real schema

- `RXNCONSO.entity.ts:59-61` still has `@Index()` on `STR`, which migration `1790709373981` dropped.
- The decorator indexes would be generated with TypeORM's hashed names, not the `RXNCONSO_*_idx` names that the migrations create.
- No column sets a `length`. The entities imply `varchar(255)`, but the real columns are `STR varchar(3000)`, `ATV varchar(4000)` and `ATN varchar(1000)`.

`synchronize` is off, so nothing breaks today. But `typeorm migration:generate` would produce a destructive diff that tries to shrink columns and recreate indexes. **Fix:** make the entities match the DB (lengths, `@Index('RXNCONSO_RXCUI_idx')` names, remove the `STR` index), or add a comment saying the entities are read-only mappings and must never be used to generate migrations.

### C10 — Low — The FK migration skips validating existing data

`1790698212730-add-relations-to-tables.ts:5-9` turns off `FOREIGN_KEY_CHECKS` around `ADD CONSTRAINT`, so existing orphan rows aren't checked. If the statement fails, checks stay off on that pooled connection. `ON DELETE SET NULL ON UPDATE CASCADE` also has little purpose on read-only reference data. **Fix:** check for orphans first (`SELECT COUNT(*) FROM RXNSAT s LEFT JOIN RXNCONSO c USING (RXAUI) WHERE c.id IS NULL`) and add the FK with checks on. Or drop the FK, since nothing relies on it at runtime.

### C11 — Low — Bootstrap errors are unhandled

`main.ts:30` calls `bootstrap()` as a floating promise (this is the only ESLint warning). On top of that, `main.ts:9-19` throws `HttpException`s, which are meant for HTTP responses, during startup. **Fix:** use `bootstrap().catch((e) => { console.error(e); process.exit(1); })`, throw plain `Error`s, or better, move the checks into config validation (Q4).

### C12 — Info — Product behaviors to confirm are intended

- **One concept can appear several times in search results.** A concept's SCD/SBD atom and its PSN (prescribable name) atom both show up. For "acetaminophen 500", 137 rows cover 92 distinct RXCUIs. If you want one row per concept, either exclude PSN or group by RXCUI.
- **Sorting by RXCUI is lexicographic** because the column is `varchar(8)`, so `"1000000"` sorts before `"161"`. If numeric order is wanted, sort on `CAST(RXCUI AS UNSIGNED)` or add a numeric generated column. The keyset cursor would need the same cast.
- **Client error messages show `response.statusText`** (`drug/[slug]/page.tsx:15`, `searchResults.tsx:35`). That is empty over HTTP/2 and hides the server's message (for example "Search term is required"). Show the status code and the response body's `message` instead.

---

## 3. Performance

All timings below are from the local database (MySQL 26.7, the full prescribable-content release).

### P1 — Medium — Short search terms scan most of the table, twice

The name matcher is `STR LIKE '%word%'`, which can't use an index. On the first page the count query and the page query each do that scan, in parallel:

| Term | Matches | Count | Page (by STR) |
|---|---|---|---|
| `a` | 95,750 | 182 ms | 168 ms |
| `mg` | 50,923 | 237 ms | 218 ms |
| `acetaminophen` | 1,515 | 59 ms | 59 ms |

That's acceptable today. But a one-character search costs roughly 350 ms of DB time, the throttle is per IP, and there is no minimum term length, so one client can generate a lot of DB load cheaply. This will also scale linearly if more of RxNorm is loaded. Options, from cheapest to most work:

1. Require a minimum length of 2–3 characters for name matching (an RXCUI or NDC can still be matched exactly).
2. Cap the count, for example `SELECT COUNT(*) FROM (… LIMIT 1001)`, and show "1,000+". Or fold it into the page query with `COUNT(*) OVER()`, which costs one scan instead of two.
3. For real speed, add an `ngram` FULLTEXT index on `STR` (MySQL's ngram parser supports infix matching) and use `MATCH … AGAINST` in boolean mode for terms of length ≥ ngram size. Keep `LIKE` as the fallback for shorter terms.

### P2 — Medium — The drug detail response has no size limit

- One atom has **3,558 NDCs**, and all of them are joined into one string and rendered in one table cell.
- Acetaminophen (`/drug/127`) returns **562 related-drug rows**, all of them sent to the client and handed to the DataGrid.

The responses are large, the UI is hard to use, and payloads like this hurt on mobile. **Fix:**
- Return NDCs as an array and paginate them, or show the first N with a "show all".
- Paginate or group related drugs by relationship type (`RELA`) on the server.

### P3 — Low — The drug detail queries run one after another when they don't need to

`drug.service.ts:42-70`. After the first lookup, the NDC query and the related-drugs query don't depend on each other. **Fix:** run them with `Promise.all`. (The related-drugs query is already efficient: `EXPLAIN` shows an index-merge union on `RXNREL_RXCUI1_idx`/`RXCUI2_idx` and covering lookups on `RXNCONSO_RXCUI_idx`.)

### P4 — Low — Nothing is cached, even though the data changes monthly

Every drug page is fetched in the browser after hydration (`'use client'` everywhere, `useEffect` fetch), so nothing is cached. RxNorm data changes monthly. **Fix:** any of these would remove most of the load.
- Send `Cache-Control: public, max-age=3600` (or an ETag tied to the release version) from the API.
- Render `/drug/[slug]` as a server component that `fetch`es with `next: { revalidate: 86400 }`.

The server-component approach also makes the page show content on first load and makes drug pages indexable.

### P5 — Low — Client bundle and rendering

- `app/page.tsx` is `'use client'` but has no client logic. Making it a server component would ship less JS.
- `layout.tsx:6-9` loads 4 Roboto weights through `@fontsource` CSS. `next/font/google` (or `next/font/local`) would self-host only the subsets that are used and avoid layout shift.
- `layout.tsx:4` imports `@mui/material-nextjs/v15-appRouter`, but the app is on Next 16 and the installed package ships `v16-appRouter`. Switch to it.

---

## 4. Code quality and maintainability

### Q1 — `@Res()` bypasses Nest's response pipeline

`drug.controller.ts:20` and `search.controller.ts:17` take the Express `res` and call `res.status(200).json(...)`. That opts out of interceptors, serialization and `@Header()`/`@HttpCode()` decorators, and it's harder to test. **Fix:** `return drug;` / `return drugs;`. The status is 200 by default.

### Q2 — Shared types reach across package boundaries

The client imports `../../../rxnorm-explorer-server/types/drug` (`drugDetail.tsx:11,13`, `drug/[slug]/page.tsx:6`, `types/searchResult.ts:1`). On the server, `types/searchResults.ts:1` imports the TypeORM entity class, so the "API contract" is the persistence model. That coupling is also what causes C1.

**Fix:** put plain DTO types in a small shared package, for example an npm workspace `packages/api-types`. Have the API map entities to DTOs. Alternatively, generate an OpenAPI spec with `@nestjs/swagger` and generate client types from it.

### Q3 — Leftover scaffold code and dependencies

- `AppController`/`AppService` "Hello World" route at `GET /`. Replace it with a real health check, for example `GET /health` that pings the DB.
- `rxnorm-explorer-server/README.md` is the stock NestJS README.
- Client `package.json`: `rxjs` is unused. `dotenv` is only imported in `layout.tsx:1`, and Next already loads `.env*` itself, so remove both.
- `@types/node` is `^20` in the client while the project requires Node 24.

### Q4 — Validate config once, at startup

`datasource.ts:9` creates a `ConfigService` by hand. `getOrThrow<number>('DATABASE_PORT')` actually returns a string. The throttle and CORS checks live in `main.ts`. **Fix:** use `ConfigModule.forRoot({ validate })` with a schema (class-validator or zod) covering every variable, including numeric `THROTTLE_*`, `PORT` and `DATABASE_PORT`. Then read typed values from `ConfigService` everywhere, using `ThrottlerModule.forRootAsync` and `TypeOrmModule.forRootAsync`.

### Q5 — Small cleanups

- Typos: `serchService` (`search.controller.ts:8`) and `setPagionationModel` (`searchResultsList.tsx:32`).
- `drugDetail.tsx:67` uses `.map` only for its side effect (pushing into `rows`). Use `const rows = …map(…)`.
- The `RELA` exclusion list (`drug.service.ts:61`) and the `translateRELA` labels (`drugDetail.tsx:17-34`) describe the same vocabulary in two places. Keep it in one shared module.
- Server `tsconfig.json` has `noImplicitAny: false` and `strictBindCallApply: false`. Turn on `"strict": true`, since the codebase is small enough to fix what that surfaces.
- `layout.tsx:37` wraps `<body>` in `AppRouterCacheProvider`. MUI's docs put the provider inside `<body>`.

### Q6 — Accessibility and UX

- **Rows aren't links.** Search results navigate only through `onRowClick` (`searchResultsList.tsx:129`), so keyboard users can't reach them, and nobody can middle-click or open one in a new tab. Render the name cell as a `<Link href={`/drug/${id}`}>`.
- **The search runs on `onKeyUp` Enter** (`searchBox.tsx:20`) with no `<form>` and no submit button. This fires during IME composition (CJK input) and isn't announced as a search form. **Fix:** wrap it in a `<form role="search" onSubmit>` and add a visible submit button.
- **Loading and error states aren't announced** to assistive technology. Add `role="status"` and `role="alert"`.

---

## 5. Docs, tooling and operations

### D1 — The README's setup steps reference files that aren't in the repo

`README.md:14-16` tells you to work in `rxnorm-explorer-server/docker`, copy `.env.example`, and run `docker compose up -d`. That directory only holds the git-ignored `mysqldata/`. There is no `docker-compose.yml` and no `.env.example` in it. A fresh clone can't follow the setup. **Fix:** commit the compose file and its `.env.example`.

### D2 — No CI

Add a workflow that runs, for both packages: `npm ci`, `lint`, `tsc --noEmit`, `test`, `build`, and `npm audit --omit=dev --audit-level=high`. That would have caught C1, C4 and S1.

### D3 — Operational gaps

- **Graceful shutdown:** call `app.enableShutdownHooks()` so DB connections close cleanly on `SIGTERM`.
- **Request logging:** there is none, so add some, along with a health endpoint (Q3).
- **Data refresh:** document the monthly RxNorm refresh (ties to C3).
- **Query logging:** `datasource.ts:23` logs every query when `ENV=development`. That's fine, but `ENV` is non-standard. Use `NODE_ENV`, which Nest and Next already read.

---

## What's done well

- **Query safety:** parameters throughout, the sort-field allow-list, and LIKE escaping.
- **Keyset pagination with an `id` tie-breaker** (`search.service.ts:86-104`). It's correct in both directions and stays fast on deep pages. The client resets cursors when the sort changes and keys results on the search term, which avoids the usual "stale cursor" bugs.
- **Search query structure:** the separate `UNION`ed matchers are measurably fast. The NDC and RXCUI branches use index lookups (`RXNSAT_ATV_idx`, `RXNCONSO_RXAUI_key`). The comments explain *why* the query is shaped this way, which will stop someone from "simplifying" it back into the slow per-row subquery.
- **Race handling on the client:** both data-fetching components ignore stale responses (`ignore` flags, and request/slug matching to derive loading state).
- **The baseline protections are in place:** Helmet, throttling and a CORS allow-list are all configured.
- **The comments are good.** They are short, explain intent, and record trade-offs (for example `MAX_SEARCH_WORDS`).

---

## Recommended order of work

| # | Item | Effort |
|---|---|---|
| 1 | S1: `npm audit fix` in both packages | Minutes |
| 2 | S2 + S3: read-only app DB user; turn `local_infile` off | Minutes |
| 3 | C1: fix `start:prod` (move `types/` under `src/`) | Small |
| 4 | S4: `ValidationPipe` + DTOs + `ParseIntPipe` | Small |
| 5 | C2: fix the migration `down()` SQL | Minutes |
| 6 | C4 + D2: get tests passing, add SearchService tests and CI | Medium |
| 7 | D1: commit the docker compose setup | Small |
| 8 | C3: switch public ids to `RXAUI`; document the data reload | Medium |
| 9 | P1 + P2: minimum term length / capped count; bound the drug-detail payload | Small–Medium |
| 10 | P4: caching headers or a server-rendered drug page | Small–Medium |
| 11 | The remaining Low/Info items, as convenient | — |
