# Oracle GenAI Chat Interface

This is a local chat interface for Oracle Cloud Infrastructure (OCI) Generative AI Service.

## Prerequisites

1.  **Node.js**: Required to run the local authentication proxy.
2.  **OCI Account**: You need access to OCI GenAI service.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install express cors dotenv oci-common oci-generativeaiinference
    ```
    *(A `package.txt` is provided, you can run `npm install $(cat package.txt)`)*

2.  **Configure Credentials**:
    -   Rename `.env.example` to `.env`.
    -   Fill in your OCI credentials:
        -   `OCI_USER_ID`: Your User OCID.
        -   `OCI_TENANCY_ID`: Your Tenancy OCID.
        -   `OCI_FINGERPRINT`: API Key Fingerprint.
        -   `OCI_REGION`: e.g., `us-chicago-1`.
        -   `OCI_PRIVATE_KEY_PATH`: Path to your private key file (e.g., `./oci_api_key.pem`).

    > **Note**: If you already have OCI CLI configured (`~/.oci/config`), the server will try to use that if `.env` vars are missing.

3.  **Run the Proxy Server**:
    ```bash
    node server.js
    ```
    The server will start on `http://localhost:3000`.

4.  **Open the App**:
    -   Open `index.html` in your browser.
    -   Click the **Settings** icon (gear) in the sidebar.
    -   Enter your **Compartment OCID** (where your GenAI policies are allowed).
    -   Start chatting!

## Why is `server.js` needed?
Browsers block direct API calls to OCI due to CORS security policies. Additionally, OCI requires complex cryptographic signing (SigV4) for every request, which is unsafe and difficult to handle directly in client-side JavaScript. The local Node.js server handles this securely for you.
