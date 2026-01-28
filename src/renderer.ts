import type { ConnectionConfig, SchemaInfo } from './types';

let currentConnection: ConnectionConfig | null = null;
let currentConnectionId: string | null = null;

// DOM Elements
const connectionPanel = document.getElementById('connectionPanel') as HTMLDivElement;
const queryPanel = document.getElementById('queryPanel') as HTMLDivElement;
const connectionForm = document.getElementById('connectionForm') as HTMLFormElement;
const savedConnectionsDiv = document.getElementById('savedConnections') as HTMLDivElement;
const resultsSection = document.getElementById('resultsSection') as HTMLDivElement;
const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnectBtn') as HTMLButtonElement;
const executeBtn = document.getElementById('executeBtn') as HTMLButtonElement;
const clearQueryBtn = document.getElementById('clearQueryBtn') as HTMLButtonElement;
const connectionStatus = document.getElementById('connectionStatus') as HTMLDivElement;
const queryStatus = document.getElementById('queryStatus') as HTMLDivElement;
const connectedDbName = document.getElementById('connectedDbName') as HTMLHeadingElement;
const queryInput = document.getElementById('queryInput') as HTMLTextAreaElement;
const queryHighlight = document.getElementById('queryHighlight') as HTMLElement;
const resultsTableHead = document.getElementById('resultsTableHead') as HTMLTableSectionElement;
const resultsTableBody = document.getElementById('resultsTableBody') as HTMLTableSectionElement;
const viewTableBtn = document.getElementById('viewTableBtn') as HTMLButtonElement | null;
const viewJsonBtn = document.getElementById('viewJsonBtn') as HTMLButtonElement | null;
const viewCsvBtn = document.getElementById('viewCsvBtn') as HTMLButtonElement | null;
const resultsTableContainer = document.getElementById('resultsTableContainer') as HTMLDivElement | null;
const resultsJsonContainer = document.getElementById('resultsJsonContainer') as HTMLDivElement | null;
const resultsCsvContainer = document.getElementById('resultsCsvContainer') as HTMLDivElement | null;
const resultsJsonPre = document.getElementById('resultsJsonPre') as HTMLPreElement | null;
const resultsCsvPre = document.getElementById('resultsCsvPre') as HTMLPreElement | null;
const themeToggleBtn = document.getElementById('themeToggleBtn') as HTMLButtonElement;
const toggleSchemaBtn = document.getElementById('toggleSchemaBtn') as HTMLButtonElement | null;
const schemaPanel = document.getElementById('schemaPanel') as HTMLDivElement | null;
const queryLayout = document.getElementById('queryLayout') as HTMLDivElement | null;
const schemaTree = document.getElementById('schemaTree') as HTMLDivElement | null;

// Form inputs
const connectionNameInput = document.getElementById('connectionName') as HTMLInputElement;
const dbTypeInput = document.getElementById('dbType') as HTMLSelectElement;
const hostInput = document.getElementById('host') as HTMLInputElement;
const portInput = document.getElementById('port') as HTMLInputElement;
const databaseInput = document.getElementById('database') as HTMLInputElement;
const usernameInput = document.getElementById('username') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;

// Initialize theme
initializeTheme();
loadSavedConnections();
updateQueryHighlight();

let resultViewMode: 'table' | 'json' | 'csv' = 'table';
let lastQueryResult: { columns: string[]; rows: any[]; rowCount: number } | null = null;

// Initialize result view mode from localStorage
const savedResultView = (localStorage.getItem('resultViewMode') as 'table' | 'json' | 'csv' | null);
if (savedResultView) {
  setResultViewMode(savedResultView);
} else {
  setResultViewMode('table');
}

queryInput.addEventListener('input', () => {
  updateQueryHighlight();
  syncScrollPosition();
});

queryInput.addEventListener('scroll', () => {
  syncScrollPosition();
});

// Theme toggle handler
themeToggleBtn.addEventListener('click', () => {
  toggleTheme();
});

