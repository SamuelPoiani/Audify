const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 700,
    height: 650,
    minWidth: 500,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    show: false,
    resizable: true,
    autoHideMenuBar: true,
    frame: false,
    vibrancy: 'dark',
    visualEffectState: 'active'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return null;
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('extract-audio', async (event, filePath, options = {}) => {
  if (!filePath) {
    throw new Error('No file path provided');
  }
  
  const { outputFormat = 'flac', outputDir = null, quality = 0 } = options;
  
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath, path.extname(filePath));
    const targetDir = outputDir || path.dirname(filePath);
    const outputPath = path.join(targetDir, `${fileName}.${outputFormat}`);

    let ffmpegCommand = ffmpeg(filePath).noVideo();
    
    // Configure audio codec and quality based on format
    switch (outputFormat.toLowerCase()) {
      case 'flac':
        ffmpegCommand = ffmpegCommand.audioCodec('flac').audioQuality(quality);
        break;
      case 'wav':
        ffmpegCommand = ffmpegCommand.audioCodec('pcm_s16le');
        break;
      case 'mp3':
        ffmpegCommand = ffmpegCommand.audioCodec('libmp3lame').audioBitrate(quality || 320);
        break;
      case 'aac':
        ffmpegCommand = ffmpegCommand.audioCodec('aac').audioBitrate(quality || 256);
        break;
      case 'ogg':
        ffmpegCommand = ffmpegCommand.audioCodec('libvorbis').audioQuality(quality || 5);
        break;
      default:
        ffmpegCommand = ffmpegCommand.audioCodec('flac').audioQuality(0);
    }

    ffmpegCommand
      .on('start', (commandLine) => {
        console.log('Started FFmpeg with command: ' + commandLine);
        event.sender.send('extraction-started', { input: filePath, output: outputPath });
      })
      .on('progress', (progress) => {
        event.sender.send('extraction-progress', progress);
      })
      .on('end', () => {
        console.log('Audio extraction completed');
        event.sender.send('extraction-completed', { output: outputPath });
        resolve({ success: true, outputPath });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        event.sender.send('extraction-error', { error: err.message });
        reject(err);
      })
      .save(outputPath);
  });
});

ipcMain.handle('show-error', async (event, title, message) => {
  dialog.showErrorBox(title, message);
});

// Window controls
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return mainWindow.isMaximized();
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow.isMaximized();
});

// Set FFmpeg path based on environment (dev vs production)
function setFfmpegPath() {
  if (app.isPackaged) {
    // In production, use the extracted binary from extraResources
    const resourcesPath = process.resourcesPath;
    let ffmpegPath;
    
    if (process.platform === 'win32') {
      ffmpegPath = path.join(resourcesPath, 'ffmpeg-static', 'ffmpeg.exe');
    } else if (process.platform === 'darwin') {
      ffmpegPath = path.join(resourcesPath, 'ffmpeg-static', 'ffmpeg');
    } else {
      ffmpegPath = path.join(resourcesPath, 'ffmpeg-static', 'ffmpeg');
    }
    
    console.log('Production FFmpeg path:', ffmpegPath);
    console.log('FFmpeg exists:', fs.existsSync(ffmpegPath));
    
    ffmpeg.setFfmpegPath(ffmpegPath);
  } else {
    // In development, use the npm package
    const ffmpegStatic = require('ffmpeg-static');
    console.log('Development FFmpeg path:', ffmpegStatic);
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }
}

setFfmpegPath();