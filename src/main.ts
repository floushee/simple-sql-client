import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as mssql from 'mssql';
import { Client as PgClient } from 'pg';

// Disable hardware acceleration to avoid Vulkan driver issues on Linux
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
const CONNECTIONS_FILE = path.join(app.getPath('userData'), 'connections.json');

interface ConnectionConfig {
  id: string;
  name: string;
  type: 'mssql' | 'postgresql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
  
  // Open dev tools to debug
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Load saved connections
ipcMain.handle('get-connections', async () => {
  try {
    if (fs.existsSync(CONNECTIONS_FILE)) {
      const data = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading connections:', error);
    return [];
  }
});

// Save connection
ipcMain.handle('save-connection', async (event, connection: ConnectionConfig) => {
  try {
    let connections: ConnectionConfig[] = [];
    if (fs.existsSync(CONNECTIONS_FILE)) {
      const data = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
      connections = JSON.parse(data);
    }
    
    // Check if connection with same id exists
    const existingIndex = connections.findIndex(c => c.id === connection.id);
    if (existingIndex >= 0) {
      connections[existingIndex] = connection;
    } else {
      connections.push(connection);
    }
    
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Delete connection
ipcMain.handle('delete-connection', async (event, connectionId: string) => {
  try {
    if (fs.existsSync(CONNECTIONS_FILE)) {
      const data = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');
      let connections: ConnectionConfig[] = JSON.parse(data);
      connections = connections.filter(c => c.id !== connectionId);
      fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Test connection
ipcMain.handle('test-connection', async (event, config: ConnectionConfig) => {
  try {
    if (config.type === 'mssql') {
      const pool = await mssql.connect({
        server: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        options: {
          encrypt: false,
          trustServerCertificate: true
        }
      });
      await pool.close();
      return { success: true, message: 'Connection successful!' };
    } else if (config.type === 'postgresql') {
      const client = new PgClient({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password
      });
      await client.connect();
      await client.end();
      return { success: true, message: 'Connection successful!' };
    }
    return { success: false, error: 'Unsupported database type' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Execute query
ipcMain.handle('execute-query', async (event, config: ConnectionConfig, query: string) => {
  try {
    if (config.type === 'mssql') {
      const pool = await mssql.connect({
        server: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        options: {
          encrypt: false,
          trustServerCertificate: true
        }
      });
      
      const result = await pool.request().query(query);
      await pool.close();
      
      if (result.recordset && result.recordset.length > 0) {
        const columns = Object.keys(result.recordset[0]);
        return {
          success: true,
          data: {
            columns,
            rows: result.recordset,
            rowCount: result.recordset.length
          }
        };
      } else {
        return {
          success: true,
          data: {
            columns: [],
            rows: [],
            rowCount: result.rowsAffected[0] || 0
          },
          message: `Query executed successfully. ${result.rowsAffected[0] || 0} row(s) affected.`
        };
      }
    } else if (config.type === 'postgresql') {
      const client = new PgClient({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password
      });
      
      await client.connect();
      const result = await client.query(query);
      await client.end();
      
      if (result.rows && result.rows.length > 0) {
        const columns = Object.keys(result.rows[0]);
        return {
          success: true,
          data: {
            columns,
            rows: result.rows,
            rowCount: result.rowCount || 0
          }
        };
      } else {
        return {
          success: true,
          data: {
            columns: [],
            rows: [],
            rowCount: result.rowCount || 0
          },
          message: `Query executed successfully. ${result.rowCount || 0} row(s) affected.`
        };
      }
    }
    return { success: false, error: 'Unsupported database type' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
