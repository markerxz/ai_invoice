# Image Upload Feature - User Guide

## ✅ What's New

Your Oracle GenAI chat interface now supports **image uploads**! You can send images along with text prompts to analyze, describe, or ask questions about images.

## 🎨 How to Use

### 1. **Upload an Image**
- Click the **image icon** (📷) button next to the text input
- Select an image from your computer (JPG, PNG, GIF, etc.)
- You'll see a preview of the image above the input box

### 2. **Add a Prompt (Optional)**
- Type your question or instruction about the image
- Examples:
  - "What's in this image?"
  - "Describe this in detail"
  - "Extract all text from this image"
  - "What brand is this?"

### 3. **Send**
- Click the send button or press Enter
- The image will be sent to Oracle GenAI for analysis
- You'll see the image in your message and the AI's response below

### 4. **Remove Image**
- Click the **X** button on the image preview to remove it before sending

## 💡 Use Cases

- **OCR (Text Extraction)**: Upload receipts, documents, screenshots
- **Image Description**: Get detailed descriptions of photos
- **Object Recognition**: Identify objects, brands, logos
- **Visual Q&A**: Ask specific questions about image content
- **Document Analysis**: Analyze charts, diagrams, infographics

## 🔧 Technical Details

- **Format**: Images are converted to base64 and sent to the API
- **Size**: Keep images under 5MB for best performance
- **Supported**: JPG, PNG, GIF, WebP, and most common formats
- **Model**: Uses the same OCI GenAI model (supports vision capabilities)

## 🚀 Quick Start

1. Open **http://localhost:3000**
2. Click the image icon 📷
3. Select an image
4. Type a question (or leave blank for general description)
5. Hit send!

Enjoy your new vision-enabled chat interface! 🎉
