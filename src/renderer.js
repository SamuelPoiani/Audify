class AudifyApp {
    constructor() {
        this.fileQueue = [];
        this.currentFileIndex = -1;
        this.history = [];
        this.historyIndex = -1;
        this.isProcessing = false;
        this.previousScreen = 'main';
        this.settings = this.loadSettings();

        this.initializeElements();
        this.setupEventListeners();
        this.setupGlobalDragListeners();
        this.setupElectronListeners();
        this.setupWindowControls();
        this.setupNavigation();
        this.setupSettings();
        this.applySettings();
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.queueArea = document.getElementById('queueArea');
        this.resultArea = document.getElementById('resultArea');
        this.errorArea = document.getElementById('errorArea');
        this.settingsArea = document.getElementById('settingsArea');

        // Queue elements
        this.queueStats = document.getElementById('queueStats');
        this.queueList = document.getElementById('queueList');

        this.fileName = document.getElementById('fileName');
        this.filePath = document.getElementById('filePath');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.outputPath = document.getElementById('outputPath');
        this.errorMessage = document.getElementById('errorMessage');

        this.extractAnother = document.getElementById('extractAnother');
        this.tryAgain = document.getElementById('tryAgain');

        // Navigation elements
        this.backBtn = document.getElementById('backBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        this.queueBackBtn = document.getElementById('queueBackBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsBackBtn = document.getElementById('settingsBackBtn');

        // Format controls
        this.outputFormat = document.getElementById('outputFormat');

        // Settings elements
        this.defaultOutputFormat = document.getElementById('defaultOutputFormat');
        this.outputDirectory = document.getElementById('outputDirectory');
        this.browseOutputDir = document.getElementById('browseOutputDir');
        this.mp3Quality = document.getElementById('mp3Quality');
        this.aacQuality = document.getElementById('aacQuality');
        this.oggQuality = document.getElementById('oggQuality');
        this.processingDelay = document.getElementById('processingDelay');
        this.overwriteFiles = document.getElementById('overwriteFiles');
        this.resetSettings = document.getElementById('resetSettings');
        this.saveSettings = document.getElementById('saveSettings');

        // Global drag overlay elements
        this.dragOverlay = document.getElementById('dragOverlay');
        this.dragTitle = document.getElementById('dragTitle');
        this.dragFileCount = document.getElementById('dragFileCount');
        this.dragFileList = document.getElementById('dragFileList');
        this.dragActionText = document.getElementById('dragActionText');

        // Global drag state
        this.isDragging = false;
        this.dragCounter = 0;
        this.currentDragFiles = [];
    }

    setupEventListeners() {
        this.dropZone.addEventListener('click', async () => {
            const filePaths = await window.electronAPI.selectFile();
            if (filePaths && filePaths.length > 0) {
                this.handleMultipleFiles(filePaths);
            }
        });

        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only add drop zone specific styling if we're dragging over it specifically
            if (this.isDragging && e.target.closest('.drop-zone')) {
                this.dropZone.classList.add('drag-over');
            }
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only remove drop zone styling if we're leaving the drop zone area
            if (!e.target.closest('.drop-zone') || !this.dropZone.contains(e.relatedTarget)) {
                this.dropZone.classList.remove('drag-over');
            }
        });

        this.dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');
            
            // Let the global drop handler take care of the file processing
            // This prevents duplicate handling while maintaining drop zone specific feedback
        });

        this.extractAnother.addEventListener('click', () => {
            this.resetToInitialState();
        });

        this.tryAgain.addEventListener('click', () => {
            this.resetToInitialState();
        });

        this.queueBackBtn.addEventListener('click', () => {
            this.addToHistory('main-screen', 'User clicked back to main');
            this.hideAllAreas();
            this.dropZone.style.display = 'block';
        });

        this.settingsBtn.addEventListener('click', () => {

            if (this.isSettingsVisible()) {
                // Settings is open, close it and restore previous screen
                this.hideAllAreas();
                this.restorePreviousScreen();
                this.updateSettingsButtonState(false);
            } else {
                // Settings is closed, open it and save current screen
                this.previousScreen = this.getCurrentVisibleScreen();
                this.showSettings();
                this.updateSettingsButtonState(true);
            }
        });

        this.settingsBackBtn.addEventListener('click', () => {
            this.hideAllAreas();
            this.dropZone.style.display = 'block';
            this.updateSettingsButtonState(false);
        });

        this.browseOutputDir.addEventListener('click', async () => {
            const folder = await window.electronAPI.selectOutputFolder();
            if (folder) {
                this.outputDirectory.value = folder;
            }
        });

        this.resetSettings.addEventListener('click', () => {
            this.resetToDefaultSettings();
        });

        this.saveSettings.addEventListener('click', () => {
            this.saveCurrentSettings();
        });

        // Prevent format selector from triggering file dialog
        this.outputFormat.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        this.outputFormat.addEventListener('change', (e) => {
            e.stopPropagation();
        });
    }

    setupGlobalDragListeners() {
        // Global drag enter - track when files enter the app
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            this.dragCounter++;
            
            if (this.dragCounter === 1 && this.hasVideoFiles(e.dataTransfer)) {
                this.handleGlobalDragEnter(e);
            }
        });

        // Global drag over - update drag state
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.isDragging && this.hasVideoFiles(e.dataTransfer)) {
                this.handleGlobalDragOver(e);
            }
        });

        // Global drag leave - track when files leave the app
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dragCounter--;
            
            if (this.dragCounter === 0) {
                this.handleGlobalDragLeave(e);
            }
        });

        // Global drop - handle file drops anywhere in the app
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dragCounter = 0;
            
            if (this.isDragging) {
                this.handleGlobalDrop(e);
            }
        });

        // Prevent default drag behaviors on specific elements
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }

    hasVideoFiles(dataTransfer) {
        if (!dataTransfer || !dataTransfer.items) return false;
        
        for (let i = 0; i < dataTransfer.items.length; i++) {
            const item = dataTransfer.items[i];
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file && this.isValidVideoFile(file.name)) {
                    return true;
                }
            }
        }
        return false;
    }

    handleGlobalDragEnter(e) {
        this.isDragging = true;
        this.currentDragFiles = this.extractVideoFiles(e.dataTransfer);
        
        document.body.classList.add('dragging-files');
        this.showDragOverlay();
        this.updateDragOverlayContent();
        
        // Add visual feedback to drop zone if visible
        if (this.dropZone.style.display !== 'none') {
            this.dropZone.classList.add('global-drag-active');
        }
    }

    handleGlobalDragOver(e) {
        // Update drag overlay position or content if needed
        this.updateDragOverlayContent();
    }

    handleGlobalDragLeave(e) {
        this.isDragging = false;
        this.currentDragFiles = [];
        
        document.body.classList.remove('dragging-files');
        this.hideDragOverlay();
        
        // Remove visual feedback from drop zone
        if (this.dropZone) {
            this.dropZone.classList.remove('global-drag-active');
        }
    }

    handleGlobalDrop(e) {
        this.isDragging = false;
        document.body.classList.remove('dragging-files');
        this.hideDragOverlay();
        
        // Remove visual feedback
        if (this.dropZone) {
            this.dropZone.classList.remove('global-drag-active', 'drag-over');
        }
        
        const files = Array.from(e.dataTransfer.files);
        const videoFiles = files.filter(file => this.isValidVideoFile(file.name));
        
        if (videoFiles.length > 0) {
            const filePaths = [];
            for (const videoFile of videoFiles) {
                const filePath = window.electronAPI.getPathForFile(videoFile);
                if (filePath && filePath.trim() !== '') {
                    filePaths.push(filePath);
                }
            }
            
            if (filePaths.length > 0) {
                this.handleGlobalFileDrop(filePaths);
            } else {
                window.electronAPI.showError('Drag & Drop Error',
                    'Could not access the file paths. Please try using the "click to select" option instead.');
            }
        }
    }

    handleGlobalFileDrop(filePaths) {
        const currentScreen = this.getCurrentVisibleScreen();
        
        if (currentScreen === 'queue' && this.fileQueue.length > 0) {
            // Add files to existing queue
            this.addFilesToQueue(filePaths);
        } else {
            // Create new queue or replace current
            this.handleMultipleFiles(filePaths);
        }
        
        // Navigate to queue screen if not already there
        if (currentScreen !== 'queue') {
            this.showQueue();
        }
    }

    addFilesToQueue(filePaths) {
        const validFiles = filePaths.filter(path => this.isValidVideoFile(path));
        
        if (validFiles.length === 0) {
            return;
        }
        
        const newFiles = validFiles.map(filePath => ({
            path: filePath,
            name: filePath.split(/[\\/]/).pop(),
            status: 'pending',
            progress: 0
        }));
        
        // Add to the end of the queue
        this.fileQueue.push(...newFiles);
        
        this.addToHistory('queue-updated', `Added ${newFiles.length} files to queue`);
        this.updateQueueDisplay();
        this.updateOverallProgress();
        
        // Start processing if not currently processing
        if (!this.isProcessing && this.currentFileIndex < 0) {
            this.currentFileIndex = this.fileQueue.findIndex(file => file.status === 'pending');
            if (this.currentFileIndex >= 0) {
                this.updateNavigationButtons();
                this.processCurrentFile();
            }
        }
    }

    extractVideoFiles(dataTransfer) {
        const files = [];
        if (dataTransfer && dataTransfer.items) {
            for (let i = 0; i < dataTransfer.items.length; i++) {
                const item = dataTransfer.items[i];
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file && this.isValidVideoFile(file.name)) {
                        files.push({
                            name: file.name,
                            valid: true
                        });
                    } else if (file) {
                        files.push({
                            name: file.name,
                            valid: false
                        });
                    }
                }
            }
        }
        return files;
    }

    showDragOverlay() {
        this.dragOverlay.style.display = 'flex';
    }

    hideDragOverlay() {
        this.dragOverlay.style.display = 'none';
    }

    updateDragOverlayContent() {
        const validFiles = this.currentDragFiles.filter(f => f.valid);
        const invalidFiles = this.currentDragFiles.filter(f => !f.valid);
        const totalFiles = this.currentDragFiles.length;
        
        if (validFiles.length === 0 && invalidFiles.length > 0) {
            this.dragTitle.textContent = 'Invalid file types';
            this.dragFileCount.textContent = `${totalFiles} file${totalFiles !== 1 ? 's' : ''} (none supported)`;
            this.dragActionText.textContent = 'Only video files are supported';
            this.dragActionText.className = 'drag-action-hint';
        } else if (validFiles.length > 0) {
            this.dragTitle.textContent = `Drop ${validFiles.length} video file${validFiles.length !== 1 ? 's' : ''}`;
            this.dragFileCount.textContent = `${validFiles.length} of ${totalFiles} file${totalFiles !== 1 ? 's' : ''} supported`;
            
            const currentScreen = this.getCurrentVisibleScreen();
            if (currentScreen === 'queue' && this.fileQueue.length > 0) {
                this.dragActionText.textContent = 'Files will be added to the current queue';
                this.dragActionText.className = 'drag-action-hint queue-merge';
            } else {
                this.dragActionText.textContent = 'Files will create a new processing queue';
                this.dragActionText.className = 'drag-action-hint new-queue';
            }
        }
        
        // Update file list
        this.dragFileList.innerHTML = '';
        this.currentDragFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = `drag-file-item ${file.valid ? 'valid' : 'invalid'}`;
            
            fileItem.innerHTML = `
                <div class="drag-file-name">${file.name}</div>
                <div class="drag-file-status ${file.valid ? 'valid' : 'invalid'}">
                    ${file.valid ? 'Valid' : 'Invalid'}
                </div>
            `;
            
            this.dragFileList.appendChild(fileItem);
        });
    }

    setupElectronListeners() {
        window.electronAPI.onExtractionProgress((event, progress) => {
            if (progress.percent) {
                const percentage = Math.round(progress.percent);
                this.updateProgress(percentage);

                // Update progress for current file in queue
                if (this.currentFileIndex >= 0 && this.currentFileIndex < this.fileQueue.length) {
                    this.fileQueue[this.currentFileIndex].progress = percentage;
                    this.updateQueueDisplay();
                    this.updateOverallProgress();
                }
            }
        });

        window.electronAPI.onExtractionCompleted((event, data) => {
            this.onFileCompleted(data.output);
        });

        window.electronAPI.onExtractionError((event, data) => {
            this.onFileError(data.error);
        });
    }

    handleMultipleFiles(filePaths) {
        const validFiles = filePaths.filter(path => this.isValidVideoFile(path));

        if (validFiles.length === 0) {
            window.electronAPI.showError('Invalid Files', 'Please select video files (MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, 3GP, OGV).');
            return;
        }

        this.fileQueue = validFiles.map(filePath => ({
            path: filePath,
            name: filePath.split(/[\\/]/).pop(),
            status: 'pending',
            progress: 0
        }));

        this.currentFileIndex = 0;
        this.addToHistory('queue-started', `Processing ${this.fileQueue.length} files`);
        this.showQueue();
        this.updateNavigationButtons();
        this.processCurrentFile();
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
            const options = this.getExtractionOptions();
            await window.electronAPI.extractAudio(currentFile.path, options);
        } catch (error) {
            this.onFileError(error.message);
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

        // Auto-process next file if available
        if (this.currentFileIndex + 1 < this.fileQueue.length) {
            setTimeout(() => {
                this.currentFileIndex++;
                this.updateNavigationButtons();
                this.processCurrentFile();
            }, this.settings.processingDelay * 1000);
        } else {
            // All files completed
            this.addToHistory('queue-completed', 'All files processed');
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
        this.updateNavigationButtons();

        // Continue with next file after error
        if (this.currentFileIndex + 1 < this.fileQueue.length) {
            setTimeout(() => {
                this.currentFileIndex++;
                this.updateNavigationButtons();
                this.processCurrentFile();
            }, this.settings.processingDelay * 1000);
        } else {
            this.addToHistory('queue-completed', 'Queue processing finished with errors');
        }
    }

    async handleFilePath(filePath, fileName = null) {
        if (!this.isValidVideoFile(filePath)) {
            window.electronAPI.showError('Invalid File', 'Please select a video file (MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, 3GP, OGV).');
            return;
        }

        // Handle single file
        this.handleMultipleFiles([filePath]);
    }

    showQueue() {
        this.hideAllAreas();
        this.queueArea.style.display = 'block';
        this.updateQueueDisplay();
        this.updateOverallProgress();
    }

    updateQueueDisplay() {
        // Update stats
        const completed = this.fileQueue.filter(f => f.status === 'completed').length;
        const errors = this.fileQueue.filter(f => f.status === 'error').length;
        const pending = this.fileQueue.filter(f => f.status === 'pending').length;
        const processing = this.fileQueue.filter(f => f.status === 'processing').length;

        this.queueStats.textContent = `${completed} completed, ${errors} errors, ${pending + processing} remaining`;

        // Only rebuild queue if items count changed, otherwise just update existing items
        const existingItems = this.queueList.querySelectorAll('.queue-item');

        if (existingItems.length !== this.fileQueue.length) {
            // Full rebuild needed
            this.rebuildQueueList();
        } else {
            // Update existing items
            this.fileQueue.forEach((file, index) => {
                const queueItem = existingItems[index];
                const statusChanged = !queueItem.classList.contains(file.status);

                if (statusChanged) {
                    // Status changed, need to rebuild this item
                    this.updateQueueItem(queueItem, file, index);
                } else if (file.status === 'processing') {
                    // Just update progress for processing items
                    this.updateProgressOnly(queueItem, file);
                }
            });
        }
    }

    rebuildQueueList() {
        this.queueList.innerHTML = '';
        this.fileQueue.forEach((file, index) => {
            const queueItem = this.createQueueItem(file, index);
            this.queueList.appendChild(queueItem);
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

    updateProgress(percentage) {
        // This method is now used for individual file progress within queue items
        // Overall queue progress is handled by updateOverallProgress()
        if (this.currentFileIndex >= 0 && this.currentFileIndex < this.fileQueue.length) {
            this.fileQueue[this.currentFileIndex].progress = percentage;
        }
    }

    updateOverallProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (!progressFill || !progressText) return;

        if (this.fileQueue.length === 0) {
            progressFill.style.width = '0%';
            progressText.textContent = '0%';
            return;
        }

        const completedFiles = this.fileQueue.filter(file =>
            file.status === 'completed' || file.status === 'error'
        ).length;

        // Add partial progress for currently processing file
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

    showError(errorText) {
        this.errorMessage.textContent = errorText;
        this.hideAllAreas();
        this.errorArea.style.display = 'block';
    }

    hideAllAreas() {
        this.dropZone.style.display = 'none';
        this.queueArea.style.display = 'none';
        this.resultArea.style.display = 'none';
        this.errorArea.style.display = 'none';
        this.settingsArea.style.display = 'none';
        // Remove settings-visible class when hiding all areas
        document.body.classList.remove('settings-visible');
    }

    resetToInitialState() {
        this.fileQueue = [];
        this.currentFileIndex = -1;
        this.isProcessing = false;
        this.addToHistory('reset', 'Returned to initial state');
        this.updateNavigationButtons();

        this.hideAllAreas();
        this.dropZone.style.display = 'block';

        window.electronAPI.removeAllListeners('extraction-started');
        window.electronAPI.removeAllListeners('extraction-progress');
        window.electronAPI.removeAllListeners('extraction-completed');
        window.electronAPI.removeAllListeners('extraction-error');

        this.setupElectronListeners();
    }

    setupWindowControls() {
        const minimizeBtn = document.getElementById('minimizeBtn');
        const maximizeBtn = document.getElementById('maximizeBtn');
        const closeBtn = document.getElementById('closeBtn');

        minimizeBtn.addEventListener('click', () => {
            window.electronAPI.windowMinimize();
        });

        maximizeBtn.addEventListener('click', async () => {
            const isMaximized = await window.electronAPI.windowMaximize();
            this.updateMaximizeButton(isMaximized);
        });

        closeBtn.addEventListener('click', () => {
            window.electronAPI.windowClose();
        });

        // Initialize maximize button state
        this.initializeMaximizeButton();
    }

    async initializeMaximizeButton() {
        const isMaximized = await window.electronAPI.windowIsMaximized();
        this.updateMaximizeButton(isMaximized);
    }

    updateMaximizeButton(isMaximized) {
        const maximizeBtn = document.getElementById('maximizeBtn');
        const svg = maximizeBtn.querySelector('svg');

        if (isMaximized) {
            svg.innerHTML = '<rect x="2" y="3" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="1" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else {
            svg.innerHTML = '<rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        }
    }

    setupNavigation() {
        this.backBtn.addEventListener('click', () => {
            this.navigateBack();
        });

        this.forwardBtn.addEventListener('click', () => {
            this.navigateForward();
        });
    }

    addToHistory(type, data) {
        const historyItem = {
            type,
            data,
            timestamp: Date.now(),
            fileIndex: this.currentFileIndex,
            queue: [...this.fileQueue]
        };

        // Remove forward history when adding new item
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(historyItem);
        this.historyIndex = this.history.length - 1;

        // Ensure we always have a main screen entry as the first item
        if (this.history.length === 1 && type !== 'main-screen') {
            this.history.unshift({
                type: 'main-screen',
                data: 'Initial state',
                timestamp: Date.now() - 1000,
                fileIndex: -1,
                queue: []
            });
            this.historyIndex = 1;
        }

        this.updateNavigationButtons();
    }

    navigateBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreFromHistory();
        }
    }

    navigateForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreFromHistory();
        }
    }

    restoreFromHistory() {
        if (this.historyIndex < 0 || this.historyIndex >= this.history.length) {
            return;
        }

        const historyItem = this.history[this.historyIndex];
        this.fileQueue = [...historyItem.queue];
        this.currentFileIndex = historyItem.fileIndex;

        // Restore UI based on history item type
        switch (historyItem.type) {
            case 'main-screen':
                this.hideAllAreas();
                this.dropZone.style.display = 'block';
                break;
            case 'queue-started':
            case 'queue-completed':
                this.showQueue();
                break;
            case 'file-completed':
                this.showResult(historyItem.data);
                break;
            case 'file-error':
                this.showError(historyItem.data);
                break;
            case 'reset':
                this.hideAllAreas();
                this.dropZone.style.display = 'block';
                break;
        }

        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        this.backBtn.disabled = this.historyIndex <= 0;
        this.forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    // Settings Management
    loadSettings() {
        const defaultSettings = {
            outputFormat: 'flac',
            outputDirectory: '',
            mp3Quality: 320,
            aacQuality: 256,
            oggQuality: 5,
            processingDelay: 1.5,
            overwriteFiles: false
        };

        try {
            const saved = localStorage.getItem('audify-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return defaultSettings;
        }
    }

    saveCurrentSettings() {
        const settings = {
            outputFormat: this.defaultOutputFormat.value,
            outputDirectory: this.outputDirectory.value,
            mp3Quality: parseInt(this.mp3Quality.value),
            aacQuality: parseInt(this.aacQuality.value),
            oggQuality: parseInt(this.oggQuality.value),
            processingDelay: parseFloat(this.processingDelay.value),
            overwriteFiles: this.overwriteFiles.checked
        };

        try {
            localStorage.setItem('audify-settings', JSON.stringify(settings));
            this.settings = settings;
            this.applySettings();

            // Show success feedback
            const saveBtn = this.saveSettings;
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saved!';
            saveBtn.style.background = '#4a9';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
            }, 1500);
        } catch (error) {
            console.error('Error saving settings:', error);
            window.electronAPI.showError('Settings Error', 'Could not save settings.');
        }
    }

    resetToDefaultSettings() {
        const defaults = {
            outputFormat: 'flac',
            outputDirectory: '',
            mp3Quality: 320,
            aacQuality: 256,
            oggQuality: 5,
            processingDelay: 1.5,
            overwriteFiles: false
        };

        this.defaultOutputFormat.value = defaults.outputFormat;
        this.outputDirectory.value = defaults.outputDirectory;
        this.mp3Quality.value = defaults.mp3Quality;
        this.aacQuality.value = defaults.aacQuality;
        this.oggQuality.value = defaults.oggQuality;
        this.processingDelay.value = defaults.processingDelay;
        this.overwriteFiles.checked = defaults.overwriteFiles;
    }

    setupSettings() {
        // Initialize settings UI with saved values
        this.defaultOutputFormat.value = this.settings.outputFormat;
        this.outputDirectory.value = this.settings.outputDirectory;
        this.mp3Quality.value = this.settings.mp3Quality;
        this.aacQuality.value = this.settings.aacQuality;
        this.oggQuality.value = this.settings.oggQuality;
        this.processingDelay.value = this.settings.processingDelay;
        this.overwriteFiles.checked = this.settings.overwriteFiles;
    }

    applySettings() {
        // Apply current settings to the main UI
        this.outputFormat.value = this.settings.outputFormat;
    }

    showSettings() {
        this.hideAllAreas();
        this.settingsArea.style.display = 'block';
        // Add settings-visible class when showing settings
        document.body.classList.add('settings-visible');
    }

    getCurrentVisibleScreen() {
        if (this.dropZone.style.display !== 'none') {
            return 'main';
        }
        if (this.queueArea.style.display !== 'none') {
            return 'queue';
        }
        if (this.resultArea.style.display !== 'none') {
            return 'result';
        }
        if (this.errorArea.style.display !== 'none') {
            return 'error';
        }
        if (this.settingsArea.style.display !== 'none') {
            return 'settings';
        }
        // Default fallback
        return 'main';
    }

    isSettingsVisible() {
        return this.settingsArea.style.display !== 'none';
    }

    toggleSettings() {
        if (this.isSettingsVisible()) {
            // Settings is open, close it and restore previous screen
            this.hideAllAreas();
            this.restorePreviousScreen();
        } else {
            // Settings is closed, open it and save current screen
            this.previousScreen = this.getCurrentVisibleScreen();
            this.showSettings();
        }
    }

    restorePreviousScreen() {
        try {
            // Validate previous screen state
            const validScreens = ['main', 'queue', 'result', 'error'];
            if (!validScreens.includes(this.previousScreen)) {
                console.warn(`Invalid previous screen state: ${this.previousScreen}, falling back to main`);
                this.previousScreen = 'main';
            }

            switch (this.previousScreen) {
                case 'main':
                    this.dropZone.style.display = 'block';
                    break;
                case 'queue':
                    // Validate that queue area exists and has content
                    if (this.queueArea && this.fileQueue.length > 0) {
                        this.queueArea.style.display = 'block';
                    } else {
                        // Fallback to main if queue is empty or invalid
                        this.dropZone.style.display = 'block';
                    }
                    break;
                case 'result':
                    // Validate that result area exists
                    if (this.resultArea) {
                        this.resultArea.style.display = 'block';
                    } else {
                        this.dropZone.style.display = 'block';
                    }
                    break;
                case 'error':
                    // Validate that error area exists
                    if (this.errorArea) {
                        this.errorArea.style.display = 'block';
                    } else {
                        this.dropZone.style.display = 'block';
                    }
                    break;
                default:
                    // Final fallback to main screen
                    this.dropZone.style.display = 'block';
                    break;
            }
        } catch (error) {
            console.error('Error restoring previous screen:', error);
            // Emergency fallback to main screen
            this.hideAllAreas();
            this.dropZone.style.display = 'block';
            this.previousScreen = 'main';
        }
    }

    updateSettingsButtonState(isActive) {
        if (isActive) {
            this.settingsBtn.classList.add('active');
        } else {
            this.settingsBtn.classList.remove('active');
        }
    }

    // Updated file handling for multiple video formats
    isValidVideoFile(filePath) {
        const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ogv'];
        const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return videoExtensions.includes(extension);
    }

    getExtractionOptions() {
        const format = this.outputFormat.value;
        const options = {
            outputFormat: format,
            outputDir: this.settings.outputDirectory || null
        };

        // Set quality based on format
        switch (format) {
            case 'flac':
                options.quality = 0; // Highest quality for FLAC
                break;
            case 'mp3':
                options.quality = this.settings.mp3Quality;
                break;
            case 'aac':
                options.quality = this.settings.aacQuality;
                break;
            case 'ogg':
                options.quality = this.settings.oggQuality;
                break;
            case 'wav':
                // WAV doesn't need quality setting
                break;
        }

        return options;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AudifyApp();
});