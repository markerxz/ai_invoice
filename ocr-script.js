document.addEventListener('DOMContentLoaded', () => {
    // Default model configurations
    const DEFAULT_MODEL_CONFIGS = {
        gemini: {
            name: 'OCI Gemini 2.5 Pro',
            modelId: 'ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya5decawi4guyah3nf2tbv3fzhzb3kbagjn7nqxatuwxzq',
            maxTokens: 65536,
            temperature: 0.1,
            frequencyPenalty: 0,
            presencePenalty: 0,
            topK: 1,
            topP: 0.95
        },
        grok: {
            name: 'OCI Grok 4',
            modelId: 'ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya3bsfz4ogiuv3yc7gcnlry7gi3zzx6tnikg6jltqszm2q',
            maxTokens: 63565,
            temperature: 0.1,
            topK: 0,
            topP: 1
        },
        llama: {
            name: 'OCI Llama 4 Maverick',
            modelId: 'ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceyayjawvuonfkw2ua4bob4rlnnlhs522pafbglivtwlfzta',
            maxTokens: 4000,
            temperature: 0.1,
            frequencyPenalty: 0,
            presencePenalty: 0,
            topP: 0.75
        }
    };

    // Load model configs from localStorage or use defaults
    let MODEL_CONFIGS = JSON.parse(localStorage.getItem('model_configs')) || JSON.parse(JSON.stringify(DEFAULT_MODEL_CONFIGS));

    // Sample receipts from the Sample Receipt folder
    const SAMPLE_RECEIPTS = [
        'Sample%20Receipt/image.jpg',
        'Sample%20Receipt/image2.jpg',
        'Sample%20Receipt/image3.jpg',
        'Sample%20Receipt/image4.jpg',
        'Sample%20Receipt/image7.jpg',
        'Sample%20Receipt/40542.png',
        'Sample%20Receipt/41276.png'
    ];

    // Default system prompt
    const DEFAULT_SYSTEM_PROMPT = `You are an expert OCR and receipt analysis assistant. Analyze the uploaded receipt image and extract all relevant information including:
- Merchant/Store name
- Date and time
- Items purchased with quantities and prices
- Subtotal, tax, and total amount
- Payment method
- Any other relevant details

Present the information in a clear, structured format.`;

    // DOM Elements
    const uploadArea = document.getElementById('upload-area');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const removeBtn = document.getElementById('remove-btn');
    const modelSelect = document.getElementById('model-select');
    const systemPrompt = document.getElementById('system-prompt');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsContent = document.getElementById('results-content');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const sampleGrid = document.getElementById('sample-grid');

    // Settings modal elements
    const settingsModal = document.getElementById('settings-modal');
    const settingsTrigger = document.getElementById('settings-trigger');
    const closeModalBtn = document.querySelector('.close-modal');
    const saveSettingsBtn = document.getElementById('save-settings');
    const compartmentInput = document.getElementById('compartment-id');
    const apiEndpointInput = document.getElementById('api-endpoint');

    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // System prompts elements
    const savedPromptsSelect = document.getElementById('saved-prompts');
    const promptNameInput = document.getElementById('prompt-name');
    const settingsSystemPrompt = document.getElementById('settings-system-prompt');
    const savePromptBtn = document.getElementById('save-prompt-btn');
    const deletePromptBtn = document.getElementById('delete-prompt-btn');

    // Model settings elements
    const geminiTempInput = document.getElementById('gemini-temp');
    const geminiTokensInput = document.getElementById('gemini-tokens');
    const geminiTopKInput = document.getElementById('gemini-topk');
    const geminiTopPInput = document.getElementById('gemini-topp');

    const grokTempInput = document.getElementById('grok-temp');
    const grokTokensInput = document.getElementById('grok-tokens');
    const grokTopKInput = document.getElementById('grok-topk');
    const grokTopPInput = document.getElementById('grok-topp');

    const llamaTempInput = document.getElementById('llama-temp');
    const llamaTokensInput = document.getElementById('llama-tokens');
    const llamaTopKInput = document.getElementById('llama-topk');
    const llamaTopPInput = document.getElementById('llama-topp');

    const resetModelsBtn = document.getElementById('reset-models-btn');

    // State
    let selectedImageBase64 = null;
    let currentResult = '';
    let config = {
        compartmentId: localStorage.getItem('oci_compartment_id') || 'ocid1.compartment.oc1..aaaaaaaancmbh4gcptvcfm75ton5crgee2paqny2ank57m7pfqbbdun373bq',
        apiEndpoint: localStorage.getItem('oci_api_endpoint') || 'http://localhost:3000/generate'
    };

    // Initialize
    compartmentInput.value = config.compartmentId;
    apiEndpointInput.value = config.apiEndpoint;
    systemPrompt.value = DEFAULT_SYSTEM_PROMPT;
    loadSampleReceipts();
    loadSavedPrompts();
    loadModelSettings();

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update active states
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    // Load sample receipts
    function loadSampleReceipts() {
        SAMPLE_RECEIPTS.forEach(path => {
            const div = document.createElement('div');
            div.className = 'sample-item';
            div.innerHTML = `<img src="${path}" alt="Sample receipt">`;
            div.addEventListener('click', () => loadSampleImage(path));
            sampleGrid.appendChild(div);
        });
    }

    // Load sample image
    async function loadSampleImage(path) {
        try {
            const response = await fetch(path);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImageBase64 = e.target.result;
                displayImage(selectedImageBase64);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error loading sample image:', error);
        }
    }

    // Upload area click
    uploadArea.addEventListener('click', (e) => {
        if (e.target !== removeBtn && !removeBtn.contains(e.target)) {
            fileInput.click();
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                selectedImageBase64 = event.target.result;
                displayImage(selectedImageBase64);
            };
            reader.readAsDataURL(file);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                selectedImageBase64 = event.target.result;
                displayImage(selectedImageBase64);
            };
            reader.readAsDataURL(file);
        }
    });

    // Display image
    function displayImage(base64) {
        previewImage.src = base64;
        previewImage.style.display = 'block';
        uploadPlaceholder.style.display = 'none';
        removeBtn.style.display = 'flex';
        analyzeBtn.disabled = false;
    }

    // Remove image
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedImageBase64 = null;
        previewImage.src = '';
        previewImage.style.display = 'none';
        uploadPlaceholder.style.display = 'flex';
        removeBtn.style.display = 'none';
        fileInput.value = '';
        analyzeBtn.disabled = true;
    });

    // Analyze button
    analyzeBtn.addEventListener('click', async () => {
        if (!selectedImageBase64) {
            alert('Please upload an image first');
            return;
        }

        if (!config.compartmentId) {
            alert('Please configure your Compartment ID in Settings');
            settingsModal.classList.add('active');
            return;
        }

        const selectedModel = modelSelect.value;
        const modelConfig = MODEL_CONFIGS[selectedModel];
        const prompt = systemPrompt.value.trim();

        // Show loading state
        analyzeBtn.disabled = true;
        analyzeBtn.classList.add('loading');
        analyzeBtn.innerHTML = '<i class="fa-solid fa-circle-notch"></i> Analyzing...';

        resultsContent.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-circle-notch"></i>
                <p>Analyzing receipt with ${modelConfig.name}...</p>
            </div>
        `;

        try {
            const requestBody = {
                prompt: prompt || "Analyze this receipt and extract all information.",
                compartmentId: config.compartmentId,
                modelId: modelConfig.modelId,
                image: selectedImageBase64,
                // Include model-specific parameters
                maxTokens: modelConfig.maxTokens,
                temperature: modelConfig.temperature,
                topK: modelConfig.topK,
                topP: modelConfig.topP
            };

            // Add optional parameters if they exist
            if (modelConfig.frequencyPenalty !== undefined) {
                requestBody.frequencyPenalty = modelConfig.frequencyPenalty;
            }
            if (modelConfig.presencePenalty !== undefined) {
                requestBody.presencePenalty = modelConfig.presencePenalty;
            }

            const response = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error && data.error.includes("ECONNREFUSED")) {
                    throw new Error("Could not connect to local proxy. Is 'node server.js' running?");
                }
                throw new Error(data.message || data.error || 'Failed to generate response');
            }

            const resultText = data.text || JSON.stringify(data);
            currentResult = resultText;

            // Display result
            resultsContent.innerHTML = `<div class="result-text">${escapeHtml(resultText)}</div>`;
            copyBtn.style.display = 'block';
            downloadBtn.style.display = 'block';

        } catch (error) {
            resultsContent.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Error</p>
                    <span>${escapeHtml(error.message)}</span>
                </div>
            `;
            console.error('Analysis error:', error);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('loading');
            analyzeBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze Receipt';
        }
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(currentResult);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    });

    // Download as text
    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([currentResult], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-analysis-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // System Prompts Management
    function loadSavedPrompts() {
        const prompts = JSON.parse(localStorage.getItem('saved_prompts')) || {};
        savedPromptsSelect.innerHTML = '<option value="">-- Select a saved prompt --</option>';

        const quickPromptSelect = document.getElementById('quick-prompt-select');
        if (quickPromptSelect) {
            quickPromptSelect.innerHTML = '<option value="">-- Start from scratch --</option>';
        }

        Object.keys(prompts).forEach(name => {
            // Settings dropdown
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            savedPromptsSelect.appendChild(option);

            // Main page dropdown
            if (quickPromptSelect) {
                const quickOption = document.createElement('option');
                quickOption.value = name;
                quickOption.textContent = name;
                quickPromptSelect.appendChild(quickOption);
            }
        });
    }

    savedPromptsSelect.addEventListener('change', (e) => {
        const selectedName = e.target.value;
        if (selectedName) {
            const prompts = JSON.parse(localStorage.getItem('saved_prompts')) || {};
            const promptText = prompts[selectedName];
            if (promptText) {
                settingsSystemPrompt.value = promptText;
                promptNameInput.value = selectedName;
            }
        }
    });

    savePromptBtn.addEventListener('click', () => {
        const name = promptNameInput.value.trim();
        const promptText = settingsSystemPrompt.value.trim();

        if (!name) {
            alert('Please enter a prompt name');
            return;
        }

        if (!promptText) {
            alert('Please enter a system prompt');
            return;
        }

        const prompts = JSON.parse(localStorage.getItem('saved_prompts')) || {};
        prompts[name] = promptText;
        localStorage.setItem('saved_prompts', JSON.stringify(prompts));

        // Update main system prompt
        systemPrompt.value = promptText;

        loadSavedPrompts();
        alert(`Prompt "${name}" saved successfully!`);
    });

    deletePromptBtn.addEventListener('click', () => {
        const selectedName = savedPromptsSelect.value;
        if (!selectedName) {
            alert('Please select a prompt to delete');
            return;
        }

        if (confirm(`Are you sure you want to delete "${selectedName}"?`)) {
            const prompts = JSON.parse(localStorage.getItem('saved_prompts')) || {};
            delete prompts[selectedName];
            localStorage.setItem('saved_prompts', JSON.stringify(prompts));

            promptNameInput.value = '';
            settingsSystemPrompt.value = '';
            loadSavedPrompts();
            alert('Prompt deleted successfully');
        }
    });

    // Main page quick prompt selector
    const quickPromptSelect = document.getElementById('quick-prompt-select');
    if (quickPromptSelect) {
        quickPromptSelect.addEventListener('change', (e) => {
            const selectedName = e.target.value;
            if (selectedName) {
                const prompts = JSON.parse(localStorage.getItem('saved_prompts')) || {};
                const promptText = prompts[selectedName];
                if (promptText) {
                    systemPrompt.value = promptText;
                }
            } else {
                systemPrompt.value = DEFAULT_SYSTEM_PROMPT;
            }
        });
    }



    // Model Settings Management
    function loadModelSettings() {
        // Gemini
        geminiTempInput.value = MODEL_CONFIGS.gemini.temperature;
        geminiTokensInput.value = MODEL_CONFIGS.gemini.maxTokens;
        geminiTopKInput.value = MODEL_CONFIGS.gemini.topK;
        geminiTopPInput.value = MODEL_CONFIGS.gemini.topP;

        // Grok
        grokTempInput.value = MODEL_CONFIGS.grok.temperature;
        grokTokensInput.value = MODEL_CONFIGS.grok.maxTokens;
        grokTopKInput.value = MODEL_CONFIGS.grok.topK;
        grokTopPInput.value = MODEL_CONFIGS.grok.topP;

        // Llama
        llamaTempInput.value = MODEL_CONFIGS.llama.temperature;
        llamaTokensInput.value = MODEL_CONFIGS.llama.maxTokens;
        llamaTopKInput.value = MODEL_CONFIGS.llama.topK;
        llamaTopPInput.value = MODEL_CONFIGS.llama.topP;
    }

    function saveModelSettings() {
        // Gemini
        MODEL_CONFIGS.gemini.temperature = parseFloat(geminiTempInput.value);
        MODEL_CONFIGS.gemini.maxTokens = parseInt(geminiTokensInput.value);
        MODEL_CONFIGS.gemini.topK = parseInt(geminiTopKInput.value);
        MODEL_CONFIGS.gemini.topP = parseFloat(geminiTopPInput.value);

        // Grok
        MODEL_CONFIGS.grok.temperature = parseFloat(grokTempInput.value);
        MODEL_CONFIGS.grok.maxTokens = parseInt(grokTokensInput.value);
        MODEL_CONFIGS.grok.topK = parseInt(grokTopKInput.value);
        MODEL_CONFIGS.grok.topP = parseFloat(grokTopPInput.value);

        // Llama
        MODEL_CONFIGS.llama.temperature = parseFloat(llamaTempInput.value);
        MODEL_CONFIGS.llama.maxTokens = parseInt(llamaTokensInput.value);
        MODEL_CONFIGS.llama.topK = parseInt(llamaTopKInput.value);
        MODEL_CONFIGS.llama.topP = parseFloat(llamaTopPInput.value);

        localStorage.setItem('model_configs', JSON.stringify(MODEL_CONFIGS));
    }

    resetModelsBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all model settings to defaults?')) {
            MODEL_CONFIGS = JSON.parse(JSON.stringify(DEFAULT_MODEL_CONFIGS));
            localStorage.setItem('model_configs', JSON.stringify(MODEL_CONFIGS));
            loadModelSettings();
            alert('Model settings reset to defaults');
        }
    });

    // Settings modal
    settingsTrigger.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
    });

    saveSettingsBtn.addEventListener('click', () => {
        const newCompartment = compartmentInput.value.trim();
        const newEndpoint = apiEndpointInput.value.trim();

        if (newCompartment) {
            config.compartmentId = newCompartment;
            localStorage.setItem('oci_compartment_id', newCompartment);
        }

        if (newEndpoint) {
            config.apiEndpoint = newEndpoint;
            localStorage.setItem('oci_api_endpoint', newEndpoint);
        }

        // Save model settings
        saveModelSettings();

        settingsModal.classList.remove('active');
        alert('All settings saved successfully!');
    });

    // Utility function
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    // Sidebar toggle logic
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
});
