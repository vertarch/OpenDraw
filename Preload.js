const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('OpenDraw', {
  SetDrawMode: (On) => ipcRenderer.send('SetDrawMode', On),
  ToggleDrawMode: () => ipcRenderer.send('ToggleDrawMode'),
  SetIgnoreMouse: (Ignore) => ipcRenderer.send('SetIgnoreMouse', Ignore),
  Quit: () => ipcRenderer.send('Quit'),

  OnDrawMode: (Callback) => ipcRenderer.on('DrawMode', (Event, On) => Callback(On)),
  OnClear: (Callback) => ipcRenderer.on('Clear', () => Callback()),
  OnUndo: (Callback) => ipcRenderer.on('Undo', () => Callback()),
  OnTool: (Callback) => ipcRenderer.on('Tool', (Event, Tool) => Callback(Tool)),
  OnResized: (Callback) => ipcRenderer.on('Resized', () => Callback())
});
