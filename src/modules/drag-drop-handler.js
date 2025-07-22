export class DragDropHandler {
    constructor(uiManager, fileUtils, onFileDrop) {
        this.uiManager = uiManager;
        this.fileUtils = fileUtils;
        this.onFileDrop = onFileDrop;
        
        this.isDragging = false;
        this.currentDragFiles = [];
        
        this.setupGlobalDragListeners();
    }

    setupGlobalDragListeners() {
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            
            if (!this.isDragging && this.hasVideoFiles(e.dataTransfer)) {
                this.handleGlobalDragEnter(e);
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.isDragging && this.hasVideoFiles(e.dataTransfer)) {
                this.handleGlobalDragOver(e);
            }
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            
            // Check if we're leaving the window entirely
            if (!e.relatedTarget || !document.documentElement.contains(e.relatedTarget)) {
                this.handleGlobalDragLeave(e);
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (this.isDragging) {
                this.handleGlobalDrop(e);
            }
        });

        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }

    setupDropZoneListeners() {
        const dropZone = this.uiManager.elements.dropZone;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.isDragging && e.target.closest('.drop-zone')) {
                dropZone.classList.add('drag-over');
            }
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!e.target.closest('.drop-zone') || !dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        });
    }

    hasVideoFiles(dataTransfer) {
        if (!dataTransfer) return false;
        
        if (dataTransfer.files && dataTransfer.files.length > 0) {
            for (let i = 0; i < dataTransfer.files.length; i++) {
                const file = dataTransfer.files[i];
                if (file.name && this.fileUtils.isValidVideoFile(file.name)) {
                    return true;
                }
                if (file.type && file.type.startsWith('video/')) {
                    return true;
                }
            }
            return false;
        }
        
        if (dataTransfer.items && dataTransfer.items.length > 0) {
            let hasFiles = false;
            for (let i = 0; i < dataTransfer.items.length; i++) {
                const item = dataTransfer.items[i];
                if (item.kind === 'file') {
                    hasFiles = true;
                    if (item.type && item.type.startsWith('video/')) {
                        return true;
                    }
                    try {
                        const file = item.getAsFile();
                        if (file && file.name && this.fileUtils.isValidVideoFile(file.name)) {
                            return true;
                        }
                    } catch (e) {
                        // Continue checking other items
                    }
                }
            }
            return hasFiles ? false : false;
        }
        
        if (dataTransfer.types && dataTransfer.types.includes('Files')) {
            return true;
        }
        
        return false;
    }

    handleGlobalDragEnter(e) {
        this.isDragging = true;
        this.currentDragFiles = this.extractVideoFiles(e.dataTransfer);
        
        console.log('Drag enter - detected files:', this.currentDragFiles.length, this.currentDragFiles);
        
        document.body.classList.add('dragging-files');
        this.showDragOverlay();
        this.updateDragOverlayContent();
        
        if (this.uiManager.elements.dropZone.style.display !== 'none') {
            this.uiManager.elements.dropZone.classList.add('global-drag-active');
        }
    }

    handleGlobalDragOver(e) {
        this.updateDragOverlayContent();
    }

    handleGlobalDragLeave(e) {
        this.isDragging = false;
        this.currentDragFiles = [];
        
        document.body.classList.remove('dragging-files');
        this.hideDragOverlay();
        
        if (this.uiManager.elements.dropZone) {
            this.uiManager.elements.dropZone.classList.remove('global-drag-active');
        }
    }

    handleGlobalDrop(e) {
        this.isDragging = false;
        document.body.classList.remove('dragging-files');
        this.hideDragOverlay();
        
        if (this.uiManager.elements.dropZone) {
            this.uiManager.elements.dropZone.classList.remove('global-drag-active', 'drag-over');
        }
        
        const files = Array.from(e.dataTransfer.files);
        const videoFiles = files.filter(file => this.fileUtils.isValidVideoFile(file.name));
        
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
        const currentScreen = this.uiManager.getCurrentVisibleScreen();
        this.onFileDrop(filePaths, currentScreen);
    }

    extractVideoFiles(dataTransfer) {
        const files = [];
        
        if (!dataTransfer) return files;
        
        if (dataTransfer.items && dataTransfer.items.length > 0) {
            for (let i = 0; i < dataTransfer.items.length; i++) {
                const item = dataTransfer.items[i];
                if (item.kind === 'file') {
                    try {
                        const file = item.getAsFile();
                        if (file) {
                            files.push({
                                name: file.name,
                                valid: this.fileUtils.isValidVideoFile(file.name)
                            });
                        }
                    } catch (e) {
                        files.push({
                            name: `File ${i + 1}`,
                            valid: true
                        });
                    }
                }
            }
        }
        
        if (files.length === 0 && dataTransfer.files && dataTransfer.files.length > 0) {
            for (let i = 0; i < dataTransfer.files.length; i++) {
                files.push({
                    name: dataTransfer.files[i].name || `File ${i + 1}`,
                    valid: this.fileUtils.isValidVideoFile(dataTransfer.files[i].name || '')
                });
            }
        }
        
        if (files.length === 0 && (dataTransfer.types && dataTransfer.types.includes('Files'))) {
            // Try to get file count from dataTransfer.files or items
            let fileCount = 0;
            if (dataTransfer.files && dataTransfer.files.length > 0) {
                fileCount = dataTransfer.files.length;
            } else if (dataTransfer.items && dataTransfer.items.length > 0) {
                fileCount = Array.from(dataTransfer.items).filter(item => item.kind === 'file').length;
            } else {
                fileCount = 1; // Fallback
            }
            
            // Create individual entries for each file
            for (let i = 0; i < fileCount; i++) {
                files.push({
                    name: `File ${i + 1}`,
                    valid: true // Assume valid since we can't check during drag
                });
            }
        }
        
        return files;
    }

    showDragOverlay() {
        this.uiManager.elements.dragOverlay.style.display = 'flex';
    }

    hideDragOverlay() {
        this.uiManager.elements.dragOverlay.style.display = 'none';
    }

    updateDragOverlayContent() {
        const validFiles = this.currentDragFiles.filter(f => f.valid);
        const invalidFiles = this.currentDragFiles.filter(f => !f.valid);
        const totalFiles = this.currentDragFiles.length;
        
        console.log('Update overlay - total:', totalFiles, 'valid:', validFiles.length, 'invalid:', invalidFiles.length);
        
        if (validFiles.length === 0 && invalidFiles.length > 0) {
            this.uiManager.elements.dragTitle.textContent = 'Invalid file types';
            this.uiManager.elements.dragFileCount.textContent = `${totalFiles} file${totalFiles !== 1 ? 's' : ''} (none supported)`;
            this.uiManager.elements.dragActionText.textContent = 'Only video files are supported';
            this.uiManager.elements.dragActionText.className = 'drag-action-hint';
        } else if (validFiles.length > 0) {
            this.uiManager.elements.dragTitle.textContent = `Drop ${validFiles.length} video file${validFiles.length !== 1 ? 's' : ''}`;
            this.uiManager.elements.dragFileCount.textContent = `${validFiles.length} of ${totalFiles} file${totalFiles !== 1 ? 's' : ''} supported`;
            
            const currentScreen = this.uiManager.getCurrentVisibleScreen();
            if (currentScreen === 'queue') {
                this.uiManager.elements.dragActionText.textContent = 'Files will be added to the current queue';
                this.uiManager.elements.dragActionText.className = 'drag-action-hint queue-merge';
            } else {
                this.uiManager.elements.dragActionText.textContent = 'Files will create a new processing queue';
                this.uiManager.elements.dragActionText.className = 'drag-action-hint new-queue';
            }
        }
        
        this.uiManager.elements.dragFileList.innerHTML = '';
        this.currentDragFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = `drag-file-item ${file.valid ? 'valid' : 'invalid'}`;
            
            fileItem.innerHTML = `
                <div class="drag-file-name">${file.name}</div>
                <div class="drag-file-status ${file.valid ? 'valid' : 'invalid'}">
                    ${file.valid ? 'Valid' : 'Invalid'}
                </div>
            `;
            
            this.uiManager.elements.dragFileList.appendChild(fileItem);
        });
    }

    resetDragState() {
        this.isDragging = false;
        this.currentDragFiles = [];
        
        document.body.classList.remove('dragging-files');
        this.hideDragOverlay();
        
        if (this.uiManager.elements.dropZone) {
            this.uiManager.elements.dropZone.classList.remove('global-drag-active', 'drag-over');
        }
    }
}