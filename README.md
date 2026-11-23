# RxNorm Explorer

RxNorm Explorer is a simple search tool to view details about prescribable drugs in the United States via the [RxNorm](https://www.nlm.nih.gov/research/umls/rxnorm/index.html) database.

## Requirements

- Node.js v24
- Docker (not needed if you are rolling your own MySQL installation)
- Database should have 16 GB of memory allocated due to resources needed for the migrations. You can probably lower the resources once the migrations have completed.

## Setup

- Go into the `rxnorm-explorer-server` and `rxnorm-explorer-client` directories and type `npm install` in each
- From the `rxnorm-explorer-server/docker` directory:
  1. Copy `.env.example` to `.env` and populate `.env` with your preferred root password and database port
  2. Type `docker compose up -d` in the terminal to spin up the container
  3. Connect to the database using the root user, the password you entered into `.env`, and create a database (`rxnorm` below).
  4. Create two accounts. The API only ever reads, so give it `SELECT` and nothing else, and give the migrations their own account:
     ```sql
     CREATE USER 'rxnorm_app'@'%' IDENTIFIED BY '<app password>';
     GRANT SELECT ON rxnorm.* TO 'rxnorm_app'@'%';

     CREATE USER 'rxnorm_migrate'@'%' IDENTIFIED BY '<migration password>';
     GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON rxnorm.* TO 'rxnorm_migrate'@'%';
     ```
     The import script and the migrations use `rxnorm_migrate`. Never point the API at `root`.
  5. Type `SET GLOBAL local_infile = 1;` into your database while connected as root to allow RRF file imports. This is only needed for the import, so turn it off again afterwards (see below).
- From [https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html](https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html), download the `Current Prescribable Content Monthly Release` zip file and unzip it. From the unzipped directory:
  1. Enter the unzipped folder and copy all of the files in the `rrf/` directory to `scripts/mysql/`
  2. Within `scripts/mysql`, open either `populate_mysql_rxn.sh` or `populate_mysql_rxn.bat`
  3. Populate the variables up top with your newly-created credentials and correct path to the mysql executable
  4. Note: If you set a custom port, you will need to create a new variable for it (such as `dbport`) and set it in the two `mysql` commands further down the file (ie, `-P$dbport` on the sh file)
  5. Note: You may need to also set `--local-infile=1` on the mysql commands to enable RRF import on the client side
  6. Run the sh or bat file to import the RXNorm files into your database
  7. Upon successful import, you may delete this directory and zip file
  8. Turn `local_infile` back off while connected as root: `SET GLOBAL local_infile = 0;`. Leaving it on lets any client ask the server to read files from the client's host.
- From the `rxnorm-explorer-server` directory:
  1. Copy `.env.example` to `.env` and populate the variables. `PORT` is the node server port. Set `DATABASE_USER` to the read-only `rxnorm_app` account, and `MIGRATION_DATABASE_USER`/`MIGRATION_DATABASE_PASSWORD` to `rxnorm_migrate`.
  2. Type `npm run migration:run` to add the ids, indexes and keys the app needs.
- From the `rxnorm-explorer-client` directory:
  1. Copy `.env.example` to `.env` and populate the variables. The API URL is address to the server API, ie `http://localhost:6109/`
- From both `rxnorm-explorer-server` and `rxnorm-explorer-client` type `npm run dev` in the terminal to start the app.

## Monthly data refresh

RxNorm ships a new release every month. The NLM load scripts drop and recreate the tables, which also removes the `id` columns, indexes and foreign key that the migrations add. The `migrations` table would still say those migrations had run, so they would not run again. Load each release into a fresh schema and swap it in instead:

1. As root, create a staging schema and give both accounts the same grants on it as on `rxnorm` (see Setup):
   ```sql
   CREATE DATABASE rxnorm_next;
   GRANT SELECT ON rxnorm_next.* TO 'rxnorm_app'@'%';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES ON rxnorm_next.* TO 'rxnorm_migrate'@'%';
   ```
2. Import the new release into `rxnorm_next` with the NLM script, as in Setup. Turn `local_infile` on only for the import.
3. From `rxnorm-explorer-server`, run the migrations against the staging schema: `DATABASE_NAME=rxnorm_next npm run migration:run`.
4. As root, swap the tables in a single statement. `RENAME TABLE` is atomic, so the API never sees a half-loaded release:
   ```sql
   CREATE DATABASE rxnorm_old;
   RENAME TABLE
     rxnorm.RXNCONSO TO rxnorm_old.RXNCONSO, rxnorm_next.RXNCONSO TO rxnorm.RXNCONSO,
     rxnorm.RXNREL TO rxnorm_old.RXNREL, rxnorm_next.RXNREL TO rxnorm.RXNREL,
     rxnorm.RXNSAT TO rxnorm_old.RXNSAT, rxnorm_next.RXNSAT TO rxnorm.RXNSAT,
     rxnorm.migrations TO rxnorm_old.migrations, rxnorm_next.migrations TO rxnorm.migrations;
   ```
   Add any other tables the NLM script created to the statement in the same way.
5. Check the app, then `DROP DATABASE rxnorm_old; DROP DATABASE rxnorm_next;`.

Drug pages are addressed by RXAUI, RxNorm's own atom id, so links and bookmarks keep working across releases. A drug that NLM retires in a release will return a 404. The internal `id` columns are renumbered on every load, so a search that is being paged through during the swap starts again from the first page.

## Testing

- Server (`rxnorm-explorer-server`):
  - `npm test` runs the unit tests, which mock the database. `npm run test:cov` adds a coverage report.
  - `npm run test:e2e` runs the end-to-end tests against the database configured in `.env`, so it needs the RxNorm data loaded and the migrations run. The tests look up the drugs they use, so any monthly release works.
- Client (`rxnorm-explorer-client`):
  - `npm test` runs the component and page tests (Vitest with React Testing Library). `npm run test:watch` re-runs them on change, and `npm run test:cov` adds a coverage report.
