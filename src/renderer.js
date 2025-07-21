import { UIManager } from './modules/ui-manager.js';
import { DragDropHandler } from './modules/drag-drop-handler.js';
import { FileQueueManager } from './modules/file-queue-manager.js';
import { SettingsManager } from './modules/settings-manager.js';
import { NavigationManager } from './modules/navigation-manager.js';
import { EventHandlers } from './modules/event-handlers.js';
import { FileUtils } from './modules/file-utils.js';

class AudifyApp {
    constructor() {
        this.initializeModules();
        this.setupApplication();
    }

    initializeModules() {
        // Initialize core utility modules first
        this.fileUtils = new FileUtils();
        this.uiManager = new UIManager();
        this.settingsManager = new SettingsManager(this.uiManager);

        // Initialize queue manager with dependencies
        this.fileQueueManager = new FileQueueManager(
            this.uiManager, 
            this.fileUtils, 
            this.settingsManager,
            (type, data) => this.navigationManager?.addToHistory(type, data)
        );

        // Initialize navigation manager
        this.navigationManager = new NavigationManager(this.uiManager, this.fileQueueManager);

        // Initialize drag drop handler
        this.dragDropHandler = new DragDropHandler(
            this.uiManager,
            this.fileUtils,
            (filePaths, currentScreen) => this.eventHandlers.handleFileDrop(filePaths, currentScreen)
        );

        // Initialize event handlers with all dependencies
        this.eventHandlers = new EventHandlers(
            this.uiManager,
            this.fileQueueManager,
            this.settingsManager,
            this.navigationManager,
            this.dragDropHandler,
            this.fileUtils
        );
    }

    setupApplication() {
        // Setup window controls
        this.uiManager.setupWindowControls();
        
        // Initialize navigation
        this.navigationManager.addToHistory('main-screen', 'Application started');
    }

    // Public methods that might be called externally
    resetToInitialState() {
        this.eventHandlers.resetToInitialState();
    }

    // Legacy support methods for any external calls
    showError(errorText) {
        this.uiManager.showError(errorText);
    }

    showQueue() {
        this.uiManager.showQueue();
    }

    showMain() {
        this.uiManager.showMain();
    }

    // Handle file paths - maintained for backward compatibility
    async handleFilePath(filePath, fileName = null) {
        if (!this.fileUtils.isValidVideoFile(filePath)) {
            window.electronAPI.showError('Invalid File', 
                'Please select a video file (MP4, MKV, AVI, MOV, WMV, FLV, WebM, M4V, 3GP, OGV).');
            return;
        }
        this.fileQueueManager.handleMultipleFiles([filePath]);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AudifyApp();
});