const express = require('express');
const cors = require('cors');
const common = require('oci-common');
const genai = require('oci-generativeaiinference');
const fs = require('fs');
const os = require('os');
const path = require('path');
const oracledb = require('oracledb');
const result = require('dotenv').config();
if (result.error) {
    console.error('Error loading .env file:', result.error);
}
console.log('Current directory:', process.cwd());
console.log('Environment loaded:', result.parsed);
console.log('DB_USER is set:', !!process.env.DB_USER);

// Enable auto-commit for ease of use in this demo
oracledb.autoCommit = true;

const app = express();
const port = 3000;

// Enable CORS for frontend access
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads
// Serve static files from current directory
app.use(express.static(__dirname));
// Serve static files from parent directory (for Sample Receipt folder)
app.use(express.static(path.join(__dirname, '..')));

// Initialize OCI Provider
function getProvider() {
    // We explicitly resolve the path to ensure it works on Windows
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.oci', 'config');

    console.log(`Using ConfigFileAuthenticationDetailsProvider with config: ${configPath}`);

    // Use ConfigFileAuthenticationDetailsProvider for standard API key auth
    const provider = new common.ConfigFileAuthenticationDetailsProvider(configPath, "DEFAULT");

    // Override the region to us-chicago-1 for GenAI service
    provider.setRegion('us-chicago-1');
    console.log(`Region overridden to: us-chicago-1`);

    return provider;
}

// Database Connection Config
// Using Thin mode with mTLS wallet authentication
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    walletLocation: process.env.TNS_ADMIN,
    walletPassword: process.env.WALLET_PASSWORD
};

