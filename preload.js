/**
 * Electron preload script
 * Provides secure bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Get app data path for storing files
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    // Get environment variables
    getEnvVars: () => ipcRenderer.invoke('get-env-vars'),
    
    // Show save dialog
    showSaveDialog: (defaultFileName) => ipcRenderer.invoke('show-save-dialog', defaultFileName),
    
    // Listen for menu events
    onMenuExportData: (callback) => {
        ipcRenderer.on('menu-export-data', callback);
    },
    
    onMenuImportData: (callback) => {
        ipcRenderer.on('menu-import-data', (event, filePath) => callback(filePath));
    },
    
    // Check if running in Electron
    isElectron: true,
    
    // Platform information
    platform: process.platform
});