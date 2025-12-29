export interface ConnectionConfig {
  id: string;
  name: string;
  type: 'mssql' | 'postgresql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface ColumnInfo {
  name: string;
  dataType?: string;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface SchemaInfo {
  name: string;
  tables: TableInfo[];
}

declare global {
  interface Window {
    electronAPI: {
      getConnections: () => Promise<ConnectionConfig[]>;
      saveConnection: (connection: ConnectionConfig) => Promise<{ success: boolean; error?: string }>;
      deleteConnection: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
      testConnection: (config: ConnectionConfig) => Promise<{ success: boolean; message?: string; error?: string }>;
      executeQuery: (config: ConnectionConfig, query: string) => Promise<{
        success: boolean;
        data?: { columns: string[]; rows: any[]; rowCount: number };
        message?: string;
        error?: string;
      }>;
      getSchemaTree: (config: ConnectionConfig) => Promise<{
        success: boolean;
        data?: SchemaInfo[];
        error?: string;
      }>;
    };
  }
}

export {};
