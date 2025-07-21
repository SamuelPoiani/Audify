# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Audify is an Electron desktop application for extracting high-quality audio from video files. It supports multiple video formats (MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, 3GP, OGV) and outputs to various audio formats (FLAC, WAV, MP3, AAC, OGG Vorbis) with batch processing capabilities.

## Development Commands
- `npm start` - Run in development mode
- `npm run dev` - Run with developer tools enabled
- `npm run build` - Build for all platforms (Windows, macOS, Linux)
- `npm run build:win` - Build for Windows only  
- `npm run build:mac` - Build for macOS only
- `npm run build:linux` - Build for Linux only
- `npm run dist` - Create distributable packages
- `npm run pack` - Package without creating installers

Note: There are currently no test commands configured in package.json.

## Architecture

### Core Components
- **Main Process** (`src/main.js`): Electron main process handling window management, IPC handlers for file selection, audio extraction via FFmpeg, and window controls
- **Renderer Process** (`src/renderer.js`): Single-page application class `AudifyApp` managing UI state, batch processing queue, progress tracking, and settings persistence
- **Preload Script** (`src/preload.js`): Secure IPC bridge exposing electron APIs to renderer via `contextBridge`
- **UI** (`src/index.html` + `src/styles.css`): Dark-themed interface with drag-drop support, progress indicators, and settings panel

### Security Model
- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication via contextBridge

### Audio Processing Pipeline
- Uses `fluent-ffmpeg` with `ffmpeg-static` for cross-platform FFmpeg binaries
- Dynamic codec selection based on output format
- Format-specific quality settings (bitrate for MP3/AAC, quality levels for OGG, lossless for FLAC/WAV)
- Real-time progress reporting via IPC events

### State Management
- Queue-based batch processing with status tracking (pending, processing, completed, error)
- Navigation history system for UI state restoration
- Settings persistence via localStorage with JSON schema
- Progress tracking at both file and overall queue level

### Key Data Structures
- File Queue: Array of objects with `{path, name, status, progress, error?, outputPath?}`
- Settings: `{outputFormat, outputDirectory, mp3Quality, aacQuality, oggQuality, processingDelay, overwriteFiles}`
- History: Array of state snapshots for navigation

## Important Implementation Details

### FFmpeg Path Resolution
The app handles FFmpeg binary paths differently between development and production:
- Development: Uses `ffmpeg-static` npm package
- Production: Extracts FFmpeg binaries to `extraResources` during build, accesses via `process.resourcesPath`

### IPC Event Flow
1. File selection → `select-file` → returns file paths array
2. Audio extraction → `extract-audio` → triggers progress events → completion/error events
3. Window controls → `window-minimize/maximize/close` → window state changes

### Error Handling
- File validation for supported video formats before processing
- Graceful error handling continues processing remaining files in queue
- User-friendly error dialogs for system-level issues

### Build Configuration
- Uses `electron-builder` with platform-specific targets (NSIS for Windows, DMG for macOS, AppImage for Linux)
- FFmpeg binaries bundled as `extraResources` to avoid packaging in asar archive
- Custom artifact naming and icon handling per platform