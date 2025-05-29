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
  
  // Clear all existing content
  chatArea.innerHTML = '';
  
  if (messages.length === 0) {
    // Add initial messages with animation
    const initialMessages = [
      'Welcome to WhiteLightning Model Playground',
      'Select a model type and model to begin',
      'You can try binary classification or multiclass classification',
      'Upload your own model or use our pre-trained models',
      'Type your text and click Classify to get started'
    ];
    
    initialMessages.forEach(text => {
      const messageDiv = document.createElement('p');
      messageDiv.className = 'initial-message';
      
      const fullTextSpan = document.createElement('span');
      fullTextSpan.className = 'full-text';
      fullTextSpan.textContent = text;
      
      const shortTextSpan = document.createElement('span');
      shortTextSpan.className = 'short-text';
      shortTextSpan.textContent = text.length > 100 ? text.substring(0, 97) + '...' : text;
      
      messageDiv.appendChild(fullTextSpan);
      messageDiv.appendChild(shortTextSpan);
      chatArea.appendChild(messageDiv);
    });
  } else {
    // Show user messages without animation
    messages.forEach(msg => {
      const messageDiv = document.createElement('p');
      const fullTextSpan = document.createElement('span');
      fullTextSpan.className = 'full-text';
      fullTextSpan.textContent = msg.text;
      
      const shortTextSpan = document.createElement('span');
      shortTextSpan.className = 'short-text';
      shortTextSpan.textContent = msg.text.length > 100 ? msg.text.substring(0, 97) + '...' : msg.text;
      
      if (msg.isUser) {
        fullTextSpan.style.color = '#39ff14';
        shortTextSpan.style.color = '#39ff14';
      }
      
      messageDiv.appendChild(fullTextSpan);
      messageDiv.appendChild(shortTextSpan);
      chatArea.appendChild(messageDiv);
    });
  }
  
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
  try {
    // Detailed validation of artifacts
    console.log('🔍 Validating binary model artifacts:', {
      hasVocab: !!artifacts?.vocab,
      hasIdf: !!artifacts?.idf,
      hasMean: !!artifacts?.mean,
      hasScale: !!artifacts?.scale,
      vocabType: typeof artifacts?.vocab,
      idfType: typeof artifacts?.idf,
      meanType: typeof artifacts?.mean,
      scaleType: typeof artifacts?.scale
    });

    if (!artifacts || typeof artifacts !== 'object') {
      throw new Error('INVALID_ARTIFACTS: Model artifacts are missing or invalid');
    }

    // Check each required property
    if (!artifacts.vocab) throw new Error('INVALID_ARTIFACTS: Vocabulary is missing');
    if (!artifacts.idf) throw new Error('INVALID_ARTIFACTS: IDF values are missing');
    if (!artifacts.mean) throw new Error('INVALID_ARTIFACTS: Mean values are missing');
    if (!artifacts.scale) throw new Error('INVALID_ARTIFACTS: Scale values are missing');

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
  } catch (error) {
    console.error('❌ Binary preprocessing error:', error);
    throw error;
  }
}

function preprocessMulticlassText(text, tokenizer, maxLen = 30) {
  try {
    // Validate tokenizer
    if (!tokenizer || typeof tokenizer !== 'object') {
      throw new Error('INVALID_ARTIFACTS: Model tokenizer is missing or invalid');
    }

    const oovToken = '<OOV>';
    const words = text.toLowerCase().split(/\s+/);
    let sequence = words.map(word => {
      if (tokenizer[word] !== undefined) {
        return tokenizer[word];
      }
      if (tokenizer[oovToken] !== undefined) {
        return tokenizer[oovToken];
      }
      return 1;
    });
    
    sequence = sequence.slice(0, maxLen);
    const padded = new Array(maxLen).fill(0);
    sequence.forEach((val, idx) => (padded[idx] = val));
    return padded;
  } catch (error) {
    console.error('❌ Multiclass preprocessing error:', error);
    throw error;
  }
}

// Add artifact type detection functions
function isBinaryArtifacts(artifacts) {
    return (
        artifacts &&
        artifacts.vocab && artifacts.idf &&
        artifacts.mean && artifacts.scale
    );
}

function isMulticlassArtifacts(artifacts) {
    return (
        artifacts &&
        artifacts.tokenizer && artifacts.labelMap
    );
}

async function runBinaryInference(session, text, artifacts) {
    try {
        // Validate artifacts structure first
        if (!isBinaryArtifacts(artifacts)) {
            throw new Error('MODEL_TYPE_MISMATCH_BINARY');
        }

        console.log('🔍 Running binary inference with:', {
            inputNames: session.inputNames,
            artifacts: artifacts
        });

        const tensor = await preprocessBinaryText(text, artifacts);
        const feeds = {};
        
        const inputName = session.inputNames[0];
        if (!inputName) {
            throw new Error('INVALID_SESSION: No input names found in the model');
        }
        
        feeds[inputName] = new ort.Tensor('float32', tensor, [1, tensor.length]);
        
        console.log('📦 Input tensor shape:', [1, tensor.length]);
        console.log('🔑 Using input name:', inputName);
        
        const results = await session.run(feeds);
        const outputTensor = results[Object.keys(results)[0]];
        const probability = outputTensor.data[0];
        
        return {
            label: probability > 0.5 ? 'Positive' : 'Negative',
            probability: probability
        };
    } catch (error) {
        console.error('❌ Binary inference error:', error);
        if (error.message.includes('INVALID_') || error.message.includes('MODEL_TYPE_MISMATCH')) {
            throw error;
        }
        throw new Error(`Binary inference failed: ${error.message}`);
    }
}

