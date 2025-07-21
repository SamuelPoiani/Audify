export class NavigationManager {
    constructor(uiManager, fileQueueManager) {
        this.uiManager = uiManager;
        this.fileQueueManager = fileQueueManager;
        
        this.history = [];
        this.historyIndex = -1;
        
        this.setupNavigation();
    }

    setupNavigation() {
        this.uiManager.elements.backBtn.addEventListener('click', () => {
            this.navigateBack();
        });

        this.uiManager.elements.forwardBtn.addEventListener('click', () => {
            this.navigateForward();
        });
    }

    addToHistory(type, data) {
        const historyItem = {
            type,
            data,
            timestamp: Date.now(),
            fileIndex: this.fileQueueManager.getCurrentFileIndex(),
            queue: this.fileQueueManager.getQueue()
        };

        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(historyItem);
        this.historyIndex = this.history.length - 1;

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
        this.fileQueueManager.setQueue(historyItem.queue, historyItem.fileIndex);

        switch (historyItem.type) {
            case 'main-screen':
                this.uiManager.hideAllAreas();
                this.uiManager.elements.dropZone.style.display = 'block';
                break;
            case 'queue-started':
            case 'queue-completed':
            case 'queue-updated':
                this.uiManager.showQueue();
                this.fileQueueManager.updateQueueDisplay();
                this.fileQueueManager.updateOverallProgress();
                break;
            case 'file-completed':
                this.uiManager.showResult(historyItem.data);
                break;
            case 'file-error':
                this.uiManager.showError(historyItem.data);
                break;
            case 'reset':
                this.uiManager.hideAllAreas();
                this.uiManager.elements.dropZone.style.display = 'block';
                break;
        }

        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        this.uiManager.elements.backBtn.disabled = this.historyIndex <= 0;
        this.uiManager.elements.forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    reset() {
        this.history = [];
        this.historyIndex = -1;
        this.updateNavigationButtons();
    }
}