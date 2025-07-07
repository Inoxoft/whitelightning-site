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

const MULTICLASS_SIGMOID_MODELS = [
  { name: 'News Multilabel Classifier', type: 'multiclass_sigmoid', prefix: 'news_multilabel_clf', subClasses: [], description: 'Classifies news articles into multiple categories (business, health, politics, sports, technologies)' },
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
  { text: 'You can try binary, multiclass, or multiclass sigmoid classification', isUser: false },
  { text: 'Upload your own model or use our pre-trained models', isUser: false },
  { text: 'Type your text and click Classify to get started', isUser: false }
];

function $(id) { return document.getElementById(id); }

function renderModelTypeOptions() {
  const sel = $('modelTypeSelect');
  sel.innerHTML = `<option value="">Select Model Type</option>
    <option value="binary_classifier">Binary Classifier</option>
    <option value="multiclass_classifier">Multiclass Classifier</option>
    <option value="multiclass_sigmoid">Multiclass Sigmoid</option>`;
}

function renderModelOptions() {
  const sel = $('modelSelect');
  let models = [];
  if (selectedModelType === 'binary_classifier') models = BINARY_MODELS;
  if (selectedModelType === 'multiclass_classifier') models = MULTICLASS_MODELS;
  if (selectedModelType === 'multiclass_sigmoid') models = MULTICLASS_SIGMOID_MODELS;
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
      'You can try binary, multiclass, or multiclass sigmoid classification',
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

async function loadMulticlassSigmoidArtifacts(modelPath) {
  try {
    const vectorizerResp = await fetch(`${modelPath}/vocab.json`);
    const classesResp = await fetch(`${modelPath}/scaler.json`);
    return {
      vectorizer: await vectorizerResp.json(),
      classes: await classesResp.json(),
    };
  } catch (error) {
    console.error('Error loading multiclass sigmoid artifacts:', error);
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
    
    // Dynamically determine vector size from the mean/scale arrays
    const vectorSize = mean.length;
    console.log('🔍 Using vector size:', vectorSize);
    
    const vector = new Float32Array(vectorSize).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = Object.create(null);
    words.forEach(word => (wordCounts[word] = (wordCounts[word] || 0) + 1));
    
    for (const word in wordCounts) {
      if (vocab[word] !== undefined) {
        vector[vocab[word]] = wordCounts[word] * idf[vocab[word]];
      }
    }

    for (let i = 0; i < vectorSize; i++) {
      vector[i] = (vector[i] - mean[i]) / scale[i];
    }
    return vector;
  } catch (error) {
    console.error('❌ Binary preprocessing error:', error);
    throw error;
  }
}

async function preprocessMulticlassSigmoidText(text, artifacts) {
  try {
    // Validate artifacts
    console.log('🔍 Validating multiclass sigmoid artifacts:', {
      hasVectorizer: !!artifacts?.vectorizer,
      hasClasses: !!artifacts?.classes,
      vectorizerKeys: Object.keys(artifacts?.vectorizer || {}),
      classesKeys: Object.keys(artifacts?.classes || {})
    });

    if (!artifacts || !artifacts.vectorizer || !artifacts.classes) {
      throw new Error('INVALID_ARTIFACTS: Missing vectorizer or classes');
    }

    const { vectorizer } = artifacts;
    
    // Validate vectorizer structure
    if (!vectorizer.vocabulary || !vectorizer.idf) {
      throw new Error('INVALID_ARTIFACTS: Vectorizer missing vocabulary or idf');
    }

    const { vocabulary, idf, max_features } = vectorizer;
    
    // Tokenize and count words
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Create TF-IDF vector
    const vectorSize = max_features || Object.keys(vocabulary).length;
    const vector = new Float32Array(vectorSize).fill(0);
    
    // Calculate term frequencies and apply IDF
    const totalWords = words.length;
    for (const [word, count] of Object.entries(wordCounts)) {
      if (vocabulary[word] !== undefined) {
        const termFreq = count / totalWords;
        const idfValue = idf[vocabulary[word]] || 0;
        vector[vocabulary[word]] = termFreq * idfValue;
      }
    }
    
    console.log('🔍 Vector created:', {
      size: vectorSize,
      nonZeroCount: vector.filter(v => v !== 0).length,
      maxValue: Math.max(...vector),
      minValue: Math.min(...vector)
    });

    return vector;
  } catch (error) {
    console.error('❌ Multiclass sigmoid preprocessing error:', error);
    throw error;
  }
}

function preprocessMulticlassText(text, tokenizer, maxLen = 30, vocabBounds = null) {
  try {
    // Validate tokenizer
    if (!tokenizer || typeof tokenizer !== 'object') {
      throw new Error('INVALID_ARTIFACTS: Model tokenizer is missing or invalid');
    }

    // Dynamic vocabulary bounds detection
    let MAX_VOCAB_SIZE, MIN_VOCAB_SIZE;
    
    if (vocabBounds) {
      // Use provided bounds
      MAX_VOCAB_SIZE = vocabBounds.max;
      MIN_VOCAB_SIZE = vocabBounds.min;
    } else {
      // Auto-detect bounds from tokenizer
      const tokenIds = Object.values(tokenizer).filter(id => typeof id === 'number');
      if (tokenIds.length > 0) {
        MAX_VOCAB_SIZE = Math.max(...tokenIds);
        MIN_VOCAB_SIZE = Math.min(...tokenIds);
        console.log(`🔍 Auto-detected vocabulary bounds: [${MIN_VOCAB_SIZE}, ${MAX_VOCAB_SIZE}]`);
      } else {
        // Fallback to conservative bounds
        MAX_VOCAB_SIZE = 9999;
        MIN_VOCAB_SIZE = 0;
        console.warn('⚠️ Could not detect vocabulary bounds, using fallback: [0, 9999]');
      }
    }
    
    const OOV_TOKEN_ID = Math.min(1, MAX_VOCAB_SIZE); // Safe fallback within bounds
    
    const oovToken = '<OOV>';
    const words = text.toLowerCase().split(/\s+/);
    let oovCount = 0;
    let boundsViolationCount = 0;
    
    let sequence = words.map(word => {
      let tokenId;
      
      if (tokenizer[word] !== undefined) {
        tokenId = tokenizer[word];
      } else if (tokenizer[oovToken] !== undefined) {
        tokenId = tokenizer[oovToken];
        oovCount++;
      } else {
        tokenId = OOV_TOKEN_ID;
        oovCount++;
      }
      
      // Bounds checking - ensure token ID is within detected/provided range
      if (tokenId > MAX_VOCAB_SIZE || tokenId < MIN_VOCAB_SIZE) {
        console.warn(`⚠️ Token ID ${tokenId} for word "${word}" is out of bounds [${MIN_VOCAB_SIZE}, ${MAX_VOCAB_SIZE}]. Using OOV token.`);
        boundsViolationCount++;
        return OOV_TOKEN_ID;
      }
      
      return tokenId;
    });
    
    // Log preprocessing statistics
    if (oovCount > 0 || boundsViolationCount > 0) {
      console.log(`📊 Preprocessing stats: ${oovCount} OOV tokens, ${boundsViolationCount} bounds violations`);
    }
    
    sequence = sequence.slice(0, maxLen);
    const padded = new Array(maxLen).fill(0);
    sequence.forEach((val, idx) => (padded[idx] = val));
    
    console.log('🔍 Final token sequence:', padded);
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

function isMulticlassSigmoidArtifacts(artifacts) {
    return (
        artifacts &&
        artifacts.vectorizer && artifacts.classes
    );
}

// Helper function to detect vocabulary bounds from ONNX model metadata
function detectVocabularyBounds(session, tokenizer) {
    try {
        // Try to get embedding layer info from model metadata
        const inputMetadata = session.inputsMetadata;
        const modelMetadata = session.modelMetadata;
        
        // Check if model metadata contains vocabulary size info
        if (modelMetadata && modelMetadata.custom) {
            const vocabSize = modelMetadata.custom.vocab_size || modelMetadata.custom.vocabulary_size;
            if (vocabSize) {
                console.log(`📊 Found vocabulary size in model metadata: ${vocabSize}`);
                return { min: 0, max: parseInt(vocabSize) - 1 };
            }
        }
        
        // Fallback: analyze tokenizer vocabulary
        if (tokenizer && typeof tokenizer === 'object') {
            const tokenIds = Object.values(tokenizer).filter(id => typeof id === 'number');
            if (tokenIds.length > 0) {
                const bounds = { min: Math.min(...tokenIds), max: Math.max(...tokenIds) };
                console.log(`📊 Detected vocabulary bounds from tokenizer: [${bounds.min}, ${bounds.max}]`);
                return bounds;
            }
        }
        
        console.warn('⚠️ Could not detect vocabulary bounds, using conservative defaults');
        return null;
    } catch (error) {
        console.warn('⚠️ Error detecting vocabulary bounds:', error.message);
        return null;
    }
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

        // Detect vocabulary bounds for this model
        const vocabBounds = detectVocabularyBounds(session, tokenizer);
        const tokenized = preprocessMulticlassText(text, tokenizer, 30, vocabBounds);
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
        
        // Handle specific ONNX Runtime errors
        if (error.message && error.message.includes('indices element out of data bounds')) {
            throw new Error('VOCABULARY_BOUNDS_ERROR: Token vocabulary mismatch with model. This usually indicates the tokenizer vocabulary contains IDs outside the model\'s embedding range. Please check your model and tokenizer compatibility.');
        }
        
        if (error.message && error.message.includes('GatherV2')) {
            throw new Error('EMBEDDING_ERROR: Model embedding layer error. This may be due to vocabulary size mismatch or corrupted model file.');
        }
        
        if (error.message.includes('INVALID_') || error.message.includes('MODEL_TYPE_MISMATCH')) {
            throw error;
        }
        
        throw new Error(`Multiclass inference failed: ${error.message}`);
    }
}

async function runMulticlassSigmoidInference(session, text, artifacts) {
    try {
        // Validate artifacts structure first
        if (!isMulticlassSigmoidArtifacts(artifacts)) {
            throw new Error('MODEL_TYPE_MISMATCH_MULTICLASS_SIGMOID');
        }

        const { vectorizer, classes } = artifacts;
        console.log('🔍 Multiclass sigmoid inference:', {
            vectorizerKeys: Object.keys(vectorizer || {}),
            classesKeys: Object.keys(classes || {}),
            numClasses: Object.keys(classes).length
        });

        // Preprocess text to get TF-IDF features
        const features = await preprocessMulticlassSigmoidText(text, artifacts);
        
        // Create input tensor
        const inputName = session.inputNames[0];
        if (!inputName) {
            throw new Error('INVALID_SESSION: No input names found in the model');
        }
        
        const feeds = {};
        feeds[inputName] = new ort.Tensor('float32', features, [1, features.length]);
        
        console.log('📦 Input tensor shape:', [1, features.length]);
        console.log('🔑 Using input name:', inputName);
        
        // Run inference
        const results = await session.run(feeds);
        const outputTensor = results[Object.keys(results)[0]];
        const logits = outputTensor.data;
        
        // Apply sigmoid activation: 1 / (1 + exp(-x))
        const probabilities = Array.from(logits).map(x => 1 / (1 + Math.exp(-x)));
        
        console.log('📊 Logits:', Array.from(logits));
        console.log('📊 Probabilities:', probabilities);
        
        // Create predictions array
        const predictions = [];
        probabilities.forEach((prob, idx) => {
            const className = classes[idx.toString()] || `Class ${idx}`;
            const status = prob > 0.5 ? '✅' : '❌';
            predictions.push({
                index: idx,
                class: className,
                probability: prob,
                status: status,
                predicted: prob > 0.5
            });
        });
        
        // Sort by probability (descending)
        predictions.sort((a, b) => b.probability - a.probability);
        
        return {
            predictions: predictions,
            topPrediction: predictions[0]
        };
    } catch (error) {
        console.error('❌ Multiclass sigmoid inference error:', error);
        
        if (error.message.includes('INVALID_') || error.message.includes('MODEL_TYPE_MISMATCH')) {
            throw error;
        }
        
        throw new Error(`Multiclass sigmoid inference failed: ${error.message}`);
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
      if (selectedModel.type === 'binary_classifier') {
        artifacts = {
          vocab: window.currentModel.vocab.vocab,
          idf: window.currentModel.vocab.idf,
          mean: window.currentModel.scaler.scaler_info.params.mean,
          scale: window.currentModel.scaler.scaler_info.params.scale
        };
      } else if (selectedModel.type === 'multiclass_classifier') {
        artifacts = {
          tokenizer: window.currentModel.vocab,
          labelMap: window.currentModel.scaler
        };
      } else if (selectedModel.type === 'multiclass_sigmoid') {
        artifacts = {
          vectorizer: window.currentModel.vocab,
          classes: window.currentModel.scaler
        };
      }
    } else {
      // Load pre-trained model
      let modelPath = `../models/${selectedModel.type}/${selectedModel.prefix}`;
      if (selectedModel.subClasses.length && selectedModelSubclass) {
        modelPath += `(${selectedModelSubclass})`;
      }

      session = await ort.InferenceSession.create(`${modelPath}/model.onnx`);

      if (selectedModel.type === 'binary_classifier') {
        artifacts = await loadBinaryArtifacts(modelPath);
      } else if (selectedModel.type === 'multiclass_classifier') {
        artifacts = await loadMulticlassArtifacts(modelPath);
      } else if (selectedModel.type === 'multiclass_sigmoid') {
        artifacts = await loadMulticlassSigmoidArtifacts(modelPath);
      }
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
    let result;
    if (selectedModel.type === 'binary_classifier') {
      result = await runBinaryInference(session, input, artifacts);
      addTerminalMessage(`Classification: ${result.label} (Score: ${result.probability.toFixed(4)})`);
    } else if (selectedModel.type === 'multiclass_classifier') {
      result = await runMulticlassInference(session, input, artifacts);
      addTerminalMessage(`Classification: ${result.label} (Score: ${result.probability.toFixed(4)})`);
    } else if (selectedModel.type === 'multiclass_sigmoid') {
      result = await runMulticlassSigmoidInference(session, input, artifacts);
      
      // Display results like the Python example
      addTerminalMessage(`⭐ Classification Results:`);
      result.predictions.forEach(pred => {
        addTerminalMessage(`  ${pred.status} ${pred.index}: ${pred.class} - ${pred.probability.toFixed(3)}`);
      });
    }
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
    { full: 'Welcome to WhiteLightning Model Playground', short: 'Welcome to model playground!' },
    { full: 'Select a model type and model to begin', short: 'Select model type!' },
    { full: 'You can try binary, multiclass, or multiclass sigmoid classification', short: 'Try binary, multiclass, or sigmoid!' },
    { full: 'Upload your own model or use our pre-trained models', short: 'Upload or use pre-trained!' },
    { full: 'Type your text and click Classify to get started', short: 'Type text & classify!' }
  ];
  
  const chatArea = document.querySelector('.terminal-content');
  chatArea.innerHTML = '';
  
  initialMessages.forEach(msg => {
    const messageDiv = document.createElement('p');
    messageDiv.className = 'initial-message';
    
    const fullTextSpan = document.createElement('span');
    fullTextSpan.className = 'full-text';
    fullTextSpan.textContent = msg.full;
    
    const shortTextSpan = document.createElement('span');
    shortTextSpan.className = 'short-text';
    shortTextSpan.textContent = msg.short;
    
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
    let models = [];
    if (selectedModelType === 'binary_classifier') models = BINARY_MODELS;
    else if (selectedModelType === 'multiclass_classifier') models = MULTICLASS_MODELS;
    else if (selectedModelType === 'multiclass_sigmoid') models = MULTICLASS_SIGMOID_MODELS;
    
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
});
