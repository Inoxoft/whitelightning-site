const BINARY_MODELS = [
  { name: 'Spam Classifier', type: 'binary_classifier', prefix: 'spam_classifier', subClasses: [] },
  { name: 'Leading Questions', type: 'binary_classifier', prefix: 'leading_questions', subClasses: [] },
  { name: 'Clickbait News Titles', type: 'binary_classifier', prefix: 'clickbait_news', subClasses: [] },
  { name: 'Toxic Words', type: 'binary_classifier', prefix: 'toxic_words', subClasses: [] },
  { name: 'Sentiment sentences', type: 'binary_classifier', prefix: 'sentiment_sentences', subClasses: [] },
  { name: 'Pirate Speech', type: 'binary_classifier', prefix: 'pirate_speech', subClasses: [] },
  { name: 'SMS Urgency Detector', type: 'binary_classifier', prefix: 'sms_urgency', subClasses: [] },
  { name: 'Sarcasm Detector', type: 'binary_classifier', prefix: 'sarcasm_detector', subClasses: [] },
];
const MULTICLASS_MODELS = [
  { name: 'News Classifier', type: 'multiclass_classifier', prefix: 'news_classifier', subClasses: ['Arabic','Chinese','Deutch','English','French','Italian','Japanese','Russian','Spain'], subClassLabel: 'Language' },
  { name: 'Hate Speech Classifier', type: 'multiclass_classifier', prefix: 'hate_speech', subClasses: ['Deutch','English','French','Italian','Ukrainian','Russian','Spanish'], subClassLabel: 'Language' },
];

let selectedModelType = null;
let selectedModel = null;
let selectedModelSubclass = null;
let session = null;
let artifacts = null;
let isLoading = false;
let isProcessing = false;
let messages = [];

const initialMessages = [
  { text: 'Welcome to WhiteLightning Model Playground', isUser: false },
  { text: 'Select a model type and model to begin', isUser: false },
  { text: 'You can try binary classification or multiclass classification', isUser: false },
  { text: 'Upload your own model or use our pre-trained models', isUser: false },
  { text: 'Type your text and click Classify to get started', isUser: false }
];

function $(id) { return document.getElementById(id); }

// Model Uploader Class
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

        const success = await this.loadModelFiles(modelFiles);
        if (!success) return;

        this.currentModelFiles = modelFiles;
        this.modelInfo.classList.remove('hidden');
        
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
            const option = document.createElement('option');
            option.value = modelName;
            option.textContent = modelName;
            option.dataset.isCustom = 'true';
            this.modelSelect.appendChild(option);
            this.modelSelect.value = modelName;

            this.modelStatus.textContent = `Model loaded: ${modelName}`;
            this.modelStatus.style.background = '#2db30d';
            this.modelStatus.style.color = '#fff';

            window.currentModel = {
                name: modelName,
                type: modelType,
                description: modelDescription,
                files: this.currentModelFiles,
                session: this.currentSession,
                vocab: this.currentVocab,
                scaler: this.currentScaler
            };

            this.uploadModal.classList.add('hidden');
            this.resetUploadForm();

            this.showAlert('Model uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error uploading model:', error);
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

function renderModelTypeOptions() {
  const sel = $('modelTypeSelect');
  sel.innerHTML = `<option value="">Select Model Type</option>
    <option value="binary_classifier">Binary Classifier</option>
    <option value="multiclass_classifier">Multiclass Classifier</option>`;
}

function renderModelOptions() {
  const sel = $('modelSelect');
  let models = [];
  if (selectedModelType === 'binary_classifier') models = BINARY_MODELS;
  if (selectedModelType === 'multiclass_classifier') models = MULTICLASS_MODELS;
  sel.innerHTML = `<option value="">Select Model</option>` +
    models.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
}

function renderModelSubclassOptions() {
  const sel = $('modelSubclassSelect');
  if (!selectedModel || !selectedModel.subClasses.length) {
    sel.style.display = 'none';
    return;
  }
  sel.style.display = '';
  sel.innerHTML = `<option value="">Select ${selectedModel.subClassLabel || 'Subclass'}</option>` +
    selectedModel.subClasses.map(s => `<option value="${s}">${s}</option>`).join('');
}

