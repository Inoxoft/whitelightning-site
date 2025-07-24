// Command Generator JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const apiKeyInput = document.getElementById('apiKey');
    const problemDescriptionInput = document.getElementById('problemDescription');
    const platformBtns = document.querySelectorAll('.platform-btn');
    const generateBtn = document.getElementById('generateCmd');
    const outputSection = document.getElementById('output-section');
    const generatedCommandElement = document.getElementById('generatedCommand');
    const copyBtn = document.getElementById('copyCommand');
    const copySuccess = document.getElementById('copySuccess');
    const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
    const advancedPanel = document.getElementById('advancedPanel');

    // Advanced options elements
    const modelTypeSelect = document.getElementById('modelType');
    const activationSelect = document.getElementById('activation');
    const dataGenModelInput = document.getElementById('dataGenModel');
    const configLlmModelInput = document.getElementById('configLlmModel');
    const outputPathInput = document.getElementById('outputPath');
    const languageInput = document.getElementById('language');
    const refinementCyclesInput = document.getElementById('refinementCycles');
    const batchSizeInput = document.getElementById('batchSize');
    const maxFeaturesInput = document.getElementById('maxFeatures');
    const edgeCaseVolumeInput = document.getElementById('edgeCaseVolume');
    const generateEdgeCasesSelect = document.getElementById('generateEdgeCases');
    const skipDataGenSelect = document.getElementById('skipDataGen');
    const skipModelTrainingSelect = document.getElementById('skipModelTraining');
    const configPathInput = document.getElementById('configPath');
    const useOwnDatasetInput = document.getElementById('useOwnDataset');

    let selectedPlatform = 'unix'; // Default to unix

    // Toggle advanced options
    toggleAdvancedBtn.addEventListener('click', function() {
        const isVisible = advancedPanel.style.display !== 'none';
        advancedPanel.style.display = isVisible ? 'none' : 'block';
        this.textContent = isVisible ? 'Show' : 'Hide';
    });

    // Platform selection
    platformBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            platformBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Update selected platform
            selectedPlatform = this.dataset.platform;
            
            // Hide output if shown
            outputSection.style.display = 'none';
            copySuccess.style.display = 'none';
        });
    });

    // Generate command
    generateBtn.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        const problemDescription = problemDescriptionInput.value.trim();

        // Validate required fields
        if (!apiKey) {
            alert('Please enter your OpenRouter API key');
            apiKeyInput.focus();
            return;
        }

        if (!problemDescription) {
            alert('Please enter a problem description');
            problemDescriptionInput.focus();
            return;
        }

        // Collect all parameters
        const params = collectAllParameters(apiKey, problemDescription);
        
        // Generate command based on platform
        const command = generateDockerCommand(params, selectedPlatform);
        
        // Display the command
        displayCommand(command);
    });

    // Copy command to clipboard
    copyBtn.addEventListener('click', async function() {
        const command = generatedCommandElement.textContent;
        
        try {
            await navigator.clipboard.writeText(command);
            showCopySuccess();
        } catch (err) {
            // Fallback for older browsers
            fallbackCopyTextToClipboard(command);
        }
    });

    // Collect all parameters from the form
    function collectAllParameters(apiKey, problemDescription) {
        const params = {
            apiKey: apiKey,
            problemDescription: problemDescription
        };

        // Only add optional parameters if they have values
        const optionalParams = [
            { key: 'modelType', element: modelTypeSelect, flag: '--model-type' },
            { key: 'activation', element: activationSelect, flag: '--activation' },
            { key: 'dataGenModel', element: dataGenModelInput, flag: '--data-gen-model' },
            { key: 'configLlmModel', element: configLlmModelInput, flag: '--config-llm-model' },
            { key: 'outputPath', element: outputPathInput, flag: '-o' },
            { key: 'language', element: languageInput, flag: '--lang' },
            { key: 'refinementCycles', element: refinementCyclesInput, flag: '--refinement-cycles' },
            { key: 'batchSize', element: batchSizeInput, flag: '--batch-size' },
            { key: 'maxFeatures', element: maxFeaturesInput, flag: '--max-features' },
            { key: 'edgeCaseVolume', element: edgeCaseVolumeInput, flag: '--edge-case-volume-per-class' },
            { key: 'generateEdgeCases', element: generateEdgeCasesSelect, flag: '--generate-edge-cases' },
            { key: 'skipDataGen', element: skipDataGenSelect, flag: '--skip-data-gen' },
            { key: 'skipModelTraining', element: skipModelTrainingSelect, flag: '--skip-model-training' },
            { key: 'configPath', element: configPathInput, flag: '--config-path' },
            { key: 'useOwnDataset', element: useOwnDatasetInput, flag: '--use-own-dataset' }
        ];

        optionalParams.forEach(param => {
            const value = param.element.value.trim();
            // Include parameter if it has a value and is not empty
            if (value && value !== '') {
                params[param.key] = { value: value, flag: param.flag };
            }
        });

        return params;
    }

    // Generate Docker command based on platform and parameters
    function generateDockerCommand(params, platform) {
        const baseDockerCmd = 'docker run --rm';
        const volumeMount = platform === 'windows' ? '-v "${PWD}:/app/models"' : '-v "$(pwd)":/app/models';
        const envVar = `OPEN_ROUTER_API_KEY="${params.apiKey}"`;
        const image = 'ghcr.io/inoxoft/whitelightning:latest';
        const pythonCmd = 'python -m text_classifier.agent';
        
        // Build Python command arguments - start with -p on new line
        let pythonArgs = [];
        pythonArgs.push(`-p "${params.problemDescription}"`);
        
        // Default values to skip showing
        const defaults = {
            'modelType': 'tensorflow',
            'activation': 'auto',
            'generateEdgeCases': 'true',
            'skipDataGen': 'false',
            'skipModelTraining': 'false'
        };
        
        // Add optional parameters only if they differ from defaults or have values
        Object.keys(params).forEach(key => {
            if (key !== 'apiKey' && key !== 'problemDescription' && params[key]) {
                const param = params[key];
                const value = param.value;
                
                // Skip if value matches default
                if (defaults[key] && defaults[key] === value) {
                    return;
                }
                
                // Add parameter
                if (value === 'true' || value === 'false') {
                    pythonArgs.push(`${param.flag} ${value}`);
                } else {
                    // Special handling for --use-own-dataset
                    if (param.flag === '--use-own-dataset') {
                        pythonArgs.push(`${param.flag}="/app/models/own_data/${value}"`);
                    } else {
                        pythonArgs.push(`${param.flag} "${value}"`);
                    }
                }
            }
        });

        const lineBreak = platform === 'windows' ? ' `' : ' \\';
        
        // Build the full command
        let command = `${baseDockerCmd}${lineBreak}
    ${volumeMount}${lineBreak}
    -e ${envVar}${lineBreak}
    ${image}${lineBreak}
    ${pythonCmd}`;
        
        // Add each python argument on its own line
        pythonArgs.forEach((arg, index) => {
            command += `${lineBreak}
    ${arg}`;
        });

        return command;
    }

    // Display the generated command
    function displayCommand(command) {
        generatedCommandElement.textContent = command;
        outputSection.style.display = 'block';
        copySuccess.style.display = 'none';
        
        // Scroll to output
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add typing animation
        generatedCommandElement.classList.add('typing-animation');
        setTimeout(() => {
            generatedCommandElement.classList.remove('typing-animation');
        }, 1500);
    }

    // Show copy success message
    function showCopySuccess() {
        copySuccess.style.display = 'block';
        setTimeout(() => {
            copySuccess.style.display = 'none';
        }, 3000);
    }

    // Fallback copy function for older browsers
    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Avoid scrolling to bottom
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopySuccess();
            } else {
                alert('Failed to copy command to clipboard');
            }
        } catch (err) {
            alert('Failed to copy command to clipboard');
        }
        
        document.body.removeChild(textArea);
    }

    // Auto-focus on API key input
    apiKeyInput.focus();

    // Add focus handlers for all terminal inputs and selects
    const allTerminalInputs = document.querySelectorAll('.terminal-input, .terminal-select');
    
    allTerminalInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.borderColor = 'var(--main-green)';
        });
        
        input.addEventListener('blur', function() {
            this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });
    });

    // Add Enter key support for inputs
    apiKeyInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            problemDescriptionInput.focus();
        }
    });

    problemDescriptionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateBtn.click();
        }
    });



    // Add terminal cursor effect
    function addCursor() {
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        cursor.innerHTML = '&nbsp;';
        return cursor;
    }

    // Easter egg: Konami code for fun terminal effect
    let konamiCode = [];
    const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA
    
    document.addEventListener('keydown', function(e) {
        konamiCode.push(e.keyCode);
        
        if (konamiCode.length > konamiSequence.length) {
            konamiCode.shift();
        }
        
        if (konamiCode.length === konamiSequence.length && 
            konamiCode.every((code, index) => code === konamiSequence[index])) {
            
            // Easter egg activated
            document.body.style.animation = 'matrix 2s ease-in-out';
            setTimeout(() => {
                document.body.style.animation = '';
            }, 2000);
        }
    });
});

// Matrix rain effect CSS for easter egg
const style = document.createElement('style');
style.textContent = `
    @keyframes matrix {
        0% { 
            color: #39ff14;
            text-shadow: 0 0 10px #39ff14;
        }
        50% { 
            color: #00ff00;
            text-shadow: 0 0 20px #00ff00;
        }
        100% { 
            color: #e6ffe6;
            text-shadow: none;
        }
    }
`;
document.head.appendChild(style); 