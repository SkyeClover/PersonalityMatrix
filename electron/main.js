const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const OURA_BASE = 'https://api.ouraring.com/v2/usercollection';

async function ouraFetch(token, pathname, startDate, endDate) {
  const url = `${OURA_BASE}${pathname}?start_date=${startDate}&end_date=${endDate}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

ipcMain.handle('oura-fetch', async (_, { token, startDate, endDate }) => {
  const [daily_sleep, daily_readiness, daily_activity] = await Promise.all([
    ouraFetch(token, '/daily_sleep', startDate, endDate).catch((e) => ({ data: [] })),
    ouraFetch(token, '/daily_readiness', startDate, endDate).catch((e) => ({ data: [] })),
    ouraFetch(token, '/daily_activity', startDate, endDate).catch((e) => ({ data: [] })),
  ]);
  return { daily_sleep, daily_readiness, daily_activity };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Personality Matrix',
  });

  const isDev = process.env.NODE_ENV !== 'production' || process.argv.includes('--dev');
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
