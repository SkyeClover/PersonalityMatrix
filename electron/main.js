const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const OURA_BASE = 'https://api.ouraring.com/v2/usercollection';

async function ouraFetchPage(token, pathname, startDate, endDate, nextToken = null) {
  let url = `${OURA_BASE}${pathname}?start_date=${startDate}&end_date=${endDate}`;
  if (nextToken) url += `&next_token=${encodeURIComponent(nextToken)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function ouraFetchAll(token, pathname, startDate, endDate) {
  const allData = [];
  let nextToken = null;
  do {
    const json = await ouraFetchPage(token, pathname, startDate, endDate, nextToken);
    if (json.data && Array.isArray(json.data)) allData.push(...json.data);
    nextToken = json.next_token || null;
  } while (nextToken);
  return allData;
}

ipcMain.handle('oura-fetch', async (_, { token, startDate, endDate }) => {
  const errors = [];
  let daily_sleep = { data: [] };
  let daily_readiness = { data: [] };
  let daily_activity = { data: [] };
  try {
    daily_sleep.data = await ouraFetchAll(token, '/daily_sleep', startDate, endDate);
  } catch (e) {
    daily_sleep.error = e.message;
    errors.push('Sleep');
  }
  try {
    daily_readiness.data = await ouraFetchAll(token, '/daily_readiness', startDate, endDate);
  } catch (e) {
    daily_readiness.error = e.message;
    errors.push('Readiness');
  }
  try {
    daily_activity.data = await ouraFetchAll(token, '/daily_activity', startDate, endDate);
  } catch (e) {
    daily_activity.error = e.message;
    errors.push('Activity');
  }
  return { daily_sleep, daily_readiness, daily_activity, errors };
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
