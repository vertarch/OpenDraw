const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const Path = require('path');

let Win = null;
let TrayIcon = null;
let DrawMode = false;

function CreateWindow() {
  const Primary = screen.getPrimaryDisplay();
  const { x, y, width, height } = Primary.bounds;

  Win = new BrowserWindow({
    x, y, width, height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    focusable: true,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: Path.join(__dirname, 'Preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  Win.setAlwaysOnTop(true, 'screen-saver');
  Win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  Win.loadFile('Index.html');

  Win.webContents.on('render-process-gone', (Event, Details) => {
    console.log('[!] Render process gone: ' + JSON.stringify(Details));
  });

  SetDrawMode(false);

  screen.on('display-metrics-changed', ResizeToPrimary);
  screen.on('display-added', ResizeToPrimary);
  screen.on('display-removed', ResizeToPrimary);

  Win.on('closed', () => { Win = null; });
}

function ResizeToPrimary() {
  if (!Win) return;
  const Primary = screen.getPrimaryDisplay();
  const { x, y, width, height } = Primary.bounds;
  Win.setBounds({ x, y, width, height });
  Win.webContents.send('Resized');
}

function SetDrawMode(On) {
  if (!Win) return;
  DrawMode = On;
  if (On) {
    Win.setIgnoreMouseEvents(false);
    Win.setAlwaysOnTop(true, 'screen-saver');
    Win.focus();
  } else {
    Win.setIgnoreMouseEvents(true, { forward: true });
  }
  Win.webContents.send('DrawMode', DrawMode);
  UpdateTray();
}

function ToggleDrawMode() {
  SetDrawMode(!DrawMode);
}

function BuildTrayIcon() {
  const PNG =
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAlElEQVR4nGNgGAWjYBSMglEw' +
    'CkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApG' +
    'wSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEo' +
    'GAWjYBSMglEwCkbBKBgFo2AUjIJRAAB7VwGBs6q1MQAAAABJRU5ErkJggg==';
  return nativeImage.createFromDataURL('data:image/png;base64,' + PNG);
}

function UpdateTray() {
  if (!TrayIcon) return;
  const TrayMenu = Menu.buildFromTemplate([
    {
      label: DrawMode ? 'Draw mode: ON  (Ctrl+Alt+D)' : 'Pass-through: ON  (Ctrl+Alt+D)',
      click: ToggleDrawMode
    },
    { type: 'separator' },
    { label: 'Clear screen  (Ctrl+Alt+C)', click: () => Win && Win.webContents.send('Clear') },
    { label: 'Undo  (Ctrl+Z)', click: () => Win && Win.webContents.send('Undo') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  TrayIcon.setToolTip(DrawMode ? 'OpenDraw — drawing' : 'OpenDraw — pass-through');
  TrayIcon.setContextMenu(TrayMenu);
}

function CreateTray() {
  TrayIcon = new Tray(BuildTrayIcon());
  TrayIcon.on('click', ToggleDrawMode);
  UpdateTray();
}

function RegisterShortcuts() {
  globalShortcut.register('Control+Alt+D', ToggleDrawMode);
  globalShortcut.register('Control+Alt+C', () => Win && Win.webContents.send('Clear'));
  globalShortcut.register('Control+Alt+E', () => Win && Win.webContents.send('Tool', 'Eraser'));
  globalShortcut.register('Control+Alt+P', () => Win && Win.webContents.send('Tool', 'Pen'));
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  CreateWindow();
  CreateTray();
  RegisterShortcuts();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) CreateWindow();
  });
  console.log('[+] OpenDraw ready');
});

ipcMain.on('SetDrawMode', (Event, On) => SetDrawMode(!!On));
ipcMain.on('ToggleDrawMode', () => ToggleDrawMode());
ipcMain.on('Quit', () => app.quit());
ipcMain.on('SetIgnoreMouse', (Event, Ignore) => {
  if (!Win) return;
  Win.setIgnoreMouseEvents(!!Ignore, { forward: true });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {});
