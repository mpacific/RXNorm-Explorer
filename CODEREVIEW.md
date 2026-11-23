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

1. ~~**Dependencies have known vulnerabilities**, including a critical advisory against the installed Next.js (16.3.4).~~ ✅
2. ~~**The API connects to MySQL as `root`**, and `local_infile` is still on globally.~~ ✅ (in the repo; the server change is manual)
3. ~~**`npm run start:prod` is broken.** The build writes `dist/src/main.js`, but the script runs `dist/main`.~~ ✅
4. **4 of the 5 unit test suites fail**, and the only e2e test checks the scaffold's "Hello World".
5. ~~**There is no request validation.** Malformed query strings cause 500s, and `/drug/127abc` returns drug 127.~~ ✅
6. ~~**Drug URLs use a surrogate `id`** that the migration assigns. A reload of the RxNorm data will change or remove these ids.~~ ✅

---

## 1. Security

### ~~S1 — High — Dependencies with known vulnerabilities (both packages)~~ ✅ Fixed

> **Fixed** on `fix/s1-dependency-audit`: `npm audit fix` in both packages (Next is now 16.4.6, and `sharp` is 0.35.5). `npm audit --omit=dev` reports 0 vulnerabilities in both. 19 moderate dev-only advisories (glob/minimatch under the Nest CLI and Jest) are left, because fixing them needs breaking `--force` upgrades. The CI audit step is covered under D2.

`npm audit --omit=dev` output:

| Package | Installed | Severity | Notes |
|---|---|---|---|
| `next` (client) | 16.3.4 | **Critical** | Includes RCE in `next/og` `ImageResponse`, SSRF in Image Optimization, and SSG/ISR cache poisoning. This app does not use `next/og` or `next/image` today, so the exposure is lower than the rating suggests, but this is the framework and should be patched. |
| `sharp` (client, via next) | <0.35.5 | High | librsvg CVE |
| `source-map-js` (client) | ≤1.2.1 | High | Event-loop DoS |
| `proxy-addr` (server, via express) | ≤2.0.7 | **Critical** | IP spoofing via IPv4-mapped IPv6 trust subnets. This only matters when `trust proxy` is configured, which it isn't yet (see S5). |
| `multer` / `@nestjs/platform-express` (server) | ≤2.3.0 / ≤11.2.5 | High | Several DoS issues. There are no upload routes, but multer ships with the platform. |

**Fix:** run `npm audit fix` in both packages, re-run the build and tests, and commit the lockfiles. Add `npm audit --omit=dev --audit-level=high` to CI (see D2).

### ~~S2 — High — The API connects to the database as `root`~~ ✅ Fixed

