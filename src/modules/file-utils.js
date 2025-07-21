export class FileUtils {
    constructor() {
        this.videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ogv'];
    }

    isValidVideoFile(filePath) {
        const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return this.videoExtensions.includes(extension);
    }

    getExtractionOptions(outputFormat, settings) {
        const options = {
            outputFormat: outputFormat,
            outputDir: settings.outputDirectory || null
        };

        switch (outputFormat) {
            case 'flac':
                options.quality = 0;
                break;
            case 'mp3':
                options.quality = settings.mp3Quality;
                break;
            case 'aac':
                options.quality = settings.aacQuality;
                break;
            case 'ogg':
                options.quality = settings.oggQuality;
                break;
            case 'wav':
                // WAV doesn't need quality setting
                break;
        }

        return options;
    }

    validateFilePaths(filePaths) {
        return filePaths.filter(path => this.isValidVideoFile(path));
    }

    getFileName(filePath) {
        return filePath.split(/[\\/]/).pop();
    }

    getSupportedFormats() {
        return ['flac', 'wav', 'mp3', 'aac', 'ogg'];
    }

    getVideoExtensions() {
        return [...this.videoExtensions];
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileExtension(filePath) {
        return filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    }

    isAudioFormat(format) {
        return this.getSupportedFormats().includes(format.toLowerCase());
    }
}