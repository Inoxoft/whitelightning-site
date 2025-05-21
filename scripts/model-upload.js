class ModelUploader {
    constructor() {
        this.uploadCustomBtn = document.getElementById('uploadCustomBtn');
        this.uploadModal = document.getElementById('uploadModal');
        this.uploadArea = document.querySelector('.upload-area');
        this.fileInput = document.querySelector('input[type="file"]');
        this.alertBox = document.querySelector('.alert');
        this.modelInfo = document.getElementById('modelDetails');
        this.modelNameInput = document.querySelector('input[name="modelName"]');
        this.modelTypeSelect = document.querySelector('select[name="modelType"]');
        this.modelDescriptionInput = document.querySelector('textarea[name="modelDescription"]');
        this.uploadButton = document.querySelector('.model-info .button');
        this.loadingSpinner = document.querySelector('.loading');
        this.modelStatus = document.getElementById('modelStatus');
        this.modelTypeSelectMain = document.getElementById('modelTypeSelect');
        this.modelSelect = document.getElementById('modelSelect');
        
        this.currentModelFiles = null;
        this.currentSession = null;
        this.currentVocab = null;
        this.currentScaler = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Show upload modal
        this.uploadCustomBtn.addEventListener('click', () => {
            this.uploadModal.classList.remove('hidden');
            // Set the model type in the upload modal to match the main selector
            this.modelTypeSelect.value = this.modelTypeSelectMain.value;
        });

        // Sync model type between main selector and upload modal
        this.modelTypeSelectMain.addEventListener('change', () => {
            if (!this.uploadModal.classList.contains('hidden')) {
                this.modelTypeSelect.value = this.modelTypeSelectMain.value;
            }
        });

        this.modelTypeSelect.addEventListener('change', () => {
            this.modelTypeSelectMain.value = this.modelTypeSelect.value;
        });

        // Close modal when clicking outside
        this.uploadModal.addEventListener('click', (e) => {
            if (e.target === this.uploadModal) {
                this.uploadModal.classList.add('hidden');
                this.resetUploadForm();
            }
        });

        // File upload handling
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = '#fff';
            this.uploadArea.style.background = 'var(--card-bg)';
        });
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.style.borderColor = 'var(--main-green)';
            this.uploadArea.style.background = 'var(--section-bg)';
        });
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.style.borderColor = 'var(--main-green)';
            this.uploadArea.style.background = 'var(--section-bg)';
            this.handleFiles(e.dataTransfer.files);
        });
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Upload button click
        this.uploadButton.addEventListener('click', () => this.handleUpload());
    }

    resetUploadForm() {
        this.modelInfo.classList.add('hidden');
        this.alertBox.classList.add('hidden');
        this.modelNameInput.value = '';
        this.modelDescriptionInput.value = '';
        this.fileInput.value = '';
        this.currentModelFiles = null;
    }

    async handleFiles(files) {
        const modelFiles = {
            onnx: null,
            vocab: null,
            scaler: null
        };

        for (const file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'onnx') {
                modelFiles.onnx = file;
            } else if (file.name === 'vocab.json') {
                modelFiles.vocab = file;
            } else if (file.name === 'scaler.json') {
                modelFiles.scaler = file;
            }
        }

        if (!modelFiles.onnx || !modelFiles.vocab || !modelFiles.scaler) {
            this.showAlert('Please upload all required files: model.onnx, vocab.json, and scaler.json', 'error');
            return;
        }

        // Load model files
        const success = await this.loadModelFiles(modelFiles);
        if (!success) return;

        this.currentModelFiles = modelFiles;
        this.modelInfo.classList.remove('hidden');
        
        // Read and display model info
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const modelData = JSON.parse(e.target.result);
                if (modelData.model_info) {
                    this.modelNameInput.value = modelData.model_info.name || '';
                    this.modelTypeSelect.value = modelData.model_info.type || this.modelTypeSelectMain.value;
                    this.modelDescriptionInput.value = modelData.model_info.description || '';
                }
            } catch (error) {
                console.error('Error parsing model info:', error);
            }
        };
        reader.readAsText(modelFiles.vocab);

        this.showAlert('Files uploaded successfully! Please fill in the model information.', 'success');
    }

    async loadModelFiles(modelFiles) {
        try {
            this.currentSession = await ort.InferenceSession.create(URL.createObjectURL(modelFiles.onnx));
            
            const vocabReader = new FileReader();
            vocabReader.onload = (e) => {
                this.currentVocab = JSON.parse(e.target.result);
            };
            vocabReader.readAsText(modelFiles.vocab);
            
            const scalerReader = new FileReader();
            scalerReader.onload = (e) => {
                this.currentScaler = JSON.parse(e.target.result);
            };
            scalerReader.readAsText(modelFiles.scaler);
            
            return true;
        } catch (error) {
            console.error('Error loading model files:', error);
            this.showAlert('Error loading model files. Please try again.', 'error');
            return false;
        }
    }

    async handleUpload() {
        if (!this.currentModelFiles) {
            this.showAlert('Please upload model files first', 'error');
            return;
        }

        const modelName = this.modelNameInput.value.trim();
        const modelType = this.modelTypeSelect.value;
        const modelDescription = this.modelDescriptionInput.value.trim();

        if (!modelName) {
            this.showAlert('Please enter a model name', 'error');
            return;
        }

        this.loadingSpinner.classList.remove('hidden');
        this.uploadButton.disabled = true;

        try {
            // Create a new option for the custom model
            const option = document.createElement('option');
            option.value = modelName;
            option.textContent = modelName;
            option.dataset.isCustom = 'true';
            this.modelSelect.appendChild(option);
            this.modelSelect.value = modelName;

            // Update model status
            this.modelStatus.textContent = `Model loaded: ${modelName}`;
            this.modelStatus.style.background = '#2db30d';
            this.modelStatus.style.color = '#fff';

            // Store the model files in the global scope for the playground to use
            window.currentModel = {
                name: modelName,
                type: modelType,
                description: modelDescription,
                files: this.currentModelFiles,
                session: this.currentSession,
                vocab: this.currentVocab,
                scaler: this.currentScaler
            };

            // Update selectedModel and selectedModelType for the playground
            selectedModelType = window.currentModel.type;
            selectedModel = {
                name: window.currentModel.name,
                type: window.currentModel.type,
                prefix: window.currentModel.name.toLowerCase().replace(/\s+/g, '_'),
                subClasses: []
            };

            // Set session and artifacts for immediate use
            session = window.currentModel.session;
            
            // Log the structure of data to understand its format
            console.log('📊 Model data structure:', {
                vocab: this.currentVocab,
                scaler: this.currentScaler
            });
            
            // Set artifacts based on model type
            if (modelType === 'binary_classifier') {
                artifacts = {
                    vocab: this.currentVocab.vocab,
                    idf: this.currentVocab.idf,
                    mean: this.currentScaler.mean || this.currentScaler.scaler_info?.params?.mean,
                    scale: this.currentScaler.scale || this.currentScaler.scaler_info?.params?.scale
                };
            } else {
                // For multiclass, use vocab as tokenizer and scaler as labelMap
                artifacts = {
                    tokenizer: this.currentVocab,
                    labelMap: this.currentScaler
                };
            }

            console.log('🎯 Model loaded:', {
                selectedModel,
                selectedModelType,
                session: session ? 'InferenceSession loaded' : 'No session',
                artifacts: artifacts ? 'Artifacts loaded' : 'No artifacts',
                modelType: modelType
            });

            // Close modal and reset form
            this.uploadModal.classList.add('hidden');
            this.resetUploadForm();

            this.showAlert('Model uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error uploading model:', error);
            console.error('Scaler data:', this.currentScaler);
            this.showAlert('Error uploading model. Please try again.', 'error');
        } finally {
            this.loadingSpinner.classList.add('hidden');
            this.uploadButton.disabled = false;
        }
    }

    showAlert(message, type) {
        this.alertBox.textContent = message;
        this.alertBox.className = `alert ${type}`;
        this.alertBox.classList.remove('hidden');
        setTimeout(() => {
            this.alertBox.classList.add('hidden');
        }, 3000);
    }
}

// Initialize the model uploader when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modelUploader = new ModelUploader();
}); 