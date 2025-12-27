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
    };
  }
}

export {};
