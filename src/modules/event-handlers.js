export class EventHandlers {
    constructor(uiManager, fileQueueManager, settingsManager, navigationManager, dragDropHandler, fileUtils) {
        this.uiManager = uiManager;
        this.fileQueueManager = fileQueueManager;
        this.settingsManager = settingsManager;
        this.navigationManager = navigationManager;
        this.dragDropHandler = dragDropHandler;
        this.fileUtils = fileUtils;
        
        this.previousScreen = 'main';
        
        this.setupUIEventListeners();
        this.setupElectronListeners();
    }

    setupUIEventListeners() {
        // Drop zone click handler
        this.uiManager.elements.dropZone.addEventListener('click', async () => {
            const filePaths = await window.electronAPI.selectFile();
            if (filePaths && filePaths.length > 0) {
                this.fileQueueManager.handleMultipleFiles(filePaths);
            }
        });

        // Navigation buttons
        this.uiManager.elements.extractAnother.addEventListener('click', () => {
            this.resetToInitialState();
        });

        this.uiManager.elements.tryAgain.addEventListener('click', () => {
            this.resetToInitialState();
        });

        this.uiManager.elements.queueBackBtn.addEventListener('click', () => {
            this.navigationManager.addToHistory('main-screen', 'User clicked back to main');
            this.uiManager.showMain();
        });

        // Settings button with toggle functionality
        this.uiManager.elements.settingsBtn.addEventListener('click', () => {
            if (this.uiManager.isSettingsVisible()) {
                this.uiManager.hideAllAreas();
                this.uiManager.restorePreviousScreen(this.previousScreen, this.fileQueueManager.getQueue());
                this.uiManager.updateSettingsButtonState(false);
            } else {
                this.previousScreen = this.uiManager.getCurrentVisibleScreen();
                this.uiManager.showSettings();
                this.uiManager.updateSettingsButtonState(true);
            }
        });

        this.uiManager.elements.settingsBackBtn.addEventListener('click', () => {
            this.uiManager.showMain();
            this.uiManager.updateSettingsButtonState(false);
        });

        // Format selector event prevention
        this.uiManager.elements.outputFormat.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        this.uiManager.elements.outputFormat.addEventListener('change', (e) => {
            e.stopPropagation();
        });

        // Setup settings event listeners
        this.settingsManager.setupSettingsEventListeners();

        // Setup drag drop listeners for drop zone
        this.dragDropHandler.setupDropZoneListeners();
    }

    setupElectronListeners() {
        window.electronAPI.onExtractionProgress((event, progress) => {
            this.fileQueueManager.onExtractionProgress(progress);
        });

        window.electronAPI.onExtractionCompleted((event, data) => {
            this.fileQueueManager.onFileCompleted(data.output);
        });

        window.electronAPI.onExtractionError((event, data) => {
            this.fileQueueManager.onFileError(data.error);
        });
    }

    resetToInitialState() {
        this.fileQueueManager.reset();
        this.navigationManager.addToHistory('reset', 'Returned to initial state');
        this.navigationManager.updateNavigationButtons();

        this.uiManager.showMain();

        // Clean up electron listeners
        window.electronAPI.removeAllListeners('extraction-started');
        window.electronAPI.removeAllListeners('extraction-progress');
        window.electronAPI.removeAllListeners('extraction-completed');
        window.electronAPI.removeAllListeners('extraction-error');

        this.setupElectronListeners();
    }

    handleFileDrop(filePaths, currentScreen) {
        if (currentScreen === 'queue' && this.fileQueueManager.getQueue().length > 0) {
            this.fileQueueManager.addFilesToQueue(filePaths);
        } else {
            this.fileQueueManager.handleMultipleFiles(filePaths);
        }
        
        if (currentScreen !== 'queue') {
            this.uiManager.showQueue();
        }
    }
}