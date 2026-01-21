# OCR Analysis Page

## Overview
The OCR Analysis page is a dedicated interface for analyzing receipts and documents using Oracle Cloud Infrastructure Generative AI models with vision capabilities.

## Features

### 🖼️ Image Upload
- **Click to Upload**: Click the upload area to select an image
- **Drag & Drop**: Drag and drop images directly into the upload area
- **Sample Receipts**: Quick access to sample receipts from the `Sample Receipt` folder
- **Image Preview**: See your uploaded image before analysis

### 🤖 Model Selection
Choose from three powerful AI models:

1. **Gemini 2.5 Pro** (Default)
   - Max Tokens: 65,536
   - Temperature: 1.0
   - Best for: Comprehensive analysis with detailed outputs

2. **Grok 4**
   - Max Tokens: 63,565
   - Temperature: 0.1
   - Best for: Precise, factual extraction

3. **Llama 4 Maverick**
   - Max Tokens: 4,000
   - Temperature: 0.1
   - Best for: Quick, concise analysis

### 💬 System Prompt
Customize how the AI analyzes your receipts:
- Default prompt extracts merchant, date, items, prices, totals, and payment method
- Modify the prompt to focus on specific information
- Use different prompts for different document types

### 📊 Results Display
- **Structured Output**: Results displayed in an easy-to-read format
- **Copy to Clipboard**: One-click copy of the entire analysis
- **Download as Text**: Save results as a `.txt` file
- **Real-time Processing**: See loading states during analysis

## Navigation

Switch between pages using the sidebar:
- **Chat**: Traditional chat interface for conversational AI
- **OCR Analysis**: Dedicated receipt/document analysis interface

## How to Use

1. **Upload a Receipt**
   - Click the upload area or drag & drop an image
   - Or click a sample receipt from the grid

2. **Select AI Model**
   - Choose from Gemini, Grok, or Llama based on your needs

3. **Customize System Prompt** (Optional)
   - Modify the default prompt to extract specific information
   - Or keep the default for comprehensive analysis

4. **Click "Analyze Receipt"**
   - Wait for the AI to process the image
   - Results will appear in the right panel

5. **Use the Results**
   - Copy to clipboard for pasting elsewhere
   - Download as a text file for record-keeping

## Configuration

Click the **Settings** button in the sidebar to configure:
- **Compartment OCID**: Your OCI compartment ID
- **Region**: OCI region (default: us-chicago-1)
- **Endpoint URL**: Local proxy server endpoint (default: http://localhost:3000/generate)

## Technical Details

### Model Configurations

Each model has optimized parameters:

```javascript
Gemini 2.5 Pro:
- modelId: ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya5decawi4guyah3nf2tbv3fzhzb3kbagjn7nqxatuwxzq
- maxTokens: 65536
- temperature: 1
- topK: 1
- topP: 0.95

Grok 4:
- modelId: ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya3bsfz4ogiuv3yc7gcnlry7gi3zzx6tnikg6jltqszm2q
- maxTokens: 63565
- temperature: 0.1
- topK: 0
- topP: 1

Llama 4 Maverick:
- modelId: ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceyayjawvuonfkw2ua4bob4rlnnlhs522pafbglivtwlfzta
- maxTokens: 4000
- temperature: 0.1
- topP: 0.75
```

### API Integration

The page communicates with the Express server (`server.js`) which handles:
- OCI authentication
- Model parameter configuration
- Image encoding and transmission
- Response parsing

## Files

- `ocr-analysis.html` - Main HTML structure
- `ocr-style.css` - Styling and layout
- `ocr-script.js` - JavaScript functionality and API calls
- `server.js` - Backend proxy server (shared with chat page)

## Requirements

- Node.js server running (`node server.js`)
- Valid OCI credentials configured in `~/.oci/config`
- Compartment OCID with GenAI permissions
- Sample receipts in `../Sample Receipt/` folder (optional)
