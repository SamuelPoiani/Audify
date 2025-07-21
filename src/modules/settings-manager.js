export class SettingsManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.settings = this.loadSettings();
        this.setupSettings();
        this.applySettings();
    }

    getDefaultSettings() {
        return {
            outputFormat: 'flac',
            outputDirectory: '',
            mp3Quality: 320,
            aacQuality: 256,
            oggQuality: 5,
            processingDelay: 1.5,
            overwriteFiles: false
        };
    }

    loadSettings() {
        const defaultSettings = this.getDefaultSettings();

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
            outputFormat: this.uiManager.elements.defaultOutputFormat.value,
            outputDirectory: this.uiManager.elements.outputDirectory.value,
            mp3Quality: parseInt(this.uiManager.elements.mp3Quality.value),
            aacQuality: parseInt(this.uiManager.elements.aacQuality.value),
            oggQuality: parseInt(this.uiManager.elements.oggQuality.value),
            processingDelay: parseFloat(this.uiManager.elements.processingDelay.value),
            overwriteFiles: this.uiManager.elements.overwriteFiles.checked
        };

        try {
            localStorage.setItem('audify-settings', JSON.stringify(settings));
            this.settings = settings;
            this.applySettings();

            const saveBtn = this.uiManager.elements.saveSettings;
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
        const defaults = this.getDefaultSettings();

        this.uiManager.elements.defaultOutputFormat.value = defaults.outputFormat;
        this.uiManager.elements.outputDirectory.value = defaults.outputDirectory;
        this.uiManager.elements.mp3Quality.value = defaults.mp3Quality;
        this.uiManager.elements.aacQuality.value = defaults.aacQuality;
        this.uiManager.elements.oggQuality.value = defaults.oggQuality;
        this.uiManager.elements.processingDelay.value = defaults.processingDelay;
        this.uiManager.elements.overwriteFiles.checked = defaults.overwriteFiles;
    }

    setupSettings() {
        this.uiManager.elements.defaultOutputFormat.value = this.settings.outputFormat;
        this.uiManager.elements.outputDirectory.value = this.settings.outputDirectory;
        this.uiManager.elements.mp3Quality.value = this.settings.mp3Quality;
        this.uiManager.elements.aacQuality.value = this.settings.aacQuality;
        this.uiManager.elements.oggQuality.value = this.settings.oggQuality;
        this.uiManager.elements.processingDelay.value = this.settings.processingDelay;
        this.uiManager.elements.overwriteFiles.checked = this.settings.overwriteFiles;
    }

    applySettings() {
        this.uiManager.elements.outputFormat.value = this.settings.outputFormat;
    }

    setupSettingsEventListeners() {
        this.uiManager.elements.browseOutputDir.addEventListener('click', async () => {
            const folder = await window.electronAPI.selectOutputFolder();
            if (folder) {
                this.uiManager.elements.outputDirectory.value = folder;
            }
        });

        this.uiManager.elements.resetSettings.addEventListener('click', () => {
            this.resetToDefaultSettings();
        });

        this.uiManager.elements.saveSettings.addEventListener('click', () => {
            this.saveCurrentSettings();
        });
    }

    getSettings() {
        return { ...this.settings };
    }

    updateSetting(key, value) {
        if (this.settings.hasOwnProperty(key)) {
            this.settings[key] = value;
        }
    }
}