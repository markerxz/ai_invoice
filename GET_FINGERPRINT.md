# How to Get Your Correct OCI API Key Fingerprint

## Method 1: From OCI Console (Recommended)

1. **Log in to OCI Console**: https://cloud.oracle.com
2. Click on your **Profile icon** (top right) → **User Settings**
3. Scroll down to **API Keys** section
4. You'll see a list of your API keys with their fingerprints
5. **Copy the fingerprint** that matches your key

## Method 2: Calculate from Your Private Key File

If you have the private key file (`oci_api_key.pem`), you can calculate the fingerprint:

### On Windows (PowerShell):
```powershell
openssl rsa -pubout -outform DER -in C:\Users\Mark\.oci\oci_api_key.pem | openssl md5 -c
```

### On Windows (if you have Git Bash):
```bash
openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key.pem | openssl md5 -c
```

### On Linux/Mac:
```bash
openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key.pem | openssl md5 -c
```

## Method 3: From the Public Key File

If you have the public key file (usually `oci_api_key_public.pem`):

```powershell
openssl rsa -pubin -in C:\Users\Mark\.oci\oci_api_key_public.pem -pubout -outform DER | openssl md5 -c
```

## Current Fingerprint in Your Config
Your config file shows: `e5:5d:40:c9:8b:c4:39:5d:09:de:d5:d3:04:a1:4f:60`

## How to Update

Once you get the correct fingerprint:

1. Open: `C:\Users\Mark\.oci\config`
2. Update the `fingerprint=` line
3. Save the file
4. Restart the server: `node server.js`

## Verify It's Working

After updating, run our test script:
```powershell
node test-auth.js
```

It should show your fingerprint without errors.
