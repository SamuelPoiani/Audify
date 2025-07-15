const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  extractAudio: (filePath, options) => ipcRenderer.invoke('extract-audio', filePath, options),
  showError: (title, message) => ipcRenderer.invoke('show-error', title, message),
  
  onExtractionStarted: (callback) => ipcRenderer.on('extraction-started', callback),
  onExtractionProgress: (callback) => ipcRenderer.on('extraction-progress', callback),
  onExtractionCompleted: (callback) => ipcRenderer.on('extraction-completed', callback),
  onExtractionError: (callback) => ipcRenderer.on('extraction-error', callback),
  
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // File path helper for drag & drop
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (error) {
      console.error('Error getting file path:', error);
      return null;
    }
  }
});