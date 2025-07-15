# Audify

A modern Electron desktop application for extracting high-quality audio from video files with comprehensive format support and customizable output options.

## Features

- **Multi-format video support**: MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, 3GP, OGV
- **Multiple audio output formats**: FLAC (lossless), WAV (uncompressed), MP3, AAC, OGG Vorbis
- **Batch processing** with intelligent queue management and progress tracking
- **Comprehensive settings system** with persistent configuration
- **Custom output directory** selection with fallback to source location
- **Quality control** with format-specific bitrate and quality settings
- **Cross-platform support** (Windows, macOS, Linux)
- **Clean, dark-themed interface** with intuitive navigation
- **Real-time progress tracking** with visual status indicators

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd audify

# Install dependencies
npm install

# Run in development mode
npm start

# Run with developer tools enabled
npm run dev
```

### Building for Production
```bash
# Build for all platforms
npm run build

# Platform-specific builds
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# Create distributable packages
npm run dist

# Package without creating installers
npm run pack
```

## Usage

### Basic Audio Extraction
1. Launch Audify
2. Drag and drop video files onto the main window or click to select files
3. Choose your desired output format (FLAC, WAV, MP3, AAC, or OGG)
4. Files will be processed automatically in sequence

### Batch Processing
- Select multiple video files at once
- Monitor progress in the processing queue
- Each file shows individual status and progress
- Configurable delays between file processing (0-3 seconds)

### Settings Configuration
Access the settings screen via the gear icon in the titlebar to configure:

#### Output Settings
- **Default Output Format**: Choose your preferred audio format
- **Output Directory**: Set a custom save location (defaults to source file location)

#### Quality Settings
- **MP3 Bitrate**: 128, 192, 256, or 320 kbps
- **AAC Bitrate**: 128, 192, 256, or 320 kbps  
- **OGG Quality**: Levels 3-9 (3=~112kbps, 5=~160kbps, 7=~192kbps, 9=~256kbps)

#### Processing Settings
- **Processing Delay**: Time between file processing (0-3 seconds)
- **Overwrite Files**: Choose whether to overwrite existing output files

## Supported Formats

### Input Video Formats
- MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, 3GP, OGV

### Output Audio Formats
- **FLAC**: Lossless compression, best for archival
- **WAV**: Uncompressed, maximum compatibility
- **MP3**: Lossy compression, universal compatibility
- **AAC**: Efficient lossy compression, good for streaming
- **OGG Vorbis**: Open-source lossy compression

## Technical Details

### Architecture
- **Electron 37.2.1** with Node.js runtime
- **Main Process** (`src/main.js`): Window management and IPC handlers
- **Renderer Process** (`src/renderer.js`): UI logic and user interactions
- **Preload Script** (`src/preload.js`): Secure IPC bridge
- **Security**: Context isolation enabled, node integration disabled

### Audio Processing
- **FFmpeg Integration**: Uses fluent-ffmpeg with static binaries
- **Multi-codec Support**: Dynamic codec selection based on output format
- **Quality Optimization**: Format-specific quality settings
- **Cross-platform**: Bundled FFmpeg binaries for Windows, macOS, and Linux

### Data Storage
- **Settings Persistence**: localStorage for user preferences
- **Configuration Schema**: JSON-based with validation and defaults
- **Real-time Sync**: UI updates reflect saved preferences immediately

## Development

### Project Structure
```
audify/
├── src/
│   ├── index.html      # Main HTML template
│   ├── main.js         # Electron main process
│   ├── preload.js      # IPC bridge script
│   ├── renderer.js     # UI logic and interactions
│   └── styles.css      # Application styles
├── dist/               # Build output
├── node_modules/       # Dependencies
├── package.json        # Project configuration
└── README.md          # This file
```

### Key Dependencies
- **electron**: Desktop app framework
- **fluent-ffmpeg**: FFmpeg wrapper for audio processing
- **ffmpeg-static**: Static FFmpeg binaries
- **electron-builder**: Application packaging and distribution

### Scripts
- `npm start`: Run in development mode
- `npm run dev`: Run with developer tools
- `npm run build`: Build for all platforms
- `npm run dist`: Create distributable packages

## Troubleshooting

### Common Issues
- **FFmpeg not found**: The app bundles FFmpeg automatically, but ensure your system allows the executable to run
- **File format not supported**: Check that your video file uses one of the supported formats
- **Permission errors**: Ensure the app has write permissions to the output directory

### Error Handling
- Files that fail to process will show error status in the queue
- Processing continues with remaining files after errors
- Detailed error messages help identify specific issues

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues, feature requests, or questions, please open an issue on the project repository.