async function runMulticlassInference(session, text, artifacts) {
    try {
        // Validate artifacts structure first
        if (!isMulticlassArtifacts(artifacts)) {
            throw new Error('MODEL_TYPE_MISMATCH_MULTICLASS');
        }

        const { tokenizer, labelMap } = artifacts;
        console.log('🔍 Multiclass artifacts:', {
            tokenizerKeys: Object.keys(tokenizer || {}),
            labelMapKeys: Object.keys(labelMap || {})
        });

        const tokenized = preprocessMulticlassText(text, tokenizer);
        const inputArray = new Int32Array(tokenized);
        const tensor = new ort.Tensor('int32', inputArray, [1, 30]);
        
        const feeds = {};
        const inputName = session.inputNames[0];
        if (!inputName) {
            throw new Error('INVALID_SESSION: No input names found in the model');
        }
        feeds[inputName] = tensor;
        
        const results = await session.run(feeds);
        const outputTensor = results[Object.keys(results)[0]];
        const probabilities = outputTensor.data;
        
        const predictedClassIdx = probabilities.reduce(
            (maxIdx, val, idx) => (val > probabilities[maxIdx] ? idx : maxIdx),
            0
        );
        
        const label = labelMap[predictedClassIdx] || `Class ${predictedClassIdx}`;
        const probability = probabilities[predictedClassIdx];
        
        return { label, probability };
    } catch (error) {
        console.error('❌ Multiclass inference error:', error);
        if (error.message.includes('INVALID_') || error.message.includes('MODEL_TYPE_MISMATCH')) {
            throw error;
        }
        throw new Error(`Multiclass inference failed: ${error.message}`);
    }
}

async function loadModel() {
  if (!selectedModel) return;
  if (selectedModel.subClasses.length && !selectedModelSubclass) return;
  
  isLoading = true;
  setStatus('Loading...', false);
  addTerminalMessage(`Loading model: ${selectedModel.name}...`);
  
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
    addTerminalMessage('Model loaded sucessfully! You can now start classifying text.');
  } catch (e) {
    setStatus('Error loading', false);
    addTerminalMessage(`Error: ${e.message}`, true);
  }
  
  isLoading = false;
}

function addTerminalMessage(text, isError = false) {
  messages.push({ text, isUser: false });
  updateChat();
}

async function handleClassify(e) {
  e.preventDefault();
  
  if (!selectedModel || !session || !artifacts) {
    addTerminalMessage('Please select a model first', true);
    return;
  }

  const input = $('inputText').value.trim();
  if (!input) return;
  
  // Add user input to messages
  messages.push({ text: `> ${input}`, isUser: true });
  updateChat();
  
  isProcessing = true;
  setStatus('Processing...', false);
  
  try {
    const result = selectedModel.type === 'binary_classifier'
      ? await runBinaryInference(session, input, artifacts)
      : await runMulticlassInference(session, input, artifacts);
    
    addTerminalMessage(`Classification: ${result.label} (Score: ${result.probability.toFixed(4)})`);
  } catch (error) {
    console.error("❌ Classification error:", error);
    addTerminalMessage(`Error: ${error.message}`, true);
  }
  
  isProcessing = false;
  setStatus('Model loaded', true);
  $('inputText').value = '';
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.ort) {
    addTerminalMessage('Error: ONNX Runtime Web not available. Please make sure to include the ONNX Runtime Web library in your HTML.', true);
    return;
  }
  
  // Clear existing messages
  messages = [];
  
  // Add initial messages with animation
  const initialMessages = [
    'Welcome to WhiteLightning Model Playground',
    'Select a model type and model to begin',
    'You can try binary classification or multiclass classification',
    'Upload your own model or use our pre-trained models',
    'Type your text and click Classify to get started'
  ];
  
  const chatArea = document.querySelector('.terminal-content');
  chatArea.innerHTML = '';
  
  initialMessages.forEach(text => {
    const messageDiv = document.createElement('p');
    messageDiv.className = 'initial-message';
    
    const fullTextSpan = document.createElement('span');
    fullTextSpan.className = 'full-text';
    fullTextSpan.textContent = text;
    
    const shortTextSpan = document.createElement('span');
    shortTextSpan.className = 'short-text';
    shortTextSpan.textContent = text.length > 100 ? text.substring(0, 97) + '...' : text;
    
    messageDiv.appendChild(fullTextSpan);
    messageDiv.appendChild(shortTextSpan);
    chatArea.appendChild(messageDiv);
  });
  
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
