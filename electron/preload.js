// Preload script for security
// This file runs in the renderer process before the web content begins loading

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you need to expose to the renderer process here
  platform: process.platform,
  versions: process.versions
});