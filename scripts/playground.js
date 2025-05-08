
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

function renderMessages() {
  const chat = $('chatArea');
  chat.innerHTML = messages.map(m =>
    `<div class="message${m.isUser ? ' user' : ''}">${m.text}</div>`
  ).join('');
  chat.scrollTop = chat.scrollHeight;
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
  let sequence = words.map(word => tokenizer[word] || tokenizer[oovToken] || 1);
  sequence = sequence.slice(0, maxLen); 
  const padded = new Array(maxLen).fill(0); 
  sequence.forEach((val, idx) => (padded[idx] = val));
  return padded;
}


async function runBinaryInference(session, text, artifacts) {
  try {
    const vector = await preprocessBinaryText(text, artifacts);
    const tensor = new ort.Tensor('float32', vector, [1, 5000]);
    const feeds = { float_input: tensor };
    const results = await session.run(feeds);
    const probability = results['output'].data[0];
    const prediction = probability > 0.5 ? 1 : 0;
    const label = prediction === 1 ? 'Positive' : 'Negative';
    return { label, probability };
  } catch (error) {
    console.error('Error running binary inference:', error);
    throw new Error(`Inference failed: ${error.message}`);
  }
}


async function runMulticlassInference(session, text, artifacts) {
  try {
    const { tokenizer, labelMap } = artifacts;
    const tokenized = preprocessMulticlassText(text, tokenizer);
    const inputArray = new Int32Array(tokenized);
    const tensor = new ort.Tensor('int32', inputArray, [1, 30]);
    const feeds = { input: tensor };
    const results = await session.run(feeds);
    const outputTensor = results[Object.keys(results)[0]];
    const probabilities = outputTensor.data;
    const predictedClassIdx = probabilities.reduce(
      (maxIdx, val, idx) => (val > probabilities[maxIdx] ? idx : maxIdx),
      0
    );
    const label = labelMap[predictedClassIdx];
    const probability = probabilities[predictedClassIdx];
    return { label, probability };
  } catch (error) {
    console.error('Error running multiclass inference:', error);
    throw new Error(`Inference failed: ${error.message}`);
  }
}

async function loadModel() {
  if (!selectedModel) return;
  if (selectedModel.subClasses.length && !selectedModelSubclass) return;
  
  isLoading = true;
  setStatus('Loading...', false);
  messages.push({ text: `Loading model: ${selectedModel.name}...`, isUser: false });
  renderMessages();
  
  try {
    let modelPath = `../models/${selectedModel.type}/${selectedModel.prefix}`;
    if (selectedModel.subClasses.length && selectedModelSubclass) {
      modelPath += `(${selectedModelSubclass})`;
    }

 
    session = await ort.InferenceSession.create(`${modelPath}/model.onnx`);
    

    artifacts = selectedModel.type === 'binary_classifier' 
      ? await loadBinaryArtifacts(modelPath)
      : await loadMulticlassArtifacts(modelPath);

    setStatus('Model loaded', true);
    messages.push({ text: `Model loaded successfully! You can now start classifying text.`, isUser: false });
  } catch (e) {
    setStatus('Error loading', false);
    messages.push({ text: `Error: ${e.message}`, isUser: false });
  }
  
  isLoading = false;
  renderMessages();
}

async function handleClassify(e) {
  e.preventDefault();
  const input = $('inputText').value.trim();
  if (!input) return;
  
  messages.push({ text: input, isUser: true });
  renderMessages();
  
  if (!session) {
    messages.push({ text: 'Please select a model first', isUser: false });
    renderMessages();
    return;
  }
  
  isProcessing = true;
  setStatus('Processing...', false);
  messages.push({ text: 'Processing input, please wait...', isUser: false });
  renderMessages();
  
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
   
    messages.pop();
    
    
    messages.push({ 
      text: `Error processing input: ${error.message}`, 
      isUser: false 
    });
  } finally {
    isProcessing = false;
    setStatus('Model loaded', true);
    renderMessages();
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
    renderMessages();
  }
  
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
    renderMessages();
  });
  
  $('modelSelect').addEventListener('change', e => {
    const models = selectedModelType === 'binary_classifier' ? BINARY_MODELS : MULTICLASS_MODELS;
    selectedModel = models.find(m => m.name === e.target.value);
    selectedModelSubclass = null;
    renderModelSubclassOptions();
    setStatus('No model loaded', false);
    session = null;
    messages = [];
    renderMessages();
    loadModel();
  });
  
  $('modelSubclassSelect').addEventListener('change', e => {
    selectedModelSubclass = e.target.value;
    setStatus('No model loaded', false);
    session = null;
    messages = [];
    renderMessages();
    loadModel();
  });
  
  $('inputForm').addEventListener('submit', handleClassify);
  
  $('uploadCustomBtn').addEventListener('click', () => {
    messages.push({ text: 'Custom model upload functionality coming soon!', isUser: false });
    renderMessages();
  });
});
