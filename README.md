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
  3. Connect to the database using the root user, the password you entered into `.env`, and create a database. You should also create a new user/password for this new database.
  4. Type `SET GLOBAL local_infile = 1;` into your database while connected as root to allow RRF file imports
- From [https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html](https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html), download the `Current Prescribable Content Monthly Release` zip file and unzip it.
  1. Enter the unzipped folder and copy all of the files in the `rrf/` directory to `scripts/mysql/`
  2. Within `scripts/mysql`, open either `populate_mysql_rxn.sh` or `populate_mysql_rxn.bat`
  3. Populate the variables up top with your newly-created credentials and correct path to the mysql executable
  4. Note: If you set a custom port, you will need to create a new variable for it (such as `dbport`) and set it in the two `mysql` commands further down the file (ie, `-P$dbport` on the sh file)
  5. Note: You may need to also set `--local-infile=1` on the mysql commands to enable RRF import on the client side
  6. Run the sh or bat file to import the RXNorm files into your database
  7. Upon successful import, you may delete this directory and zip file
- From your newly-created database, enter the following commands to create a required `id` column that does not exist in the tables as imported. Prisma will not run until these are added:
  - ``ALTER TABLE `RXNCONSO` ADD `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;``
  - ``ALTER TABLE `RXNREL` ADD `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;``
  - ``ALTER TABLE `RXNSAT` ADD `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;``
- From the `rxnorm-explorer-server` directory:
  1. Copy `.env.example` to `.env` and populate the variables. `PORT` is the node server port.
- From the `rxnorm-explorer-client` directory:
  1. Copy `.env.example` to `.env` and populate the variables. The API URL is address to the server API, ie `http://localhost:6109/`
- From both `rxnorm-explorer-server` and `rxnorm-explorer-client` type `npm run dev` in the terminal to start the app.
