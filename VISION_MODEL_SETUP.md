# Vision Model Support

## Issue
The current model (`ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya5decawi4guyah3nf2tbv3fzhzb3kbagjn7nqxatuwxzq`) does not support image/vision inputs.

## Solution
To use image upload features, you need to use a **vision-enabled model** in OCI GenAI.

### Supported Vision Models:
- **Meta Llama 3.2 Vision** (11B or 90B)
- Other multimodal models available in your region

### How to Get the Vision Model OCID:

1. **Go to OCI Console**: https://cloud.oracle.com
2. **Navigate to**: Analytics & AI → Generative AI → Models
3. **Switch Region**: Make sure you're in `us-chicago-1`
4. **Find**: Look for "Llama 3.2 Vision" or other vision models
5. **Copy the OCID**: Click on the model and copy its OCID

### Update the Model:

Once you have the vision model OCID, you can either:

**Option 1: Update in Settings**
- Open http://localhost:3000
- Click Settings (gear icon)
- Add a "Vision Model OCID" field (we'll need to add this to the UI)

**Option 2: Update in Code**
- Edit `server.js`
- Replace the `targetModelId` with your vision model OCID

### Temporary Workaround:
For now, the chat interface works perfectly for **text-only conversations**. The image upload feature requires a vision-enabled model subscription in your OCI tenancy.

### Check Model Availability:
Run this in OCI CLI to see available models:
```bash
oci generative-ai model list --compartment-id <your-compartment-id> --region us-chicago-1
```

Look for models with "vision" or "multimodal" capabilities.
