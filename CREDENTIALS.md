# Oracle GenAI Chat Interface - Credentials Guide

## ✅ Current Status
Your OCI config file is loading correctly with these credentials:
- **User OCID**: `ocid1.user.oc1..aaaaaaaadfjrnda3lp3ldfcudzqqgasan4yqahbwmmckjiua6mgyvo2p3gxq`
- **Tenancy OCID**: `ocid1.tenancy.oc1..aaaaaaaalp2vowzretvex5moxc3ksh446mwjdna4wnuhv56dtvpnlh6xtega`
- **Fingerprint**: `e5:5d:40:c9:8b:c4:39:5d:09:de:d5:d3:04:a1:4f:60`
- **Region**: `ap-singapore-1` (overridden to `us-chicago-1` for GenAI)
- **Key File**: `C:/Users/Mark/.oci/oci_api_key.pem`

## ❌ Current Error
**401 Unauthorized** - "The required information to complete authentication was not provided or was incorrect."

This error typically means:

### 1. **IAM Policy Issues** (Most Likely)
Your user might not have permission to use the Generative AI service. You need these policies in OCI:

```
Allow group <your-group> to manage generative-ai-family in compartment <compartment-name>
```

Or at minimum:
```
Allow group <your-group> to use generative-ai-chat in compartment <compartment-name>
```

### 2. **Compartment OCID**
Currently using: `ocid1.compartment.oc1..aaaaaaaancmbh4gcptvcfm75ton5crgee2paqny2ank57m7pfqbbdun373bq`

**Verify**:
- Does this compartment exist in your tenancy?
- Do you have access to it?
- Are GenAI policies configured for this compartment?

### 3. **Model OCID**
Currently using: `ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya5decawi4guyah3nf2tbv3fzhzb3kbagjn7nqxatuwxzq`

**Verify**:
- Is this model available in your tenancy?
- Is it in the `us-chicago-1` region?
- Do you have access to this specific model?

## 🔧 How to Fix

### Option 1: Check IAM Policies
1. Go to OCI Console → Identity & Security → Policies
2. Find policies for your user/group
3. Ensure you have `manage generative-ai-family` or `use generative-ai-chat` permissions

### Option 2: Verify Compartment
1. Go to OCI Console → Identity & Security → Compartments
2. Find the compartment with OCID ending in `...dun373bq`
3. Verify it exists and you have access

### Option 3: Check Model Availability
1. Go to OCI Console → Analytics & AI → Generative AI
2. Switch to `us-chicago-1` region (top right)
3. Check if the model is available and note its OCID

### Option 4: Use Your Root Compartment
If unsure, try using your **tenancy OCID** as the compartment ID:
```
ocid1.tenancy.oc1..aaaaaaaalp2vowzretvex5moxc3ksh446mwjdna4wnuhv56dtvpnlh6xtega
```

## 📝 What Credentials You Need

To use this chat interface, you need:

1. **OCI Config File** (`~/.oci/config`) ✅ Already configured
   - user
   - tenancy  
   - fingerprint
   - region
   - key_file

2. **Compartment OCID** where GenAI is enabled
   - Get from: OCI Console → Identity → Compartments
   - Must have GenAI policies configured

3. **Model OCID** (optional, we have a default)
   - Get from: OCI Console → AI Services → Generative AI → Models
   - Must be in `us-chicago-1` region

## 🚀 Quick Test
Once you have the correct compartment OCID, update it in the Settings modal at http://localhost:3000

## 📞 Need Help?
Contact your OCI administrator to:
1. Grant you GenAI permissions
2. Provide the correct compartment OCID
3. Verify model availability in us-chicago-1
