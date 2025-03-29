const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const prompt = require('electron-prompt');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));
}

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('show-prompt', async (event, options) => {
  return prompt({
    title: options.title,
    label: options.message,
    value: options.input || '',
    inputAttrs: { type: 'text' },
    type: 'input'
  });
});

app.whenReady().then(createWindow);