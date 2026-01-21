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

    // Sample invoices from the Sample Bill folder
    const SAMPLE_INVOICES = [
        'Sample%20Bill/003.png',
        'Sample%20Bill/Screenshot%202026-01-20%20002929.png',
        'Sample%20Bill/_f3d27de249.jpg',
        'Sample%20Bill/ugc-574f8f99a57a1c2fe2bd0dfc.jpg',
        'Sample%20Bill/%E0%B9%83%E0%B8%9A%E0%B8%81%E0%B8%B3%E0%B8%81%E0%B8%B1%E0%B8%9A%E0%B8%A0%E0%B8%B2%E0%B8%A9%E0%B8%B5_iTAX.jpg'
    ];

    // Default system prompt for invoices
    const DEFAULT_SYSTEM_PROMPT = `You are an AI system specialized in extracting structured data from Thai invoices, tax invoices, receipts, and delivery bills.

Your task:
- Analyze the provided document image
- Extract factual information ONLY if it is explicitly visible
- Support both printed and handwritten Thai documents
- Return the result in STRICT JSON format
- DO NOT guess, infer, or fabricate data

Critical rules:
1. Return JSON ONLY (no explanation, no markdown)
2. If a field is missing, unclear, or unreadable → return null
3. Preserve original language (Thai / English) exactly as shown
4. Dates must be converted to ISO 8601 format: YYYY-MM-DD
5. Monetary values must be numbers (no commas, no currency symbols)
6. VAT rate must be numeric (e.g. 7 for 7%)
7. If multiple totals exist, use the final payable amount
8. If the document contains handwriting, set "handwritten": true
9. **Calculate missing values when possible:**
   - If quantity and total_price are visible but unit_price is missing → calculate: unit_price = total_price / quantity
   - If quantity and unit_price are visible but total_price is missing → calculate: total_price = quantity × unit_price
   - If subtotal and VAT are visible but total is missing → calculate: total = subtotal + VAT
   - If total and VAT are visible but subtotal is missing → calculate: subtotal = total - VAT

Document type classification:
- "TAX_INVOICE" → ใบกำกับภาษี
- "RECEIPT" → ใบเสร็จรับเงิน
- "TAX_INVOICE_RECEIPT" → ใบเสร็จรับเงิน / ใบกำกับภาษี
- "CASH_SALE" → เงินสด / Cash Sale
- "DELIVERY_BILL" → ใบส่งของ
- Otherwise → "UNKNOWN"

Return JSON using this schema:

{
  "document_type": string,
  "document_no": string | null,
  "issue_date": string | null,
  "currency": string | null,
  "handwritten": boolean,

  "seller": {
    "name": string | null,
    "tax_id": string | null,
    "address": string | null,
    "phone": string | null
  },

  "buyer": {
    "name": string | null,
    "tax_id": string | null,
    "address": string | null,
    "phone": string | null
  },

  "items": [
    {
      "description": string | null,
      "quantity": number | null,
      "unit_price": number | null,
      "total_price": number | null
    }
  ],

  "subtotal": number | null,
  "vat_rate": number | null,
  "vat_amount": number | null,
  "total_amount": number | null,
  
  "_calculated_fields": [
    "items[0].unit_price",
    "subtotal",
    "vat_amount"
  ]
}

**IMPORTANT**: The "_calculated_fields" array must list the JSON paths of all fields that were calculated (not directly visible in the document). Use dot notation for nested fields and array indices for items.
Examples:
- "items[0].unit_price" - calculated unit price for first item
- "items[1].total_price" - calculated total for second item  
- "subtotal" - calculated subtotal
- "vat_amount" - calculated VAT amount
- "total_amount" - calculated total

  "seller": {
    "name": string | null,
    "tax_id": string | null,
    "address": string | null,
    "phone": string | null
  },

  "buyer": {
    "name": string | null,
    "tax_id": string | null,
    "address": string | null,
    "phone": string | null
  },

  "items": [
    {
      "description": string | null,
      "quantity": number | null,
      "unit_price": number | null,
      "amount": number | null
    }
  ],

  "subtotal": number | null,
  "vat_rate": number | null,
  "vat_amount": number | null,
  "total_amount": number | null,
  "currency": "THB",

  "payment_method": string | null,
  "remarks": string | null,
  "handwritten": boolean
}`;

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
    const jsonView = document.getElementById('json-view');
    const viewJsonBtn = document.getElementById('view-json');
    const viewTableBtn = document.getElementById('view-table');
    // const convertBtn = document.getElementById('convert-btn'); // Removed
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

    // Editor Elements
    const emptyState = document.getElementById('empty-state');
    const editorContainer = document.getElementById('editor-container');
    const docTypeInput = document.getElementById('doc-type');
    const docNoInput = document.getElementById('doc-no');
    const docDateInput = document.getElementById('doc-date');
    const docCurrencyInput = document.getElementById('doc-currency');
    const sellerNameInput = document.getElementById('seller-name');
    const sellerTaxIdInput = document.getElementById('seller-tax-id');
    const sellerAddressInput = document.getElementById('seller-address');
    const buyerNameInput = document.getElementById('buyer-name');
    const buyerTaxIdInput = document.getElementById('buyer-tax-id');
    const buyerAddressInput = document.getElementById('buyer-address');
    const itemsBody = document.getElementById('items-body');
    const addItemBtn = document.getElementById('add-row-btn');
    const subtotalInput = document.getElementById('subtotal');
    const vatAmountInput = document.getElementById('vat-amount');
    const totalAmountInput = document.getElementById('total-amount');
    const saveDbBtn = document.getElementById('save-db-btn');

    // State
    let selectedImageBase64 = null;
    let currentResult = '';
    let editingInvoiceId = null; // New state for edit mode
    let config = {
        compartmentId: localStorage.getItem('oci_compartment_id') || 'ocid1.compartment.oc1..aaaaaaaancmbh4gcptvcfm75ton5crgee2paqny2ank57m7pfqbbdun373bq',
        apiEndpoint: localStorage.getItem('oci_api_endpoint') || 'http://localhost:3000/generate'
    };

    // Check for Invoice ID in URL (Edit Mode)
    const urlParams = new URLSearchParams(window.location.search);
    const urlInvoiceId = urlParams.get('id');

    if (urlInvoiceId) {
        initEditMode(urlInvoiceId);
    }

    async function initEditMode(id) {
        try {
            editingInvoiceId = id;

            // UI Adjustments for Edit Mode
            document.querySelector('.upload-section').style.display = 'none'; // Hide upload
            document.querySelector('.config-section').style.display = 'none'; // Hide config
            document.querySelector('.results-section').classList.add('full-width'); // Expand results

            // Adjust header to show we are editing
            document.querySelector('h1').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Invoice #${id}`;

            // Show editor immediately
            if (emptyState) emptyState.style.display = 'none';
            if (editorContainer) editorContainer.style.display = 'flex';
            toggleView('table'); // Ensure table view is active

            // Fetch Data
            const response = await fetch(`http://localhost:3000/invoice/${id}`);
            if (!response.ok) throw new Error('Failed to load invoice');

            const invoiceData = await response.json();
            populateEditor(invoiceData);

        } catch (error) {
            console.error('Edit Mode Error:', error);
            alert(`Error loading invoice: ${error.message}`);
        }
    }

    // Initialize
    compartmentInput.value = config.compartmentId;
    apiEndpointInput.value = config.apiEndpoint;
    systemPrompt.value = DEFAULT_SYSTEM_PROMPT;
    loadSampleInvoices();
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

    // Load sample invoices
    function loadSampleInvoices() {
        SAMPLE_INVOICES.forEach(path => {
            const div = document.createElement('div');
            div.className = 'sample-item';
            div.innerHTML = `<img src="${path}" alt="Sample invoice" onerror="this.src='https://via.placeholder.com/80?text=Error'">`;
            div.addEventListener('click', () => loadSampleImage(path));
            sampleGrid.appendChild(div);
        });
    }

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
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
            alert('Error loading sample image. Make sure the file exists.');
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

        // Hide existing elements and show loading
        if (emptyState) emptyState.style.display = 'none';
        if (jsonView) jsonView.style.display = 'none';
        if (editorContainer) editorContainer.style.display = 'none';

        // Create or update loading state
        let loadingState = resultsContent.querySelector('.loading-state');
        if (!loadingState) {
            loadingState = document.createElement('div');
            loadingState.className = 'loading-state';
            resultsContent.insertBefore(loadingState, resultsContent.firstChild);
        }
        loadingState.innerHTML = `
            <i class="fa-solid fa-circle-notch"></i>
            <p>Analyzing invoice with ${modelConfig.name}...</p>
        `;
        loadingState.style.display = 'flex';

        try {
            const requestBody = {
                prompt: prompt || "Analyze this invoice and extract all information.",
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

            let resultText = data.text || JSON.stringify(data);

            // Clean markdown formatting if present
            resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();

            currentResult = resultText;
            jsonView.innerHTML = escapeHtml(resultText);

            // Hide loading state
            const loadingState = resultsContent.querySelector('.loading-state');
            if (loadingState) loadingState.style.display = 'none';

            // Enable buttons
            if (copyBtn) copyBtn.style.display = 'block';
            if (downloadBtn) downloadBtn.style.display = 'block';

            // Default View - CHANGED TO TABLE
            toggleView('table');

            // Re-enable helper buttons if they exist
            if (copyBtn) copyBtn.style.display = 'block';
            if (downloadBtn) downloadBtn.style.display = 'block';

            // Hide empty state
            if (emptyState) emptyState.style.display = 'none';

        } catch (error) {
            // Hide loading state
            const loadingState = resultsContent.querySelector('.loading-state');
            if (loadingState) loadingState.style.display = 'none';

            // Hide other views
            if (jsonView) jsonView.style.display = 'none';
            if (editorContainer) editorContainer.style.display = 'none';

            // Show error in empty state
            if (emptyState) {
                emptyState.innerHTML = `
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Error</p>
                    <span>${escapeHtml(error.message)}</span>
                `;
                emptyState.style.display = 'flex';
            }
            console.error('Analysis error:', error);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('loading');
            analyzeBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyze Invoice';
        }
    });

    // Editor Helper Functions
    function populateEditor(data) {
        // Document Info
        docTypeInput.value = data.document_type || '';
        docNoInput.value = data.document_no || '';
        docDateInput.value = data.issue_date || '';
        docCurrencyInput.value = data.currency || 'THB';

        // Seller
        if (data.seller) {
            sellerNameInput.value = data.seller.name || '';
            sellerTaxIdInput.value = data.seller.tax_id || '';
            sellerAddressInput.value = data.seller.address || '';
        }

        // Buyer
        if (data.buyer) {
            buyerNameInput.value = data.buyer.name || '';
            buyerTaxIdInput.value = data.buyer.tax_id || '';
            buyerAddressInput.value = data.buyer.address || '';
        }

        // Items
        itemsBody.innerHTML = '';
        if (data.items && Array.isArray(data.items)) {
            data.items.forEach(item => {
                const row = createItemRow(item);
                itemsBody.appendChild(row);
            });
        }

        // Totals
        subtotalInput.value = data.subtotal || 0;
        vatAmountInput.value = data.vat_amount || 0;
        totalAmountInput.value = data.total_amount || 0;
    }

    function createItemRow(item = {}) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="item-desc" value="${item.description || ''}" placeholder="Description"></td>
            <td><input type="number" class="item-qty" value="${item.quantity || 0}" step="1"></td>
            <td><input type="number" class="item-price" value="${item.unit_price || 0}" step="0.01"></td>
            <td><input type="number" class="item-total" value="${item.amount || 0}" step="0.01" readonly></td>
            <td>
                <button class="delete-row-btn" title="Remove row">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        // Add event listeners for calculations
        const qtyInput = tr.querySelector('.item-qty');
        const priceInput = tr.querySelector('.item-price');
        const totalInput = tr.querySelector('.item-total');
        const deleteBtn = tr.querySelector('.delete-row-btn');

        const updateRowTotal = () => {
            const qty = parseFloat(qtyInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const total = qty * price;
            totalInput.value = total.toFixed(2);
            calculateGrandTotals();
        };

        qtyInput.addEventListener('input', updateRowTotal);
        priceInput.addEventListener('input', updateRowTotal);

        deleteBtn.addEventListener('click', () => {
            tr.remove();
            calculateGrandTotals();
        });

        return tr;
    }

    function calculateGrandTotals() {
        let subtotal = 0;
        const rows = itemsBody.querySelectorAll('tr');

        rows.forEach(row => {
            const totalInput = row.querySelector('.item-total');
            subtotal += parseFloat(totalInput.value) || 0;
        });

        subtotalInput.value = subtotal.toFixed(2);

        // Simple 7% VAT assumption if not manually set (could be improved)
        // For now, we just sum up totals. 
        // Ideally we keep VAT separate or manual.
        // Let's rely on manual input or basic recalc if modified.
        // For this demo, let's keep it simple: just recalculate Total Amount as Subtotal + VAT

        const vat = parseFloat(vatAmountInput.value) || 0;
        const total = subtotal + vat;
        totalAmountInput.value = total.toFixed(2);
    }

    // Add Row Handler
    addItemBtn.addEventListener('click', () => {
        const row = createItemRow({ description: '', quantity: 1, unit_price: 0, amount: 0 });
        itemsBody.appendChild(row);
    });

    // Recalculate if Totals changed manually
    subtotalInput.addEventListener('input', () => {
        const sub = parseFloat(subtotalInput.value) || 0;
        const vat = parseFloat(vatAmountInput.value) || 0;
        totalAmountInput.value = (sub + vat).toFixed(2);
    });

    vatAmountInput.addEventListener('input', () => {
        const sub = parseFloat(subtotalInput.value) || 0;
        const vat = parseFloat(vatAmountInput.value) || 0;
        totalAmountInput.value = (sub + vat).toFixed(2);
    });

    // Save DB Handler
    saveDbBtn.addEventListener('click', async () => {
        // Validate basics (optional, but good UX)
        if (!itemsBody.children.length && !totalAmountInput.value) {
            if (!confirm('The invoice seems empty. Save anyway?')) return;
        }

        try {
            saveDbBtn.disabled = true;
            saveDbBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

            // Gather data from the UI inputs to capture any manual edits
            const invoiceData = {
                document_type: docTypeInput?.value || '',
                document_no: docNoInput?.value || '',
                issue_date: docDateInput?.value || '',
                seller: {
                    name: sellerNameInput?.value || '',
                    tax_id: sellerTaxIdInput?.value || '',
                    address: sellerAddressInput?.value || ''
                },
                buyer: {
                    name: buyerNameInput?.value || '',
                    tax_id: buyerTaxIdInput?.value || '',
                    address: buyerAddressInput?.value || ''
                },
                items: Array.from(itemsBody.querySelectorAll('tr')).map(tr => ({
                    description: tr.querySelector('.item-desc')?.value || '',
                    quantity: parseFloat(tr.querySelector('.item-qty')?.value) || 0,
                    unit_price: parseFloat(tr.querySelector('.item-price')?.value) || 0,
                    total_price: parseFloat(tr.querySelector('.item-total')?.value) || 0
                })),
                subtotal: parseFloat(subtotalInput?.value) || 0,
                vat_amount: parseFloat(vatAmountInput?.value) || 0,
                total_amount: parseFloat(totalAmountInput?.value) || 0
            };

            let url = 'http://localhost:3000/save-invoice';
            let method = 'POST';

            if (editingInvoiceId) {
                url = `http://localhost:3000/save-invoice/${editingInvoiceId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoiceData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.details || 'Failed to save invoice');
            }

            alert(`Success! Invoice saved with ID: ${result.invoiceId}`);

        } catch (error) {
            console.error('Save Error:', error);
            alert(`Error saving to database: ${error.message}`);
        } finally {
            saveDbBtn.disabled = false;
            saveDbBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save to DB';
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
        a.download = `invoice-analysis-${Date.now()}.txt`;
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

    // Populate Editor Function
    function populateEditor(data) {
        // Extract calculated fields list
        const calculatedFields = data._calculated_fields || [];
        const isCalculated = (path) => calculatedFields.includes(path);

        // Clear all fields first to prevent old data from persisting
        document.getElementById('doc-type').value = '';
        document.getElementById('doc-no').value = '';
        document.getElementById('doc-date').value = '';
        document.getElementById('doc-currency').value = 'THB';

        document.getElementById('seller-name').value = '';
        document.getElementById('seller-tax-id').value = '';
        document.getElementById('seller-address').value = '';

        document.getElementById('buyer-name').value = '';
        document.getElementById('buyer-tax-id').value = '';
        document.getElementById('buyer-address').value = '';

        document.getElementById('subtotal').value = '';
        document.getElementById('vat-amount').value = '';
        document.getElementById('total-amount').value = '';

        // Now populate with new data
        // Document Info
        if (data.document_type) document.getElementById('doc-type').value = data.document_type;
        if (data.document_no) document.getElementById('doc-no').value = data.document_no;
        if (data.issue_date) document.getElementById('doc-date').value = data.issue_date;
        if (data.currency) document.getElementById('doc-currency').value = data.currency;

        // Seller
        if (data.seller) {
            if (data.seller.name) document.getElementById('seller-name').value = data.seller.name;
            if (data.seller.tax_id) document.getElementById('seller-tax-id').value = data.seller.tax_id;
            if (data.seller.address) document.getElementById('seller-address').value = data.seller.address;
        }

        // Buyer
        if (data.buyer) {
            if (data.buyer.name) document.getElementById('buyer-name').value = data.buyer.name;
            if (data.buyer.tax_id) document.getElementById('buyer-tax-id').value = data.buyer.tax_id;
            if (data.buyer.address) document.getElementById('buyer-address').value = data.buyer.address;
        }

        // Items
        const itemsBody = document.getElementById('items-body');
        if (itemsBody) {
            itemsBody.innerHTML = '';
            if (data.items && Array.isArray(data.items)) {
                data.items.forEach((item, idx) => {
                    const row = document.createElement('tr');

                    // Check if each field is calculated
                    const qtyClass = isCalculated(`items[${idx}].quantity`) ? 'calculated-value' : '';
                    const priceClass = isCalculated(`items[${idx}].unit_price`) ? 'calculated-value' : '';
                    const totalClass = isCalculated(`items[${idx}].total_price`) ? 'calculated-value' : '';

                    row.innerHTML = `
                        <td><input type="text" class="item-desc" value="${escapeHtml(item.description || '')}" /></td>
                        <td><input type="number" class="item-qty ${qtyClass}" value="${item.quantity || ''}" /></td>
                        <td><input type="number" step="0.01" class="item-price ${priceClass}" value="${item.unit_price || ''}" /></td>
                        <td><input type="number" step="0.01" class="item-total ${totalClass}" value="${item.total_price || ''}" /></td>
                        <td><button class="delete-row-btn"><i class="fa-solid fa-trash"></i></button></td>
                    `;
                    itemsBody.appendChild(row);
                });
            }
        }

        // Totals - apply calculated styling
        const subtotalInput = document.getElementById('subtotal');
        const vatInput = document.getElementById('vat-amount');
        const totalInput = document.getElementById('total-amount');

        if (data.subtotal) {
            subtotalInput.value = data.subtotal;
            if (isCalculated('subtotal')) subtotalInput.classList.add('calculated-value');
        }
        if (data.vat_amount) {
            vatInput.value = data.vat_amount;
            if (isCalculated('vat_amount')) vatInput.classList.add('calculated-value');
        }
        if (data.total_amount) {
            totalInput.value = data.total_amount;
            if (isCalculated('total_amount')) totalInput.classList.add('calculated-value');
        }
    }

    // View Toggle Logic
    function toggleView(view) {
        if (view === 'json') {
            // Update button states if they exist
            if (viewJsonBtn) viewJsonBtn.classList.add('active');
            if (viewTableBtn) viewTableBtn.classList.remove('active');

            // Show JSON view, hide editor
            if (jsonView) jsonView.style.display = 'block';
            if (editorContainer) editorContainer.style.display = 'none';
        } else {
            // Update button states if they exist
            if (viewJsonBtn) viewJsonBtn.classList.remove('active');
            if (viewTableBtn) viewTableBtn.classList.add('active');

            // Hide JSON, Show Editor
            if (jsonView) jsonView.style.display = 'none';
            if (editorContainer) editorContainer.style.display = 'flex';

            // Attempt auto-populate if empty or dirty
            // For now, always re-populate from currentResult to be safe
            if (currentResult) {
                try {
                    // Extract JSON if markdown
                    let jsonText = currentResult;
                    const jsonMatch = currentResult.match(/```json\n([\s\S]*?)\n```/) ||
                        currentResult.match(/```\n([\s\S]*?)\n```/) ||
                        currentResult.match(/{[\s\S]*}/);

                    if (jsonMatch) {
                        jsonText = jsonMatch[1] || jsonMatch[0];
                    }

                    const data = JSON.parse(jsonText);
                    populateEditor(data);
                } catch (e) {
                    console.warn("Auto-populate error:", e);
                    // Don't alert, just show empty table or partial data
                }
            }
        }
    }

    if (viewJsonBtn) {
        viewJsonBtn.addEventListener('click', () => toggleView('json'));
    }
    if (viewTableBtn) {
        viewTableBtn.addEventListener('click', () => toggleView('table'));
    }

    /* // Convert to Table Handler
    if (convertBtn) {
        convertBtn.addEventListener('click', () => {
            if (!currentResult) return;

            try {
                // Try to find JSON block in the text
                let jsonText = currentResult;
                const jsonMatch = currentResult.match(/```json\n([\s\S]*?)\n```/) ||
                    currentResult.match(/```\n([\s\S]*?)\n```/) ||
                    currentResult.match(/{[\s\S]*}/); // Simple object match

                if (jsonMatch) {
                    jsonText = jsonMatch[1] || jsonMatch[0];
                }

                const data = JSON.parse(jsonText);
                populateEditor(data);

                // Switch view
                resultsContent.innerHTML = ''; // Clear text
                resultsContent.appendChild(editorContainer); // Move editor into results (or just show it)
                emptyState.style.display = 'none';
                editorContainer.style.display = 'flex';

                // Hide convert button as we are now in table mode
                convertBtn.style.display = 'none';

            } catch (e) {
                console.error("JSON Parse Error:", e);
                alert("Could not automatically convert to table. The AI output might strict JSON format.\n\nError: " + e.message);
            }
        });
    }

    */
    // Utility function
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }
});
