import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getConnections: () => ipcRenderer.invoke('get-connections'),
  saveConnection: (connection: any) => ipcRenderer.invoke('save-connection', connection),
  deleteConnection: (connectionId: string) => ipcRenderer.invoke('delete-connection', connectionId),
  testConnection: (config: any) => ipcRenderer.invoke('test-connection', config),
  executeQuery: (config: any, query: string) => ipcRenderer.invoke('execute-query', config, query)
});
