# Simple SQL Client

A lightweight Electron-based SQL client for Microsoft SQL Server and PostgreSQL.

## Features

- Connect to Microsoft SQL Server and PostgreSQL databases
- Save and manage multiple connection profiles
- Test connections before connecting
- Execute SQL queries (supports executing selected text or entire query)
- View query results in a clean table format
- Minimal dependencies - pure vanilla JavaScript/TypeScript

## Installation

```bash
npm install
```

## Running the Application

```bash
npm start
```

For development with auto-recompile:

```bash
npm run dev
```

## Building

To compile TypeScript files:

```bash
npm run build
```

## Usage

1. **Create a Connection**
   - Enter connection details (name, host, port, database, username, password)
   - Test the connection to verify settings
   - Save the connection for future use

2. **Manage Connections**
   - Saved connections appear as cards
   - Click a card to load the connection settings
   - Delete connections using the × button

3. **Execute Queries**
   - After connecting, enter your SQL query in the text area
   - Click "Execute Query" to run all queries
   - Select specific text to execute only the selected portion
   - Results appear in a table below

## Database Support

- **Microsoft SQL Server** (default port: 1433)
- **PostgreSQL** (default port: 5432)

## Dependencies

- `electron` - Desktop application framework
- `typescript` - TypeScript compiler
- `mssql` - Microsoft SQL Server client
- `pg` - PostgreSQL client

## License

MIT
