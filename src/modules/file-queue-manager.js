export class FileQueueManager {
    constructor(uiManager, fileUtils, settingsManager, onQueueUpdate) {
        this.uiManager = uiManager;
        this.fileUtils = fileUtils;
        this.settingsManager = settingsManager;
        this.onQueueUpdate = onQueueUpdate;
        
        this.fileQueue = [];
        this.currentFileIndex = -1;
        this.isProcessing = false;
    }

    handleMultipleFiles(filePaths) {
        const validFiles = filePaths.filter(path => this.fileUtils.isValidVideoFile(path));

        if (validFiles.length === 0) {
            window.electronAPI.showError('Invalid Files', 
                'Please select video files (MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, 3GP, OGV).');
            return;
        }

        this.fileQueue = validFiles.map(filePath => ({
            path: filePath,
            name: filePath.split(/[\\/]/).pop(),
            status: 'pending',
            progress: 0
        }));

        this.currentFileIndex = 0;
        this.uiManager.showQueue();
        this.updateQueueDisplay();
        this.updateOverallProgress();
        this.onQueueUpdate?.('queue-started', `Processing ${this.fileQueue.length} files`);
        
        this.processCurrentFile();
    }

    addFilesToQueue(filePaths) {
        const validFiles = filePaths.filter(path => this.fileUtils.isValidVideoFile(path));
        
        if (validFiles.length === 0) {
            return;
        }
        
        const newFiles = validFiles.map(filePath => ({
            path: filePath,
            name: filePath.split(/[\\/]/).pop(),
            status: 'pending',
            progress: 0
        }));
        
        this.fileQueue.push(...newFiles);
        
        this.onQueueUpdate?.('queue-updated', `Added ${newFiles.length} files to queue`);
        this.updateQueueDisplay();
        this.updateOverallProgress();
        
        if (!this.isProcessing && this.currentFileIndex < 0) {
            this.currentFileIndex = this.fileQueue.findIndex(file => file.status === 'pending');
            if (this.currentFileIndex >= 0) {
                this.processCurrentFile();
            }
        }
    }

    async processCurrentFile() {
        if (this.currentFileIndex < 0 || this.currentFileIndex >= this.fileQueue.length) {
            return;
        }

        this.isProcessing = true;
        const currentFile = this.fileQueue[this.currentFileIndex];
        currentFile.status = 'processing';

        this.updateQueueDisplay();
        this.updateOverallProgress();

        try {
            const options = this.fileUtils.getExtractionOptions(
                this.uiManager.elements.outputFormat.value,
                this.settingsManager.getSettings()
            );
            await window.electronAPI.extractAudio(currentFile.path, options);
        } catch (error) {
            this.onFileError(error.message);
        }
    }

    onExtractionProgress(progress) {
        if (progress.percent) {
            const percentage = Math.round(progress.percent);
            
            if (this.currentFileIndex >= 0 && this.currentFileIndex < this.fileQueue.length) {
                this.fileQueue[this.currentFileIndex].progress = percentage;
                this.updateQueueDisplay();
                this.updateOverallProgress();
            }
        }
    }

    onFileCompleted(outputPath) {
        if (this.currentFileIndex >= 0 && this.currentFileIndex < this.fileQueue.length) {
            this.fileQueue[this.currentFileIndex].status = 'completed';
            this.fileQueue[this.currentFileIndex].outputPath = outputPath;
            this.fileQueue[this.currentFileIndex].progress = 100;
        }

        this.updateQueueDisplay();
        this.updateOverallProgress();
        this.isProcessing = false;

        if (this.currentFileIndex + 1 < this.fileQueue.length) {
            setTimeout(() => {
                this.currentFileIndex++;
                this.processCurrentFile();
            }, this.settingsManager.getSettings().processingDelay * 1000);
        } else {
            this.onQueueUpdate?.('queue-completed', 'All files processed');
        }
    }

    onFileError(errorMessage) {
        if (this.currentFileIndex >= 0 && this.currentFileIndex < this.fileQueue.length) {
            this.fileQueue[this.currentFileIndex].status = 'error';
            this.fileQueue[this.currentFileIndex].error = errorMessage;
        }

        this.updateQueueDisplay();
        this.updateOverallProgress();
        this.isProcessing = false;

        if (this.currentFileIndex + 1 < this.fileQueue.length) {
            setTimeout(() => {
                this.currentFileIndex++;
                this.processCurrentFile();
            }, this.settingsManager.getSettings().processingDelay * 1000);
        } else {
            this.onQueueUpdate?.('queue-completed', 'Queue processing finished with errors');
        }
    }

    updateQueueDisplay() {
        const completed = this.fileQueue.filter(f => f.status === 'completed').length;
        const errors = this.fileQueue.filter(f => f.status === 'error').length;
        const pending = this.fileQueue.filter(f => f.status === 'pending').length;
        const processing = this.fileQueue.filter(f => f.status === 'processing').length;

        this.uiManager.elements.queueStats.textContent = 
            `${completed} completed, ${errors} errors, ${pending + processing} remaining`;

        const existingItems = this.uiManager.elements.queueList.querySelectorAll('.queue-item');

        if (existingItems.length !== this.fileQueue.length) {
            this.rebuildQueueList();
        } else {
            this.fileQueue.forEach((file, index) => {
                const queueItem = existingItems[index];
                const statusChanged = !queueItem.classList.contains(file.status);

                if (statusChanged) {
                    this.updateQueueItem(queueItem, file, index);
                } else if (file.status === 'processing') {
                    this.updateProgressOnly(queueItem, file);
                }
            });
        }
    }

    rebuildQueueList() {
        this.uiManager.elements.queueList.innerHTML = '';
        this.fileQueue.forEach((file, index) => {
            const queueItem = this.createQueueItem(file, index);
            this.uiManager.elements.queueList.appendChild(queueItem);
        });
    }

    createQueueItem(file, index) {
        const queueItem = document.createElement('div');
        queueItem.className = `queue-item ${file.status}`;
        queueItem.dataset.fileIndex = index;

        const statusIcon = this.getStatusIcon(file.status);
        const progressSection = file.status === 'processing' ? `
            <div class="queue-item-progress">
                <div class="queue-item-progress-bar">
                    <div class="queue-item-progress-fill" style="width: ${file.progress}%"></div>
                </div>
                <div class="queue-item-progress-text">${file.progress}%</div>
            </div>
        ` : '';

        queueItem.innerHTML = `
            <div class="queue-item-main">
                <div class="queue-item-info">
                    <div class="queue-item-name">${file.name}</div>
                </div>
                <div class="queue-item-status ${file.status}">
                    <span class="status-icon">${statusIcon}</span>
                    ${this.getStatusText(file.status)}
                </div>
            </div>
            ${progressSection}
        `;

        return queueItem;
    }

    updateQueueItem(queueItem, file, index) {
        queueItem.className = `queue-item ${file.status}`;
        queueItem.dataset.fileIndex = index;

        const statusIcon = this.getStatusIcon(file.status);
        const progressSection = file.status === 'processing' ? `
            <div class="queue-item-progress">
                <div class="queue-item-progress-bar">
                    <div class="queue-item-progress-fill" style="width: ${file.progress}%"></div>
                </div>
                <div class="queue-item-progress-text">${file.progress}%</div>
            </div>
        ` : '';

        queueItem.innerHTML = `
            <div class="queue-item-main">
                <div class="queue-item-info">
                    <div class="queue-item-name">${file.name}</div>
                </div>
                <div class="queue-item-status ${file.status}">
                    <span class="status-icon">${statusIcon}</span>
                    ${this.getStatusText(file.status)}
                </div>
            </div>
            ${progressSection}
        `;
    }

    updateProgressOnly(queueItem, file) {
        const progressFill = queueItem.querySelector('.queue-item-progress-fill');
        const progressText = queueItem.querySelector('.queue-item-progress-text');

        if (progressFill && progressText) {
            progressFill.style.width = `${file.progress}%`;
            progressText.textContent = `${file.progress}%`;
        }
    }

    updateOverallProgress() {
        const progressFill = this.uiManager.elements.progressFill;
        const progressText = this.uiManager.elements.progressText;

        if (!progressFill || !progressText) return;

        if (this.fileQueue.length === 0) {
            progressFill.style.width = '0%';
            progressText.textContent = '0%';
            return;
        }

        const completedFiles = this.fileQueue.filter(file =>
            file.status === 'completed' || file.status === 'error'
        ).length;

        let totalProgress = completedFiles;
        if (this.currentFileIndex >= 0 && this.currentFileIndex < this.fileQueue.length) {
            const currentFile = this.fileQueue[this.currentFileIndex];
            if (currentFile.status === 'processing' && currentFile.progress) {
                totalProgress += (currentFile.progress / 100);
            }
        }

        const progressPercentage = Math.round((totalProgress / this.fileQueue.length) * 100);

        progressFill.style.width = `${progressPercentage}%`;
        progressText.textContent = `${progressPercentage}% (${completedFiles}/${this.fileQueue.length})`;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'pending':
                return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 4v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>`;
            case 'processing':
                return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2l2 3h3l-2.5 3.5L13 12H10l-2 2-2-2H3l2.5-3.5L3 5h3L8 2z" stroke="currentColor" stroke-width="1" fill="currentColor"/>
                </svg>`;
            case 'completed':
                return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M6 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>`;
            case 'error':
                return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>`;
            default:
                return `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
                </svg>`;
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'pending': return 'Pending';
            case 'processing': return 'Processing';
            case 'completed': return 'Completed';
            case 'error': return 'Error';
            default: return 'Unknown';
        }
    }

    reset() {
        this.fileQueue = [];
        this.currentFileIndex = -1;
        this.isProcessing = false;
    }

    getQueue() {
        return [...this.fileQueue];
    }

    getCurrentFileIndex() {
        return this.currentFileIndex;
    }

    setQueue(queue, currentIndex = -1) {
        this.fileQueue = [...queue];
        this.currentFileIndex = currentIndex;
    }
}