// Insert Invoice Function
async function saveInvoiceToDb(data) {
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);

        // 1. Insert Invoice Header
        const result = await connection.execute(
            `INSERT INTO INVOICES (
                DOCUMENT_TYPE, DOCUMENT_NO, ISSUE_DATE, SELLER_NAME, SELLER_TAX_ID, SELLER_ADDRESS,
                BUYER_NAME, BUYER_TAX_ID, BUYER_ADDRESS, CURRENCY,
                SUBTOTAL, VAT_AMOUNT, TOTAL_AMOUNT
            ) VALUES (
                :docType, :docNo, :issueDate, :sellerName, :sellerTaxId, :sellerAddress,
                :buyerName, :buyerTaxId, :buyerAddress, :currency,
                :subtotal, :vatAmount, :totalAmount
            ) RETURN ID INTO :id`,
            {
                docType: data.document_type || '',
                docNo: data.document_no || '',
                issueDate: data.issue_date || '',
                sellerName: data.seller?.name || '',
                sellerTaxId: data.seller?.tax_id || '',
                sellerAddress: data.seller?.address || '',
                buyerName: data.buyer?.name || '',
                buyerTaxId: data.buyer?.tax_id || '',
                buyerAddress: data.buyer?.address || '',
                currency: data.currency || 'THB',
                subtotal: parseFloat(data.subtotal) || 0,
                vatAmount: parseFloat(data.vat_amount) || 0,
                totalAmount: parseFloat(data.total_amount) || 0,
                id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
            }
        );

        const invoiceId = result.outBinds.id[0];
        console.log(`Invoice inserted with ID: ${invoiceId}`);

        // 2. Insert Invoice Items
        if (data.items && data.items.length > 0) {
            console.log('DEBUG: Items to insert:', JSON.stringify(data.items, null, 2));

            const itemsSql = `INSERT INTO INVOICE_ITEMS (
                INVOICE_ID, DESCRIPTION, QUANTITY, UNIT_PRICE, TOTAL_PRICE
            ) VALUES (
                :invoiceId, :description, :quantity, :unitPrice, :totalPrice
            )`;

            const itemsBinds = data.items.map(item => ({
                invoiceId: invoiceId,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                unitPrice: parseFloat(item.unit_price) || 0,
                totalPrice: parseFloat(item.total_price) || parseFloat(item.amount) || 0 // Handle both 'total_price' and 'amount' keys
            }));

            console.log('DEBUG: Mapped itemsBinds:', JSON.stringify(itemsBinds, null, 2));

            await connection.executeMany(itemsSql, itemsBinds);
            console.log(`Inserted ${itemsBinds.length} items.`);
        }

        return { success: true, invoiceId };

    } catch (err) {
        console.error('Database Error:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

app.post('/generate', async (req, res) => {
    try {
        const { prompt, compartmentId, modelId, image } = req.body;

        // Use defaults from the user's snippet if not provided in the request
        const targetCompartmentId = compartmentId || "ocid1.compartment.oc1..aaaaaaaancmbh4gcptvcfm75ton5crgee2paqny2ank57m7pfqbbdun373bq";
        const targetModelId = modelId || "ocid1.generativeaimodel.oc1.us-chicago-1.amaaaaaask7dceya5decawi4guyah3nf2tbv3fzhzb3kbagjn7nqxatuwxzq";

        if (!prompt && !image) {
            return res.status(400).json({ error: 'Missing prompt or image' });
        }

        const authProvider = getProvider();
        const client = new genai.GenerativeAiInferenceClient({ authenticationDetailsProvider: authProvider });

        // Set the endpoint to us-chicago-1 where the GenAI service is located
        client.endpoint = "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com";

        // Build the content array
        const contentArray = [];

        // Add image if present
        if (image) {
            // Extract base64 data from data URL
            const base64Data = image.split(',')[1] || image;
            // Extract mime type from data URL (e.g., "data:image/png;base64,...")
            const mimeMatch = image.match(/data:([^;]+);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

            contentArray.push({
                type: "IMAGE",
                imageUrl: {
                    url: image  // Full data URL
                }
            });
        }

        // Add text prompt
        if (prompt) {
            contentArray.push({
                type: "TEXT",
                text: prompt
            });
        }

        // Build the Chat Request
        const chatDetails = {
            compartmentId: targetCompartmentId,
            servingMode: {
                modelId: targetModelId,
                servingType: "ON_DEMAND"
            },
            chatRequest: {
                messages: [
                    {
                        role: "USER",
                        content: contentArray
                    }
                ],
                apiFormat: "GENERIC",
                maxTokens: req.body.maxTokens || 65536,
                temperature: req.body.temperature !== undefined ? req.body.temperature : 0.1,
                frequencyPenalty: req.body.frequencyPenalty !== undefined ? req.body.frequencyPenalty : 0,
                presencePenalty: req.body.presencePenalty !== undefined ? req.body.presencePenalty : 0,
                topK: req.body.topK !== undefined ? req.body.topK : 1,
                topP: req.body.topP !== undefined ? req.body.topP : 0.95
            }
        };

        console.log(`Sending request to OCI GenAI for compartment: ${targetCompartmentId}`);
        console.log("Chat request structure:", JSON.stringify(chatDetails, null, 2));
        const response = await client.chat({ chatDetails });

        const choices = response.chatResult?.chatResponse?.choices;
        let text = "";

        if (choices && choices.length > 0 && choices[0].message && choices[0].message.content) {
            text = choices[0].message.content.map(c => c.text).join(' ');
        } else {
            text = "No response generated.";
            console.warn("Unexpected response structure:", JSON.stringify(response, null, 2));
        }

        res.json({ text });

    } catch (error) {
        console.error("OCI GenAI Error:", error);
        res.status(500).json({
            error: error.message,
            details: error.toString()
        });
    }
});


app.post('/save-invoice', async (req, res) => {
    try {
        const invoiceData = req.body;
        console.log('Received invoice data for saving...');
        console.log('DEBUG: DB_USER =', process.env.DB_USER);
        console.log('DEBUG: DB_PASSWORD =', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
        console.log('DEBUG: DB_CONNECT_STRING =', process.env.DB_CONNECT_STRING);
        console.log('DEBUG: TNS_ADMIN =', process.env.TNS_ADMIN);

        if (!process.env.DB_USER) {
            throw new Error('Database configuration missing. Please check .env file.');
        }

        const result = await saveInvoiceToDb(invoiceData);
        res.json({ message: 'Invoice saved successfully!', invoiceId: result.invoiceId });

    } catch (error) {
        console.error('Save Invoice Error:', error);
        res.status(500).json({
            error: error.message,
            details: error.toString()
        });
    }
});

// Diagnostic endpoint to test DB connection
app.get('/test-db', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute('SELECT 1 FROM DUAL');
        await connection.close();

        res.json({
            status: 'success',
            message: 'Database connection successful!',
            config: {
                user: dbConfig.user,
                connectString: dbConfig.connectString,
                walletLocation: dbConfig.walletLocation
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            details: error.toString()
        });
    }
});

// List all invoices
app.get('/list-invoices', async (req, res) => {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT ID, DOCUMENT_TYPE, DOCUMENT_NO, ISSUE_DATE, SELLER_NAME, TOTAL_AMOUNT, 
                    TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') as CREATED_AT
             FROM INVOICES 
             ORDER BY CREATED_AT DESC 
             FETCH FIRST 50 ROWS ONLY`
        );
        await connection.close();

        const invoices = result.rows.map(row => ({
            ID: row[0],
            DOCUMENT_TYPE: row[1],
            DOCUMENT_NO: row[2],
            ISSUE_DATE: row[3],
            SELLER_NAME: row[4],
            TOTAL_AMOUNT: row[5],
            CREATED_AT: row[6]
        }));

        res.json({ invoices });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            details: error.toString()
        });
    }
});

// Update Invoice
app.put('/save-invoice/:id', async (req, res) => {
    let connection;
    try {
        const invoiceId = req.params.id;
        const data = req.body;
        console.log(`Updating invoice ${invoiceId}...`);

        connection = await oracledb.getConnection(dbConfig);

        // 1. Update Invoice Header
        await connection.execute(
            `UPDATE INVOICES SET
                DOCUMENT_TYPE = :docType,
                DOCUMENT_NO = :docNo,
                ISSUE_DATE = :issueDate,
                SELLER_NAME = :sellerName,
                SELLER_TAX_ID = :sellerTaxId,
                SELLER_ADDRESS = :sellerAddress,
                BUYER_NAME = :buyerName,
                BUYER_TAX_ID = :buyerTaxId,
                BUYER_ADDRESS = :buyerAddress,
                CURRENCY = :currency,
                SUBTOTAL = :subtotal,
                VAT_AMOUNT = :vatAmount,
                TOTAL_AMOUNT = :totalAmount
             WHERE ID = :id`,
            {
                docType: data.document_type || '',
                docNo: data.document_no || '',
                issueDate: data.issue_date || '',
                sellerName: data.seller?.name || '',
                sellerTaxId: data.seller?.tax_id || '',
                sellerAddress: data.seller?.address || '',
                buyerName: data.buyer?.name || '',
                buyerTaxId: data.buyer?.tax_id || '',
                buyerAddress: data.buyer?.address || '',
                currency: data.currency || 'THB',
                subtotal: parseFloat(data.subtotal) || 0,
                vatAmount: parseFloat(data.vat_amount) || 0,
                totalAmount: parseFloat(data.total_amount) || 0,
                id: invoiceId
            }
        );

        // 2. Replace Items (Delete all and re-insert)
        await connection.execute(
            `DELETE FROM INVOICE_ITEMS WHERE INVOICE_ID = :id`,
            { id: invoiceId }
        );

        if (data.items && data.items.length > 0) {
            const itemsSql = `INSERT INTO INVOICE_ITEMS (
                INVOICE_ID, DESCRIPTION, QUANTITY, UNIT_PRICE, TOTAL_PRICE
            ) VALUES (
                :invoiceId, :description, :quantity, :unitPrice, :totalPrice
            )`;

            const itemsBinds = data.items.map(item => ({
                invoiceId: invoiceId,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                unitPrice: parseFloat(item.unit_price) || 0,
                totalPrice: parseFloat(item.total_price) || parseFloat(item.amount) || 0
            }));

            await connection.executeMany(itemsSql, itemsBinds);
        }

        res.json({ message: 'Invoice updated successfully!', invoiceId: invoiceId });

    } catch (err) {
        console.error('Update Invoice Error:', err);
        res.status(500).json({ error: err.message, details: err.toString() });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// Get Single Invoice
app.get('/invoice/:id', async (req, res) => {
    let connection;
    try {
        const invoiceId = req.params.id;
        connection = await oracledb.getConnection(dbConfig);

        // 1. Get Header
        const headerResult = await connection.execute(
            `SELECT ID, DOCUMENT_TYPE, DOCUMENT_NO, ISSUE_DATE, 
                    SELLER_NAME, SELLER_TAX_ID, SELLER_ADDRESS,
                    BUYER_NAME, BUYER_TAX_ID, BUYER_ADDRESS,
                    CURRENCY, SUBTOTAL, VAT_AMOUNT, TOTAL_AMOUNT,
                    TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') as CREATED_AT
             FROM INVOICES WHERE ID = :id`,
            { id: invoiceId }
        );

        if (headerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const row = headerResult.rows[0];
        const invoice = {
            id: row[0],
            document_type: row[1],
            document_no: row[2],
            issue_date: row[3],
            seller: {
                name: row[4],
                tax_id: row[5],
                address: row[6]
            },
            buyer: {
                name: row[7],
                tax_id: row[8],
                address: row[9]
            },
            currency: row[10],
            subtotal: row[11],
            vat_amount: row[12],
            total_amount: row[13],
            created_at: row[14],
            items: []
        };

        // 2. Get Items
        const itemsResult = await connection.execute(
            `SELECT DESCRIPTION, QUANTITY, UNIT_PRICE, TOTAL_PRICE
             FROM INVOICE_ITEMS WHERE INVOICE_ID = :id`,
            { id: invoiceId }
        );

        invoice.items = itemsResult.rows.map(item => ({
            description: item[0],
            quantity: item[1],
            unit_price: item[2],
            total_price: item[3],
            amount: item[3]
        }));

        res.json(invoice);

    } catch (err) {
        console.error('Get Invoice Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

// Delete Invoice
app.delete('/invoice/:id', async (req, res) => {
    let connection;
    try {
        const invoiceId = req.params.id;
        connection = await oracledb.getConnection(dbConfig);

        await connection.execute(
            `DELETE FROM INVOICE_ITEMS WHERE INVOICE_ID = :id`,
            { id: invoiceId }
        );

        await connection.execute(
            `DELETE FROM INVOICES WHERE ID = :id`,
            { id: invoiceId }
        );

        console.log(`Deleted invoice ${invoiceId}`);
        res.json({ message: 'Invoice deleted successfully' });

    } catch (err) {
        console.error('Delete Invoice Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
});

app.listen(port, () => {
    console.log(`\nServer running at http://localhost:${port}`);
    console.log(`Head to your HTML file to start chatting!`);
});