> **Fixed** — on `fix/s2-s3-db-privileges`. The README now walks through creating a `SELECT`-only `rxnorm_app` account for the API and a separate `rxnorm_migrate` account. `datasource.ts` makes the migration CLI connect as `MIGRATION_DATABASE_USER`/`MIGRATION_DATABASE_PASSWORD` when they are set. **Still to do by hand:** create the accounts on your MySQL server and point `.env` at `rxnorm_app`. (I didn't change grants on your database.)

`SHOW GRANTS` for the configured `DATABASE_USER` returns `GRANT ALL ... ON *.* TO root@% WITH GRANT OPTION`, plus every dynamic privilege. The API only ever reads. Any future bug in a query path (or a compromised dependency) would therefore run with full server control. That includes `FILE`, which together with `local_infile` can read files from the host.

The README (`README.md:17`) does say to create a separate user, but nothing enforces it, and the local `.env` doesn't follow it.

**Fix:** create two accounts.
- An app user with `GRANT SELECT ON rxnorm.* TO 'rxnorm_app'@'%'`, used by the API.
- A migration user with `SELECT, ALTER, INDEX, REFERENCES` on the same schema, used only by `npm run migration:*`. TypeORM's migration CLI could read it from separate env vars such as `MIGRATION_DATABASE_USER`.

### ~~S3 — Medium — `local_infile` left enabled globally~~ ✅ Fixed

> **Fixed** — on `fix/s2-s3-db-privileges`. The README now has a step to run `SET GLOBAL local_infile = 0;` after the import. **Still to do by hand:** run it on your server, where `@@local_infile` is still `1`.

`SELECT @@local_infile` returns `1`. The README (`README.md:18`) tells you to turn it on for the RRF import, but never to turn it off again. When it is on, a client can ask the server to load local files, which is a known data-exfiltration path for malicious or compromised clients.

**Fix:** add a step to the README to run `SET GLOBAL local_infile = 0;` after the import. Better still, pass `--local-infile=1` only on the import client and leave the server setting off.

### ~~S4 — Medium — No input validation on request parameters~~ ✅ Fixed

> **Fixed** — on `fix/s4-request-validation`. A global `ValidationPipe({ whitelist, transform })` is registered in `configureApp`, and `SearchQueryDto` caps lengths and checks `sortField`/`sortDirection` with `@IsIn` and `cursorId` as digits. Repeated keys, unknown sort fields and `/drug/127abc` now get a 400. **Two differences from the suggestion:** (1) an unknown `sortField` is now a 400 instead of silently sorting by name. (2) The drug id is validated with a `DrugParamsDto` rather than `ParseIntPipe`, because the global pipe runs first and turned `1e3` into `1000` before `ParseIntPipe` saw it.

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

### ~~S5 — Low — Rate limiting is per IP with no proxy awareness, and its config isn't validated~~ 🟡 Partly fixed

> **Partly fixed** — on `fix/q4-config-validation`: `THROTTLE_MS`/`THROTTLE_LIMIT` must now be positive integers, so `THROTTLE_MS=60s` stops startup. **Not done:** proxy-aware keying and Redis storage. There is no proxy or second instance yet, so these stay as notes for when there is.

- `ThrottlerGuard` keys on `req.ip`. Behind a reverse proxy or load balancer, every user shares the proxy's IP, so one heavy user throttles everyone. If `trust proxy` is turned on later, configure it narrowly (and patch `proxy-addr`, see S1).
- `app.module.ts:21-22`: `Number(process.env.THROTTLE_MS!)` becomes `NaN` for a value like `"60s"`. `main.ts:15` only checks that the value is present, not that it's a number.
- Throttler state is in memory, so limits are per process.

**Fix:** validate the env (see Q4). Document the reverse-proxy setup when there is one, and use the Redis throttler storage if the API ever runs on more than one instance.

### ~~S6 — Low — CORS sends `credentials: true` with no need for it~~ ✅ Fixed

> **Fixed** — on `fix/s6-cors-credentials`: removed `credentials: true`. The e2e suite checks that `Access-Control-Allow-Credentials` is absent.

`main.ts:24-27`. The API uses no cookies or auth, so `Access-Control-Allow-Credentials` only widens what a whitelisted origin can do. **Fix:** remove `credentials: true`.

### ~~S7 — Low — The client sets no security headers~~ ✅ Fixed

> **Fixed** — on `fix/s7-client-security-headers`. `next.config.ts` `headers()` now sends a CSP (with `connect-src` limited to `'self'` and the `NEXT_PUBLIC_API_URL` origin, and `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `X-Frame-Options: DENY`. This is the "without nonces" CSP from Next's guide, because nonces would force every page to render dynamically. `'unsafe-inline'` stays for Next's hydration scripts and Emotion's styles. Checked with `next start`; **not yet exercised in a real browser.**

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

### ~~C1 — High — `npm run start:prod` points at a file that doesn't exist~~ ✅ Fixed

> **Fixed** — on `fix/c1-start-prod` (option a): `types/` moved to `src/types/`, and the server and client imports were updated. `nest build` now writes `dist/main.js`. `npm run start:prod` starts, and `/search` and `/drug/127` were checked against the local DB.

`package.json:15` runs `node dist/main`. Because `types/` lives outside `src/` and is compiled too, `tsc` raises the root to the project directory and writes **`dist/src/main.js`** (verified: `dist/` contains only `src/`, `types/` and the tsbuildinfo files). The production start command therefore fails with `Cannot find module`.

**Fix:** pick one.
- (a) Move `types/` to `src/types/`. The client imports these files, so update its paths too (see Q2).
- (b) Change the script to `node dist/src/main` and set `"entryFile": "src/main"` in `nest-cli.json`.

Option (a) is cleaner.

### ~~C2 — Medium — A migration's `down()` has invalid SQL, so revert fails~~ ✅ Fixed

> **Fixed** — The `down()` syntax was already fixed in `a07752f`, before this round. On `fix/c10-fk-migration`, `migrationsTransactionMode` is now `'each'` with a comment explaining why: under `'all'`, a failure rolled back the records of earlier migrations whose DDL had already committed.

`src/db/migrations/1789068330590-add-indexes-to-tables.ts:38-47` uses `DROP INDEX ON RXNCONSO RXNCONSO_RXCUI_idx`. MySQL's syntax is `DROP INDEX <name> ON <table>`, which `1790709373981-drop-unused-str-indexes.ts:7` already uses correctly. `npm run migration:revert` past this migration will throw a parse error.

There is a second problem. MySQL DDL commits implicitly, so `migrationsTransactionMode: 'all'` (`datasource.ts:20`) can't roll back a migration that fails partway. A failure leaves the migration half-applied and still unrecorded. Keep each migration small, or make the steps idempotent.

### ~~C3 — Medium — Drug URLs depend on surrogate ids that won't survive a data reload~~ ✅ Fixed

> **Fixed** — on `fix/c3-rxaui-public-ids`. The API route is now `/drug/:rxaui`. Search results and related drugs carry `RXAUI`, and every client link uses it. The `Drug` response no longer includes the surrogate `id`. That `id` now appears only as the keyset `cursorId` in search paging, which is short-lived. The README has a new "Monthly data refresh" section: load into a staging schema, run the migrations, then swap with an atomic `RENAME TABLE`. **Note:** existing `/drug/<id>` bookmarks from before this change will now get a 400.

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

### ~~C5 — Low — NDCs are formatted twice and end up with double spaces~~ ✅ Fixed

> **Fixed** — on `fix/c5-ndc-array`. The API now returns `NDCs: string[]` in place of the joined `ATV` string, and the client joins the array once. (The old client test used NDCs without spaces, which is why it never caught the double spaces.)

The server joins NDCs with `', '` (`drug.service.ts:50`). The client splits on `','` and joins with `', '` again (`drugDetail.tsx:64,109`), which gives `"a,  b"`. **Fix:** return `NDCs: string[]` from the API and join once in the client.

### ~~C6 — Low — The search box goes stale on back/forward~~ ✅ Fixed

> **Fixed** — on `fix/c6-searchbox-history`. `<SearchBox key={`box:${searchTerm}`}>` remounts the box when the URL term changes. The `box:` prefix is needed because `SearchResults` beside it is already keyed on the bare term, and duplicate sibling keys left the old input in the DOM. A test covers back/forward.

`searchBox.tsx:19` uses an uncontrolled `defaultValue`. On `/search`, if you search "a", then "b", then press Back, the URL and results show "a" but the text box still says "b". **Fix:** render `<SearchBox key={searchTerm} … />` in `search/page.tsx:31`.

### ~~C7 — Low — The README's example API URL breaks requests~~ ✅ Fixed

> **Fixed** — on `fix/c7-api-url`. The README example no longer has the trailing slash. Both fetches go through a new `apiUrl()` helper (`app/lib/apiUrl.ts`), which joins the base and path with exactly one slash, so either form works.

`README.md:33` gives `http://localhost:6109/` (with a trailing slash). The client builds `${NEXT_PUBLIC_API_URL}/drug/…` (`drug/[slug]/page.tsx:11`, `searchResults.tsx:31`), which produces `//drug/…`. Express doesn't collapse the double slash, so the request won't match the route. **Fix:** remove the trailing slash in the README, and/or build URLs with `new URL('drug/' + id, base)`.

### ~~C8 — Low — SQL string literals use double quotes~~ ✅ Fixed

> **Fixed** — on `fix/c8-sql-literals`. `"NDC"` and the RELA exclusion list are now bound parameters (`:ndc`, `:...inverseRelas`). The list lives in an `INVERSE_RELAS` constant.

`drug.service.ts:45` (`ATN = "NDC"`) and `:61` (the `RELA NOT IN ("…")` list) use double-quoted literals. These work under the current `sql_mode`. They would turn into identifiers, and break the query, if `ANSI_QUOTES` were ever enabled. **Fix:** use single quotes, or better, bind them as parameters, as `search.service.ts` already does.

### ~~C9 — Low — Entity metadata no longer matches the real schema~~ ✅ Fixed

> **Fixed** — on `fix/c9-entity-metadata`. The entities were regenerated from `information_schema`, with the real lengths, the `RXNCONSO_*_idx` names from the migrations, the FK name, LAT's default, and no STR index. The ATN/ATV prefix indexes are declared with `synchronize: false`. A comment says they are read-only mappings. `migration:generate --dryrun` now reports **no changes** (it reported 17 statements before). **Also found:** the entities had no explicit table names, so TypeORM mapped them to lower-case `rxnconso` etc. That only works because this MySQL has `lower_case_table_names=2`, and it would break on a default Linux server. They are now `@Entity('RXNCONSO')` etc.

- `RXNCONSO.entity.ts:59-61` still has `@Index()` on `STR`, which migration `1790709373981` dropped.
- The decorator indexes would be generated with TypeORM's hashed names, not the `RXNCONSO_*_idx` names that the migrations create.
- No column sets a `length`. The entities imply `varchar(255)`, but the real columns are `STR varchar(3000)`, `ATV varchar(4000)` and `ATN varchar(1000)`.

`synchronize` is off, so nothing breaks today. But `typeorm migration:generate` would produce a destructive diff that tries to shrink columns and recreate indexes. **Fix:** make the entities match the DB (lengths, `@Index('RXNCONSO_RXCUI_idx')` names, remove the `STR` index), or add a comment saying the entities are read-only mappings and must never be used to generate migrations.

### ~~C10 — Low — The FK migration skips validating existing data~~ ✅ Fixed

> **Fixed** — on `fix/c10-fk-migration`. The FK is now added with `FOREIGN_KEY_CHECKS` left on, so MySQL validates the existing rows. The migration counts orphans first and fails with a query that finds them. The local data has 0 orphans. `ON DELETE SET NULL ON UPDATE CASCADE` is unchanged so fresh and existing databases match. Removing it would need a new migration, and it does no harm on read-only data.

`1790698212730-add-relations-to-tables.ts:5-9` turns off `FOREIGN_KEY_CHECKS` around `ADD CONSTRAINT`, so existing orphan rows aren't checked. If the statement fails, checks stay off on that pooled connection. `ON DELETE SET NULL ON UPDATE CASCADE` also has little purpose on read-only reference data. **Fix:** check for orphans first (`SELECT COUNT(*) FROM RXNSAT s LEFT JOIN RXNCONSO c USING (RXAUI) WHERE c.id IS NULL`) and add the FK with checks on. Or drop the FK, since nothing relies on it at runtime.

### ~~C11 — Low — Bootstrap errors are unhandled~~ ✅ Fixed

> **Fixed** — on `fix/q4-config-validation`. The `HttpException` startup checks are gone, because config validation covers them. `bootstrap()` now ends in `.catch(…process.exit(1))`.

`main.ts:30` calls `bootstrap()` as a floating promise (this is the only ESLint warning). On top of that, `main.ts:9-19` throws `HttpException`s, which are meant for HTTP responses, during startup. **Fix:** use `bootstrap().catch((e) => { console.error(e); process.exit(1); })`, throw plain `Error`s, or better, move the checks into config validation (Q4).

### C12 — Info — Product behaviors to confirm are intended

- **One concept can appear several times in search results.** A concept's SCD/SBD atom and its PSN (prescribable name) atom both show up. For "acetaminophen 500", 137 rows cover 92 distinct RXCUIs. If you want one row per concept, either exclude PSN or group by RXCUI.
- **Sorting by RXCUI is lexicographic** because the column is `varchar(8)`, so `"1000000"` sorts before `"161"`. If numeric order is wanted, sort on `CAST(RXCUI AS UNSIGNED)` or add a numeric generated column. The keyset cursor would need the same cast.
- **Client error messages show `response.statusText`** (`drug/[slug]/page.tsx:15`, `searchResults.tsx:35`). That is empty over HTTP/2 and hides the server's message (for example "Search term is required"). Show the status code and the response body's `message` instead.

---

## 3. Performance

All timings below are from the local database (MySQL 26.7, the full prescribable-content release).

### ~~P1 — Medium — Short search terms scan most of the table, twice~~ 🟡 Partly fixed

> **Partly fixed** — on `fix/p1-search-cost` (option 1): words shorter than 2 characters are left out of the name `LIKE`, though the whole term still matches RXCUI/NDC exactly. `a` no longer scans and counts ~96k rows. **Measured and not done:** (a) `COUNT(*) OVER()` in the page query was *slower* than the separate count for `a` (306 ms against 149 ms), so I dropped that idea. (b) A capped count is cheap (50 ms against 149 ms), but the grid's server-side paging uses the total as its row count, so a cap would block paging past it. That needs a UX decision ("1,000+" with open-ended paging). (c) The ngram FULLTEXT index is a bigger change. **Still open:** the search box doesn't yet tell people that one-letter words are ignored.

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

### ~~P2 — Medium — The drug detail response has no size limit~~ 🟡 Partly fixed

> **Partly fixed** — on `fix/p2-bound-ndc-list`: the facts table shows the first 20 NDCs and a "Show all N NDCs" / "Show fewer" toggle. (NDCs became an array under C5.) **Not done:** the API still sends every NDC and all related-drug rows, about 50 KB and 110 KB for the worst cases. The DataGrid virtualizes the 562 rows, so rendering is fine. Paginating or grouping related drugs by RELA on the server changes the API and the page layout, so I left it for you to decide.

- One atom has **3,558 NDCs**, and all of them are joined into one string and rendered in one table cell.
- Acetaminophen (`/drug/127`) returns **562 related-drug rows**, all of them sent to the client and handed to the DataGrid.

The responses are large, the UI is hard to use, and payloads like this hurt on mobile. **Fix:**
- Return NDCs as an array and paginate them, or show the first N with a "show all".
- Paginate or group related drugs by relationship type (`RELA`) on the server.

### ~~P3 — Low — The drug detail queries run one after another when they don't need to~~ ✅ Fixed

> **Fixed** — on `fix/p3-parallel-drug-queries`. The NDC and related-drugs queries run together in `Promise.all`, and a unit test checks that the second starts before the first finishes.

`drug.service.ts:42-70`. After the first lookup, the NDC query and the related-drugs query don't depend on each other. **Fix:** run them with `Promise.all`. (The related-drugs query is already efficient: `EXPLAIN` shows an index-merge union on `RXNREL_RXCUI1_idx`/`RXCUI2_idx` and covering lookups on `RXNCONSO_RXCUI_idx`.)

### ~~P4 — Low — Nothing is cached, even though the data changes monthly~~ ✅ Fixed

> **Fixed** — on `fix/p4-cache-headers` (option 1). A `CacheControlInterceptor` sends `Cache-Control: public, max-age=3600` on successful `/search` and `/drug/:rxaui` responses. Express already adds an ETag, so revalidation is cheap. It is an interceptor rather than `@Header()` because Nest applies `@Header()` before the handler runs, which would have made 400s and 404s cacheable too. Tests cover both cases. The server-component option is not done; see P5.

Every drug page is fetched in the browser after hydration (`'use client'` everywhere, `useEffect` fetch), so nothing is cached. RxNorm data changes monthly. **Fix:** any of these would remove most of the load.
- Send `Cache-Control: public, max-age=3600` (or an ETag tied to the release version) from the API.
- Render `/drug/[slug]` as a server component that `fetch`es with `next: { revalidate: 86400 }`.

The server-component approach also makes the page show content on first load and makes drug pages indexable.

### ~~P5 — Low — Client bundle and rendering~~ ✅ Fixed

> **Fixed** — on `fix/p5-client-bundle`. All three points are done. (1) `app/page.tsx` is a server component, and `'use client'` moved down to `searchBox.tsx`, which needs the router. (2) Roboto is loaded with `next/font/google` (four weights, Latin subset preloaded, `--font-roboto` variable). A small client `ThemeProvider` (`app/theme.tsx`) points MUI's typography at the variable, and `@fontsource/roboto` is removed. (3) The layout imports `v16-appRouter`. `next build` passes, and the served home page has the font variable class on `<html>` and a woff2 preload. **Note:** `next/font/google` downloads the font from Google *at build time*, so builds need network access (visitors never contact Google).

- `app/page.tsx` is `'use client'` but has no client logic. Making it a server component would ship less JS.
- `layout.tsx:6-9` loads 4 Roboto weights through `@fontsource` CSS. `next/font/google` (or `next/font/local`) would self-host only the subsets that are used and avoid layout shift.
- `layout.tsx:4` imports `@mui/material-nextjs/v15-appRouter`, but the app is on Next 16 and the installed package ships `v16-appRouter`. Switch to it.

---

## 4. Code quality and maintainability

### ~~Q1 — `@Res()` bypasses Nest's response pipeline~~ ✅ Fixed

> **Fixed** — on `fix/q1-remove-res`. Both controllers now return their result (`Promise<Drug>` / `Promise<SearchResults>`), so interceptors and `@Header()` apply again. The `serchService` typo from Q5 was fixed at the same time.

`drug.controller.ts:20` and `search.controller.ts:17` take the Express `res` and call `res.status(200).json(...)`. That opts out of interceptors, serialization and `@Header()`/`@HttpCode()` decorators, and it's harder to test. **Fix:** `return drug;` / `return drugs;`. The status is 200 by default.

### ~~Q2 — Shared types reach across package boundaries~~ 🟡 Partly fixed

> **Partly fixed** — on `fix/c1-start-prod`: `SearchResults` is now a plain type (`Pick<Drug, …>`) instead of the TypeORM entity, so the API contract no longer depends on the persistence model. **Not done:** the client still imports the types through `../rxnorm-explorer-server/src/types`. A shared workspace package or OpenAPI-generated types is a bigger restructure, so I left it for you to decide.

The client imports `../../../rxnorm-explorer-server/types/drug` (`drugDetail.tsx:11,13`, `drug/[slug]/page.tsx:6`, `types/searchResult.ts:1`). On the server, `types/searchResults.ts:1` imports the TypeORM entity class, so the "API contract" is the persistence model. That coupling is also what causes C1.

**Fix:** put plain DTO types in a small shared package, for example an npm workspace `packages/api-types`. Have the API map entities to DTOs. Alternatively, generate an OpenAPI spec with `@nestjs/swagger` and generate client types from it.

### ~~Q3 — Leftover scaffold code and dependencies~~ ✅ Fixed

> **Fixed** — on `fix/q3-scaffold-cleanup`. `AppController`/`AppService` are replaced by `GET /health`, which runs `SELECT 1` and returns a 503 without details when the database is down. It is `@SkipThrottle()`, and e2e tests cover both. Both stock package READMEs are replaced with short ones listing the endpoints and scripts. `rxjs` and `dotenv` are removed from the client. `@types/node` was already `^24` before this round.

- `AppController`/`AppService` "Hello World" route at `GET /`. Replace it with a real health check, for example `GET /health` that pings the DB.
- `rxnorm-explorer-server/README.md` is the stock NestJS README.
- Client `package.json`: `rxjs` is unused. `dotenv` is only imported in `layout.tsx:1`, and Next already loads `.env*` itself, so remove both.
- `@types/node` is `^20` in the client while the project requires Node 24.

### ~~Q4 — Validate config once, at startup~~ ✅ Fixed

> **Fixed** — on `fix/q4-config-validation`. `ConfigModule.forRoot({ validate })` checks every variable against a class-validator schema (`src/config/env.validation.ts`) and converts numbers. TypeORM and the throttler use `forRootAsync` with the validated `ConfigService`. The options builder (`src/db/dataSourceOptions.ts`) is shared with the migration CLI.

`datasource.ts:9` creates a `ConfigService` by hand. `getOrThrow<number>('DATABASE_PORT')` actually returns a string. The throttle and CORS checks live in `main.ts`. **Fix:** use `ConfigModule.forRoot({ validate })` with a schema (class-validator or zod) covering every variable, including numeric `THROTTLE_*`, `PORT` and `DATABASE_PORT`. Then read typed values from `ConfigService` everywhere, using `ThrottlerModule.forRootAsync` and `TypeOrmModule.forRootAsync`.

### ~~Q5 — Small cleanups~~ 🟡 Partly fixed

> **Partly fixed** — on `fix/q5-cleanups`, except where noted. `setPagionationModel` → `setPaginationModel` (`serchService` was fixed under Q1). `drugDetail.tsx` builds `rows` with `.map`. Server `"strict": true` and `noFallthroughCasesInSwitch` are on; this surfaced no errors. `strictPropertyInitialization` stays off, because TypeORM and class-transformer fill those properties. `AppRouterCacheProvider` moved inside `<body>` under P5. **Not done:** the single shared RELA module. It is a runtime import, so Turbopack refuses files outside the client root, and widening `turbopack.root` would make it watch the server's `node_modules` and the MySQL data directory. Both lists now carry "keep in step" comments, and a proper fix comes with the shared package in Q2.

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
| 1 | ~~S1: `npm audit fix` in both packages~~ ✅ | Minutes |
| 2 | ~~S2 + S3: read-only app DB user; turn `local_infile` off~~ ✅ | Minutes |
| 3 | ~~C1: fix `start:prod` (move `types/` under `src/`)~~ ✅ | Small |
| 4 | ~~S4: `ValidationPipe` + DTOs + `ParseIntPipe`~~ ✅ | Small |
| 5 | ~~C2: fix the migration `down()` SQL~~ ✅ | Minutes |
| 6 | C4 + D2: get tests passing, add SearchService tests and CI | Medium |
| 7 | D1: commit the docker compose setup | Small |
| 8 | ~~C3: switch public ids to `RXAUI`; document the data reload~~ ✅ | Medium |
| 9 | P1 + P2: minimum term length / capped count; bound the drug-detail payload | Small–Medium |
| 10 | P4: caching headers or a server-rendered drug page | Small–Medium |
| 11 | The remaining Low/Info items, as convenient | — |