// Schema panel toggle
if (toggleSchemaBtn) {
  toggleSchemaBtn.addEventListener('click', async () => {
    if (!currentConnection) {
      showStatus(queryStatus, 'Not connected to a database', true);
      return;
    }
    if (!schemaPanel || !schemaTree || !queryLayout) return;

    const hasSchema = queryLayout.classList.contains('has-schema');
    if (!hasSchema) {
      await openSchemaPanel();
    } else {
      closeSchemaPanel();
    }
  });
}

// Result view toggle
if (viewTableBtn && viewJsonBtn && viewCsvBtn) {
  viewTableBtn.addEventListener('click', () => setResultViewMode('table'));
  viewJsonBtn.addEventListener('click', () => setResultViewMode('json'));
  viewCsvBtn.addEventListener('click', () => setResultViewMode('csv'));
}

// Set default port based on database type
dbTypeInput.addEventListener('change', () => {
  if (dbTypeInput.value === 'mssql') {
    portInput.value = '1433';
  } else if (dbTypeInput.value === 'postgresql') {
    portInput.value = '5432';
  }
});

// Load saved connections
async function loadSavedConnections() {
  const connections = await window.electronAPI.getConnections();
  savedConnectionsDiv.innerHTML = '';

  if (connections.length === 0) {
    savedConnectionsDiv.innerHTML = '<p class="empty-state">No saved connections</p>';
    return;
  }

  connections.forEach((conn: ConnectionConfig) => {
    const card = document.createElement('div');
    card.className = 'connection-card';
    card.innerHTML = `
      <button class="delete-btn" data-id="${conn.id}">×</button>
      <h4>${conn.name}</h4>
      <p><strong>Type:</strong> ${conn.type.toUpperCase()}</p>
      <p><strong>Host:</strong> ${conn.host}:${conn.port}</p>
      <p><strong>Database:</strong> ${conn.database}</p>
    `;

    // Load connection on click
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('delete-btn')) {
        return;
      }
      loadConnectionToForm(conn);
    });

    // Auto-connect on double click
    card.addEventListener('dblclick', async (e) => {
      if ((e.target as HTMLElement).classList.contains('delete-btn')) {
        return;
      }
      loadConnectionToForm(conn);
      await connectToDatabase(conn);
    });

    // Delete button
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Delete connection "${conn.name}"?`)) {
        await window.electronAPI.deleteConnection(conn.id);
        loadSavedConnections();
      }
    });

    savedConnectionsDiv.appendChild(card);
  });
}

// Load connection into form
function loadConnectionToForm(conn: ConnectionConfig) {
  currentConnectionId = conn.id;
  connectionNameInput.value = conn.name;
  dbTypeInput.value = conn.type;
  hostInput.value = conn.host;
  portInput.value = conn.port.toString();
  databaseInput.value = conn.database;
  usernameInput.value = conn.username;
  passwordInput.value = conn.password;
}

// Get connection config from form
function getConnectionFromForm(): ConnectionConfig {
  return {
    id: currentConnectionId || generateId(),
    name: connectionNameInput.value,
    type: dbTypeInput.value as 'mssql' | 'postgresql',
    host: hostInput.value,
    port: parseInt(portInput.value),
    database: databaseInput.value,
    username: usernameInput.value,
    password: passwordInput.value
  };
}

// Generate random ID
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Show status message
function showStatus(element: HTMLDivElement, message: string, isError: boolean = false) {
  element.textContent = message;
  element.className = 'status-message ' + (isError ? 'error' : 'success');
  setTimeout(() => {
    element.className = 'status-message';
  }, 5000);
}

// Test connection
testBtn.addEventListener('click', async () => {
  const config = getConnectionFromForm();
  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';

  try {
    const result = await window.electronAPI.testConnection(config);
    if (result.success) {
      showStatus(connectionStatus, result.message || 'Connection successful!');
    } else {
      showStatus(connectionStatus, `Connection failed: ${result.error}`, true);
    }
  } catch (error) {
    showStatus(connectionStatus, `Error: ${error}`, true);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
});

// Save connection
saveBtn.addEventListener('click', async () => {
  const config = getConnectionFromForm();
  
  try {
    const result = await window.electronAPI.saveConnection(config);
    if (result.success) {
      showStatus(connectionStatus, 'Connection saved successfully!');
      currentConnectionId = config.id;
      await loadSavedConnections();
    } else {
      showStatus(connectionStatus, `Failed to save: ${result.error}`, true);
    }
  } catch (error) {
    showStatus(connectionStatus, `Error: ${error}`, true);
  }
});

// Connect to database
connectionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const config = getConnectionFromForm();
  await connectToDatabase(config);
});

async function connectToDatabase(config: ConnectionConfig) {
  const submitBtn = connectionForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = 'Connecting...';

  try {
    const result = await window.electronAPI.testConnection(config);
    if (result.success) {
      currentConnection = config;
      connectionPanel.style.display = 'none';
      queryPanel.style.display = 'block';
      connectedDbName.textContent = `Connected to: ${config.name} (${config.type.toUpperCase()})`;

      // Show schemas by default
      await openSchemaPanel();
    } else {
      showStatus(connectionStatus, `Connection failed: ${result.error}`, true);
    }
  } catch (error) {
    showStatus(connectionStatus, `Error: ${error}`, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel || 'Connect';
  }
}

// Disconnect
disconnectBtn.addEventListener('click', () => {
  currentConnection = null;
  queryPanel.style.display = 'none';
  connectionPanel.style.display = 'block';
  clearResults();
  closeSchemaPanel(true);
});

async function openSchemaPanel() {
  if (!currentConnection) return;
  if (!schemaPanel || !schemaTree || !queryLayout) return;

  queryLayout.classList.add('has-schema');
  schemaPanel.style.display = 'block';
  schemaTree.innerHTML = '<p class="empty-state">Loading schemas…</p>';

  try {
    const result = await window.electronAPI.getSchemaTree(currentConnection);
    if (result.success && result.data) {
      renderSchemaTree(result.data);
    } else {
      schemaTree.innerHTML = `<p class="empty-state">Failed to load: ${result.error || 'Unknown error'}</p>`;
    }
  } catch (err) {
    schemaTree.innerHTML = `<p class="empty-state">Error: ${String(err)}</p>`;
  }
}

function closeSchemaPanel(clearTree: boolean = false) {
  if (schemaPanel) {
    schemaPanel.style.display = 'none';
    if (clearTree && schemaTree) schemaTree.innerHTML = '';
  }
  if (queryLayout) {
    queryLayout.classList.remove('has-schema');
  }
}

// Execute query
executeBtn.addEventListener('click', async () => {
  if (!currentConnection) {
    showStatus(queryStatus, 'Not connected to a database', true);
    return;
  }

  // Get query text - either selected text or all text
  let query = '';
  const selectionStart = queryInput.selectionStart;
  const selectionEnd = queryInput.selectionEnd;
  
  if (selectionStart !== selectionEnd) {
    query = queryInput.value.substring(selectionStart, selectionEnd).trim();
  } else {
    query = queryInput.value.trim();
  }

  if (!query) {
    showStatus(queryStatus, 'Please enter a query', true);
    return;
  }

  executeBtn.disabled = true;
  executeBtn.textContent = 'Executing...';
  clearResults();

  try {
    const result = await window.electronAPI.executeQuery(currentConnection, query);
    
      if (result.success) {
        if (result.data && result.data.rows && result.data.rows.length > 0) {
          displayResults(result.data);
        } else if (result.message) {
        showStatus(queryStatus, result.message);
        } else {
        // Silent success when no results
        }
    } else {
      showStatus(queryStatus, `Query failed: ${result.error}`, true);
    }
  } catch (error) {
    showStatus(queryStatus, `Error: ${error}`, true);
  } finally {
    executeBtn.disabled = false;
    executeBtn.textContent = 'Execute Query';
  }
});

// Clear query
clearQueryBtn.addEventListener('click', () => {
  queryInput.value = '';
  updateQueryHighlight();
  clearResults();
  queryStatus.className = 'status-message';
});

// Display results in selected view
function displayResults(data: { columns: string[]; rows: any[]; rowCount: number }) {
  lastQueryResult = data;
  resultsSection.style.display = 'block';

  if (resultViewMode === 'table') {
    // Clear and render table
    if (resultsTableHead && resultsTableBody && resultsTableContainer) {
      resultsTableHead.innerHTML = '';
      resultsTableBody.innerHTML = '';

      const headerRow = document.createElement('tr');
      data.columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
      });
      resultsTableHead.appendChild(headerRow);

      data.rows.forEach(row => {
        const tr = document.createElement('tr');
        data.columns.forEach(col => {
          const td = document.createElement('td');
          const value = row[col];
          td.textContent = value !== null && value !== undefined ? String(value) : 'NULL';
          tr.appendChild(td);
        });
        resultsTableBody.appendChild(tr);
      });

      resultsTableContainer.style.display = 'block';
    }
    if (resultsJsonContainer) resultsJsonContainer.style.display = 'none';
    if (resultsCsvContainer) resultsCsvContainer.style.display = 'none';
  } else if (resultViewMode === 'json') {
    if (resultsJsonPre && resultsJsonContainer) {
      resultsJsonPre.textContent = JSON.stringify(data.rows, null, 2);
      resultsJsonContainer.style.display = 'block';
    }
    if (resultsTableContainer) resultsTableContainer.style.display = 'none';
    if (resultsCsvContainer) resultsCsvContainer.style.display = 'none';
  } else if (resultViewMode === 'csv') {
    if (resultsCsvPre && resultsCsvContainer) {
      resultsCsvPre.textContent = toCsv(data.columns, data.rows);
      resultsCsvContainer.style.display = 'block';
    }
    if (resultsTableContainer) resultsTableContainer.style.display = 'none';
    if (resultsJsonContainer) resultsJsonContainer.style.display = 'none';
  }
}

// Clear results
function clearResults() {
  resultsTableHead.innerHTML = '';
  resultsTableBody.innerHTML = '';
  if (resultsJsonPre) resultsJsonPre.textContent = '';
  if (resultsCsvPre) resultsCsvPre.textContent = '';
  if (resultsTableContainer) resultsTableContainer.style.display = 'none';
  if (resultsJsonContainer) resultsJsonContainer.style.display = 'none';
  if (resultsCsvContainer) resultsCsvContainer.style.display = 'none';
  resultsSection.style.display = 'none';
  lastQueryResult = null;
}

function renderSchemaTree(schemas: SchemaInfo[]) {
  if (!schemaTree) return;
  const container = document.createElement('div');
  schemas.forEach((schema) => {
    const schemaDetails = document.createElement('details');
    schemaDetails.open = false;
    const schemaSummary = document.createElement('summary');
    schemaSummary.textContent = schema.name;
    schemaDetails.appendChild(schemaSummary);

    const tablesList = document.createElement('div');
    schema.tables.forEach((table) => {
      const tableDetails = document.createElement('details');
      tableDetails.open = false;
      const tableSummary = document.createElement('summary');
      tableSummary.textContent = table.name;
      tableSummary.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        insertTableSelectIntoQuery(schema.name, table.name);
      });
      tableDetails.appendChild(tableSummary);

      const colsList = document.createElement('ul');
      table.columns.forEach((col) => {
        const li = document.createElement('li');
        li.textContent = col.dataType ? `${col.name} (${col.dataType})` : col.name;
        colsList.appendChild(li);
      });
      tableDetails.appendChild(colsList);
      tablesList.appendChild(tableDetails);
    });

    schemaDetails.appendChild(tablesList);
    container.appendChild(schemaDetails);
  });
  schemaTree.innerHTML = '';
  schemaTree.appendChild(container);
}

function insertTableSelectIntoQuery(schemaName: string, tableName: string) {
  const qualifiedName = qualifyTableName(schemaName, tableName);
  const snippet = `SELECT *\nFROM ${qualifiedName};\n`;
  insertIntoQuery(snippet);
}

function qualifyTableName(schemaName: string, tableName: string): string {
  const dbType = currentConnection?.type;
  if (dbType === 'mssql') {
    const q = (part: string) => `[${part.replace(/\]/g, ']]')}]`;
    return schemaName ? `${q(schemaName)}.${q(tableName)}` : q(tableName);
  }

  // Default to PostgreSQL-style identifier quoting
  const q = (part: string) => `"${part.replace(/"/g, '""')}"`;
  return schemaName ? `${q(schemaName)}.${q(tableName)}` : q(tableName);
}