function updateChat() {
  const chatArea = document.querySelector('.terminal-content');
  
  if (messages.length === 0) {
    // Keep the initial animated messages
    return;
  }
  
  // Clear the initial messages and show user messages
  chatArea.innerHTML = '';
  messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.isUser ? 'user' : ''}`;
    messageDiv.textContent = msg.text;
    chatArea.appendChild(messageDiv);
  });
  chatArea.scrollTop = chatArea.scrollHeight;
}

function setStatus(text, loaded) {
  $('modelStatus').textContent = text;
  $('modelStatus').style.background = loaded ? '#2db30d' : '#222';
  $('modelStatus').style.color = loaded ? '#fff' : '#39ff14';
}

async function loadBinaryArtifacts(modelPath) {
  try {
    const tfidfResp = await fetch(`${modelPath}/vocab.json`);
    const tfidfData = await tfidfResp.json();
    const scalerResp = await fetch(`${modelPath}/scaler.json`);
    const scalerData = await scalerResp.json();
    return {
      vocab: tfidfData.vocab,
      idf: tfidfData.idf,
      mean: scalerData.mean,
      scale: scalerData.scale,
    };
  } catch (error) {
    console.error('Error loading binary artifacts:', error);
    throw new Error(`Failed to load preprocessing artifacts: ${error.message}`);
  }
}

async function loadMulticlassArtifacts(modelPath) {
  try {
    const tokenizerResp = await fetch(`${modelPath}/vocab.json`);
    const labelMapResp = await fetch(`${modelPath}/scaler.json`);
    return {
      tokenizer: await tokenizerResp.json(),
      labelMap: await labelMapResp.json(),
    };
  } catch (error) {
    console.error('Error loading multiclass artifacts:', error);
    throw new Error(`Failed to load preprocessing artifacts: ${error.message}`);
  }
}

async function preprocessBinaryText(text, artifacts) {
  const { vocab, idf, mean, scale } = artifacts;
  const vector = new Float32Array(5000).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts = Object.create(null);
  words.forEach(word => (wordCounts[word] = (wordCounts[word] || 0) + 1));
  for (const word in wordCounts) {
    if (vocab[word] !== undefined) {
      vector[vocab[word]] = wordCounts[word] * idf[vocab[word]];
    }
  }

  for (let i = 0; i < 5000; i++) {
    vector[i] = (vector[i] - mean[i]) / scale[i];
  }
  return vector;
}

function preprocessMulticlassText(text, tokenizer, maxLen = 30) {
    const oovToken = '<OOV>';
    const words = text.toLowerCase().split(/\s+/);
    let sequence = words.map(word => {
        // Check if word exists in tokenizer
        if (tokenizer[word] !== undefined) {
            return tokenizer[word];
        }
        // Check if OOV token exists
        if (tokenizer[oovToken] !== undefined) {
            return tokenizer[oovToken];
        }
        // Default to 1 if neither exists
        return 1;
    });
    sequence = sequence.slice(0, maxLen); 
    const padded = new Array(maxLen).fill(0); 
    sequence.forEach((val, idx) => (padded[idx] = val));
    return padded;
}

async function runBinaryInference(session, text, artifacts) {
  const tensor = await preprocessBinaryText(text, artifacts);
  const feeds = {};
  feeds[session.inputNames[0]] = tensor;
  const results = await session.run(feeds);
  return results.output.data;
}

async function runMulticlassInference(session, text, artifacts) {
    try {
        const { tokenizer, labelMap } = artifacts;
        console.log('🔍 Multiclass artifacts:', {
            tokenizerKeys: Object.keys(tokenizer || {}),
            labelMapKeys: Object.keys(labelMap || {})
        });

        const tokenized = preprocessMulticlassText(text, tokenizer);
        const inputArray = new Int32Array(tokenized);
        const tensor = new ort.Tensor('int32', inputArray, [1, 30]);
        
        // Use dynamic input name
        const feeds = {};
        feeds[session.inputNames[0]] = tensor;
        
        const results = await session.run(feeds);
        const outputTensor = results[Object.keys(results)[0]];
        const probabilities = outputTensor.data;
        
        // Find the class with highest probability
        const predictedClassIdx = probabilities.reduce(
            (maxIdx, val, idx) => (val > probabilities[maxIdx] ? idx : maxIdx),
            0
        );
        
        // Get label from labelMap or use index if not found
        const label = labelMap[predictedClassIdx] || `Class ${predictedClassIdx}`;
        const probability = probabilities[predictedClassIdx];
        
        return { label, probability };
    } catch (error) {
        console.error('Error running multiclass inference:', error);
        console.error('Artifacts:', artifacts);
        throw new Error(`Inference failed: ${error.message}`);
    }
}

async function loadModel() {
  if (!selectedModel) return;
  if (selectedModel.subClasses.length && !selectedModelSubclass) return;
  
  isLoading = true;
  setStatus('Loading...', false);
  messages.push({ text: `Loading model: ${selectedModel.name}...`, isUser: false });
  updateChat();
  
  try {
    // Check if this is a custom uploaded model
    const modelOption = document.querySelector(`#modelSelect option[value="${selectedModel.name}"]`);
    if (modelOption && modelOption.dataset.isCustom === 'true') {
      // Use the custom model data
      session = window.currentModel.session;
      artifacts = selectedModel.type === 'binary_classifier' 
        ? {
            vocab: window.currentModel.vocab.vocab,
            idf: window.currentModel.vocab.idf,
            mean: window.currentModel.scaler.scaler_info.params.mean,
            scale: window.currentModel.scaler.scaler_info.params.scale
          }
        : {
            tokenizer: window.currentModel.vocab,
            labelMap: window.currentModel.scaler
          };
    } else {
      // Load pre-trained model
      let modelPath = `../models/${selectedModel.type}/${selectedModel.prefix}`;
      if (selectedModel.subClasses.length && selectedModelSubclass) {
        modelPath += `(${selectedModelSubclass})`;
      }

      session = await ort.InferenceSession.create(`${modelPath}/model.onnx`);

      artifacts = selectedModel.type === 'binary_classifier' 
        ? await loadBinaryArtifacts(modelPath)
        : await loadMulticlassArtifacts(modelPath);
    }

    setStatus('Model loaded', true);
    messages.push({ text: `Model loaded successfully! You can now start classifying text.`, isUser: false });
  } catch (e) {
    setStatus('Error loading', false);
    messages.push({ text: `Error: ${e.message}`, isUser: false });
  }
  
  isLoading = false;
  updateChat();
}

