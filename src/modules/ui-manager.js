export class UIManager {
    constructor() {
        this.elements = {};
        this.initializeElements();
    }

    initializeElements() {
        this.elements = {
            dropZone: document.getElementById('dropZone'),
            queueArea: document.getElementById('queueArea'),
            resultArea: document.getElementById('resultArea'),
            errorArea: document.getElementById('errorArea'),
            settingsArea: document.getElementById('settingsArea'),

            // Queue elements
            queueStats: document.getElementById('queueStats'),
            queueList: document.getElementById('queueList'),

            fileName: document.getElementById('fileName'),
            filePath: document.getElementById('filePath'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            outputPath: document.getElementById('outputPath'),
            errorMessage: document.getElementById('errorMessage'),

            extractAnother: document.getElementById('extractAnother'),
            tryAgain: document.getElementById('tryAgain'),

            // Navigation elements
            backBtn: document.getElementById('backBtn'),
            forwardBtn: document.getElementById('forwardBtn'),
            queueBackBtn: document.getElementById('queueBackBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsBackBtn: document.getElementById('settingsBackBtn'),

            // Format controls
            outputFormat: document.getElementById('outputFormat'),

            // Settings elements
            defaultOutputFormat: document.getElementById('defaultOutputFormat'),
            outputDirectory: document.getElementById('outputDirectory'),
            browseOutputDir: document.getElementById('browseOutputDir'),
            mp3Quality: document.getElementById('mp3Quality'),
            aacQuality: document.getElementById('aacQuality'),
            oggQuality: document.getElementById('oggQuality'),
            processingDelay: document.getElementById('processingDelay'),
            overwriteFiles: document.getElementById('overwriteFiles'),
            resetSettings: document.getElementById('resetSettings'),
            saveSettings: document.getElementById('saveSettings'),

            // Global drag overlay elements
            dragOverlay: document.getElementById('dragOverlay'),
            dragTitle: document.getElementById('dragTitle'),
            dragFileCount: document.getElementById('dragFileCount'),
            dragFileList: document.getElementById('dragFileList'),
            dragActionText: document.getElementById('dragActionText')
        };
    }

    hideAllAreas() {
        this.elements.dropZone.style.display = 'none';
        this.elements.queueArea.style.display = 'none';
        this.elements.resultArea.style.display = 'none';
        this.elements.errorArea.style.display = 'none';
        this.elements.settingsArea.style.display = 'none';
        document.body.classList.remove('settings-visible');
    }

    showMain() {
        this.hideAllAreas();
        this.elements.dropZone.style.display = 'block';
    }

    showQueue() {
        this.hideAllAreas();
        this.elements.queueArea.style.display = 'block';
    }

    showResult(outputPath) {
        this.hideAllAreas();
        this.elements.resultArea.style.display = 'block';
        if (outputPath) {
            this.elements.outputPath.textContent = outputPath;
        }
    }

    showError(errorText) {
        this.elements.errorMessage.textContent = errorText;
        this.hideAllAreas();
        this.elements.errorArea.style.display = 'block';
    }

    showSettings() {
        this.hideAllAreas();
        this.elements.settingsArea.style.display = 'block';
        document.body.classList.add('settings-visible');
    }

    getCurrentVisibleScreen() {
        if (this.elements.dropZone.style.display !== 'none') {
            return 'main';
        }
        if (this.elements.queueArea.style.display !== 'none') {
            return 'queue';
        }
        if (this.elements.resultArea.style.display !== 'none') {
            return 'result';
        }
        if (this.elements.errorArea.style.display !== 'none') {
            return 'error';
        }
        if (this.elements.settingsArea.style.display !== 'none') {
            return 'settings';
        }
        return 'main';
    }

    isSettingsVisible() {
        return this.elements.settingsArea.style.display !== 'none';
    }

    updateSettingsButtonState(isActive) {
        if (isActive) {
            this.elements.settingsBtn.classList.add('active');
        } else {
            this.elements.settingsBtn.classList.remove('active');
        }
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

    restorePreviousScreen(previousScreen, fileQueue) {
        try {
            const validScreens = ['main', 'queue', 'result', 'error'];
            if (!validScreens.includes(previousScreen)) {
                console.warn(`Invalid previous screen state: ${previousScreen}, falling back to main`);
                previousScreen = 'main';
            }

            switch (previousScreen) {
                case 'main':
                    this.elements.dropZone.style.display = 'block';
                    break;
                case 'queue':
                    if (this.elements.queueArea && fileQueue.length > 0) {
                        this.elements.queueArea.style.display = 'block';
                    } else {
                        this.elements.dropZone.style.display = 'block';
                    }
                    break;
                case 'result':
                    if (this.elements.resultArea) {
                        this.elements.resultArea.style.display = 'block';
                    } else {
                        this.elements.dropZone.style.display = 'block';
                    }
                    break;
                case 'error':
                    if (this.elements.errorArea) {
                        this.elements.errorArea.style.display = 'block';
                    } else {
                        this.elements.dropZone.style.display = 'block';
                    }
                    break;
                default:
                    this.elements.dropZone.style.display = 'block';
                    break;
            }
        } catch (error) {
            console.error('Error restoring previous screen:', error);
            this.hideAllAreas();
            this.elements.dropZone.style.display = 'block';
        }
    }
}