function insertIntoQuery(text: string) {
  if (!queryInput) return;

  const start = queryInput.selectionStart ?? queryInput.value.length;
  const end = queryInput.selectionEnd ?? queryInput.value.length;

  const before = queryInput.value.slice(0, start);
  const after = queryInput.value.slice(end);

  const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
  const insertion = (needsLeadingNewline ? '\n' : '') + text;

  queryInput.value = before + insertion + after;

  const newCursorPos = (before + insertion).length;
  queryInput.focus();
  queryInput.setSelectionRange(newCursorPos, newCursorPos);

  updateQueryHighlight();
  syncScrollPosition();
}

function updateQueryHighlight() {
  if (!queryHighlight) return;
  queryHighlight.innerHTML = highlightSql(queryInput.value);
}

function syncScrollPosition() {
  if (!queryHighlight) return;
  const highlighter = queryHighlight.parentElement;
  if (!highlighter) return;
  highlighter.scrollTop = queryInput.scrollTop;
  highlighter.scrollLeft = queryInput.scrollLeft;
}

function highlightSql(sql: string): string {
  const keywords = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'HAVING', 'INSERT', 'INTO', 'VALUES',
    'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'VIEW', 'INDEX', 'JOIN',
    'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'DISTINCT', 'UNION', 'ALL', 'LIMIT',
    'OFFSET', 'TOP', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'EXISTS', 'LIKE', 'CASE',
    'WHEN', 'THEN', 'ELSE', 'END', 'RETURNING'
  ]);

  const builtins = new Set([
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NOW', 'COALESCE', 'CAST', 'CONVERT', 'ROW_NUMBER'
  ]);

  const tokens: string[] = [];
  let lastIndex = 0;
  const regex = /(--.*?$|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"[^"]*"|\b\d+(?:\.\d+)?\b|\b[a-z_][\w]*\b)/gim;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sql)) !== null) {
    const matchText = match[0];
    tokens.push(escapeHtml(sql.slice(lastIndex, match.index)));

    const upper = matchText.toUpperCase();
    let cls = '';

    if (matchText.startsWith('--') || matchText.startsWith('/*')) {
      cls = 'comment';
    } else if (matchText.startsWith("'") || matchText.startsWith('"')) {
      cls = 'string';
    } else if (/^\d/.test(matchText)) {
      cls = 'number';
    } else if (keywords.has(upper)) {
      cls = 'keyword';
    } else if (builtins.has(upper)) {
      cls = 'builtin';
    }

    if (cls) {
      tokens.push(`<span class="sql-${cls}">${escapeHtml(matchText)}</span>`);
    } else {
      tokens.push(escapeHtml(matchText));
    }

    lastIndex = regex.lastIndex;
  }

  tokens.push(escapeHtml(sql.slice(lastIndex)));
  return tokens.join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Theme management