async function handleClassify(e) {
    e.preventDefault();
    
    console.log("🔍 handleClassify triggered");
    console.log('selectedModel:', selectedModel);
    console.log('session:', session);
    console.log('artifacts:', artifacts);
    console.log('📦 artifacts:', artifacts);
    console.log('📊 vocab keys:', Object.keys(artifacts?.vocab || {}));
    console.log('📈 idf length:', artifacts?.idf?.length);
    console.log('📊 mean length:', artifacts?.mean?.length);
    console.log('📊 scale length:', artifacts?.scale?.length);

    if (!selectedModel || !session || !artifacts) {
        addMessage('Please select a model first', false);
        return;
    }

    const input = $('inputText').value.trim();
    if (!input) return;
    
    messages.push({ text: input, isUser: true });
    updateChat();
    
    isProcessing = true;
    setStatus('Processing...', false);
    messages.push({ text: 'Processing input, please wait...', isUser: false });
    updateChat();
    
    try {
        const result = selectedModel.type === 'binary_classifier'
            ? await runBinaryInference(session, input, artifacts)
            : await runMulticlassInference(session, input, artifacts);
        
        messages.pop();
        
        messages.push({ 
            text: `Classification: ${result.label} (Score: ${result.probability.toFixed(4)})`, 
            isUser: false 
        });
    } catch (error) {
        console.error("❌ Classification error:", error);
        messages.pop();
        
        messages.push({ 
            text: `Error processing input: ${error.message}`, 
            isUser: false 
        });
    } finally {
        isProcessing = false;
        setStatus('Model loaded', true);
        updateChat();
        $('inputText').value = '';
    }
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.ort) {
    console.error('ONNX Runtime Web not available');
    messages.push({ 
      text: 'Error: ONNX Runtime Web not available. Please make sure to include the ONNX Runtime Web library in your HTML.', 
      isUser: false 
    });
    updateChat();
  }
  
  // Initialize the model uploader
  window.modelUploader = new ModelUploader();
  
  renderModelTypeOptions();
  setStatus('No model loaded', false);
  
  $('modelTypeSelect').addEventListener('change', e => {
    selectedModelType = e.target.value;
    selectedModel = null;
    selectedModelSubclass = null;
    renderModelOptions();
    renderModelSubclassOptions();
    setStatus('No model loaded', false);
    session = null;
    messages = [];
    updateChat();
  });
  
  $('modelSelect').addEventListener('change', e => {
    const models = selectedModelType === 'binary_classifier' ? BINARY_MODELS : MULTICLASS_MODELS;
    selectedModel = models.find(m => m.name === e.target.value);
    selectedModelSubclass = null;
    renderModelSubclassOptions();
    setStatus('No model loaded', false);
    session = null;
    messages = [];
    updateChat();
    loadModel();
  });
  
  $('modelSubclassSelect').addEventListener('change', e => {
    selectedModelSubclass = e.target.value;
    setStatus('No model loaded', false);
    session = null;
    messages = [];
    updateChat();
    loadModel();
  });
  
  // Initialize form with debugging
  const inputForm = $('inputForm');
  console.log('🎯 inputForm:', inputForm);
  
  if (inputForm) {
    inputForm.addEventListener('submit', handleClassify);
    console.log('✅ Form submit handler attached');
  } else {
    console.error('❌ Form element not found!');
  }

  // Mobile menu functionality
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('nav');
  
  hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    nav.classList.toggle('active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', function(event) {
    if (!hamburger.contains(event.target) && !nav.contains(event.target)) {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    }
  });

  // Close menu when clicking a link
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    });
  });
});
