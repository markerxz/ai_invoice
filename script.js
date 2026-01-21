document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages-container');
    const settingsModal = document.getElementById('settings-modal');
    const settingsTrigger = document.getElementById('settings-trigger');
    const closeModalBtn = document.querySelector('.close-modal');
    const saveSettingsBtn = document.getElementById('save-settings');
    const compartmentInput = document.getElementById('compartment-id');
    const apiEndpointInput = document.getElementById('api-endpoint');

    // Image upload elements
    const attachImageBtn = document.getElementById('attach-image');
    const imageInput = document.getElementById('image-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image');

    let selectedImageBase64 = null;

    // State
    let config = {
        compartmentId: localStorage.getItem('oci_compartment_id') || 'ocid1.compartment.oc1..aaaaaaaancmbh4gcptvcfm75ton5crgee2paqny2ank57m7pfqbbdun373bq',
        apiEndpoint: localStorage.getItem('oci_api_endpoint') || (window.location.protocol.startsWith('http') ? '/generate' : 'http://localhost:3000/generate'),
        modelId: 'ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya5decawi4guyah3nf2tbv3fzhzb3kbagjn7nqxatuwxzq'
    };

    // Initialize UI
    compartmentInput.value = config.compartmentId;
    apiEndpointInput.value = config.apiEndpoint;

    // Auto-resize textarea
    promptInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        if (this.value.trim().length > 0 || selectedImageBase64) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Event Listeners
    sendBtn.addEventListener('click', handleSend);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

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

        settingsModal.classList.remove('active');
        addSystemMessage("Configuration saved successfully.");
    });

    // Image upload handlers
    attachImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                selectedImageBase64 = event.target.result;
                imagePreview.src = selectedImageBase64;
                imagePreviewContainer.style.display = 'block';
                sendBtn.removeAttribute('disabled');
            };
            reader.readAsDataURL(file);
        }
    });

    removeImageBtn.addEventListener('click', () => {
        selectedImageBase64 = null;
        imagePreview.src = '';
        imagePreviewContainer.style.display = 'none';
        imageInput.value = '';

        if (!promptInput.value.trim()) {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    async function handleSend() {
        if (sendBtn.hasAttribute('disabled')) return;

        const userText = promptInput.value.trim();
        const imageData = selectedImageBase64;

        if (!userText && !imageData) return;

        // Reset Input
        promptInput.value = '';
        promptInput.style.height = 'auto';
        sendBtn.setAttribute('disabled', 'true');

        // Add User Message with image if present
        addMessage(userText || "Analyzing image...", 'user', imageData);

        // Clear image preview
        if (imageData) {
            selectedImageBase64 = null;
            imagePreview.src = '';
            imagePreviewContainer.style.display = 'none';
            imageInput.value = '';
        }

        // Check Configuration
        if (!config.compartmentId) {
            addSystemMessage("⚠️ Missing Compartment ID. Please configure it in Settings.");
            settingsModal.classList.add('active');
            return;
        }

        // Show Loading State
        const loadingId = addLoadingMessage();

        try {
            const requestBody = {
                prompt: userText || "What's in this image?",
                compartmentId: config.compartmentId,
                modelId: config.modelId
            };

            // Add image if present
            if (imageData) {
                requestBody.image = imageData;
            }

            const response = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            removeMessage(loadingId);

            if (!response.ok) {
                if (data.error && data.error.includes("ECONNREFUSED")) {
                    throw new Error("Could not connect to local proxy. Is 'node server.js' running?");
                }
                throw new Error(data.message || data.error || 'Failed to generate response');
            }

            const botText = data.text || (data.inferenceRequest && data.inferenceRequest.generatedTexts ? data.inferenceRequest.generatedTexts[0].text : JSON.stringify(data));

            addMessage(botText, 'bot');

        } catch (error) {
            removeMessage(loadingId);
            addSystemMessage(`❌ Error: ${error.message}`);
            console.error("API Error:", error);
        }
    }

    function addMessage(text, sender, imageData = null) {
        const div = document.createElement('div');
        div.className = `message ${sender}-message`;

        let imageHtml = '';
        if (imageData) {
            imageHtml = `<img src="${imageData}" class="message-image" alt="Uploaded image">`;
        }

        div.innerHTML = `
            <div class="avatar">
                <i class="fa-solid ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                ${imageHtml}
                ${text ? `<p>${escapeHtml(text)}</p>` : ''}
            </div>
        `;
        messagesContainer.appendChild(div);
        scrollToBottom();
        return div;
    }

    function addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = `message bot-message`;
        div.innerHTML = `
            <div class="avatar" style="background-color: var(--danger); color: white;">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div class="message-content" style="color: var(--danger);">
                <p>${escapeHtml(text)}</p>
            </div>
        `;
        messagesContainer.appendChild(div);
        scrollToBottom();
    }

    function addLoadingMessage() {
        const id = 'loading-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = `message bot-message`;
        div.innerHTML = `
            <div class="avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content">
                <p><i class="fa-solid fa-circle-notch fa-spin"></i> Generating response...</p>
            </div>
        `;
        messagesContainer.appendChild(div);
        scrollToBottom();
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }
});