function initializeTheme() {
  const savedTheme = (localStorage.getItem('theme') || 'dark') as 'light' | 'dark';
  setTheme(savedTheme);
}

function setTheme(theme: 'light' | 'dark') {
  const htmlElement = document.documentElement;
  htmlElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const htmlElement = document.documentElement;
  const currentTheme = (htmlElement.getAttribute('data-theme') || 'dark') as 'light' | 'dark';
  const newTheme: 'light' | 'dark' = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme as 'light' | 'dark');
}

function setResultViewMode(mode: 'table' | 'json' | 'csv') {
  resultViewMode = mode;
  localStorage.setItem('resultViewMode', mode);
  // Update segmented button active states
  if (viewTableBtn) viewTableBtn.classList.toggle('active', mode === 'table');
  if (viewJsonBtn) viewJsonBtn.classList.toggle('active', mode === 'json');
  if (viewCsvBtn) viewCsvBtn.classList.toggle('active', mode === 'csv');

  // Re-render if we have data
  if (lastQueryResult) {
    displayResults(lastQueryResult);
  }
}

function toCsv(columns: string[], rows: any[]): string {
  const escape = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    const needsQuotes = /[",\n\r]/.test(str);
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? '"' + escaped + '"' : escaped;
  };
  const header = columns.map(escape).join(',');
  const body = rows.map(row => columns.map(col => escape(row[col])).join(',')).join('\n');
  return body ? header + '\n' + body : header + '\n';
}
