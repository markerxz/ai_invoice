# Oracle AI Invoice Extractor

An intelligent invoice analysis application powered by Oracle Cloud Infrastructure (OCI) Generative AI and Oracle Autonomous Database.

## Features

-   **Invoice Analysis**: Upload PDF/Image invoices and automatically extract data (Seller, Buyer, Items, Totals) using OCI GenAI.
-   **Receipt Analysis**: Process receipts with advanced OCR capabilities.
-   **Database Integration**: Automatically saves extracted data to Oracle Autonomous Database (AuD).
-   **Editable Review**: Review and edit AI-extracted data before saving.
-   **Invoice Management**: View, search, and manage saved invoices.
-   **OCI-Native**: Uses OCI GenAI models and Oracle Database for secure, scalable performance.

## Prerequisites

-   **Node.js 18+**
-   **Oracle Instant Client**: Required for database connectivity (`node-oracledb`).
-   **OCI Account**: With access to GenAI service and Autonomous Database.

## Local Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    -   Create `.env` file (see `.env.example`).
    -   Configure OCI credentials and Database wallet path.
    -   Ensure your local machine has OCI CLI configured or provide keys in `.env`.

3.  **Run Locally**:
    ```bash
    node server.js
    ```
    Access at `http://localhost:3000`.

## Deployment (OCI Compute VM)

This application is designed to run on an OCI Compute Instance (Linux).

### 1. VM Requirements
-   Oracle Linux 8/9 or Ubuntu.
-   Node.js 18+ installed.
-   Oracle Instant Client (Basic Lite) installed.
-   PM2 Process Manager (`npm install -g pm2`).

### 2. Deployment Steps
1.  **Package**: Zip the application files (excluding `node_modules`).
2.  **Transfer**: copy `deploy.zip` and your Oracle Wallet zip to the VM.
3.  **Install**:
    ```bash
    unzip deploy.zip -d invoice-app
    cd invoice-app
    npm install --production
    ```
4.  **Configure**: Create `.env` file with production credentials.
5.  **Start**:
    ```bash
    pm2 start server.js --name "invoice-app"
    pm2 save
    ```
    *Note: The app listens on `PORT` defined in `.env` (default 3000).*

## Architecture

-   **Frontend**: HTML5, CSS3, Vanilla JS
-   **Backend**: Node.js, Express
-   **AI**: Oracle OCI Generative AI Service
-   **Database**: Oracle Autonomous Database (ADB)
