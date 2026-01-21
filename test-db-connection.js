
const oracledb = require('oracledb');
require('dotenv').config();

// Enable auto-commit
oracledb.autoCommit = true;

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    walletLocation: process.env.TNS_ADMIN,
    walletPassword: process.env.WALLET_PASSWORD
};

console.log('Testing connection with config:', {
    user: dbConfig.user,
    connectString: dbConfig.connectString,
    walletLocation: dbConfig.walletLocation,
    // masking password
    walletPassword: dbConfig.walletPassword ? '***' : undefined
});

async function run() {
    let connection;

    try {
        console.log('Connecting...');
        connection = await oracledb.getConnection(dbConfig);
        console.log('Connection established!');

        const result = await connection.execute('SELECT 1 FROM DUAL');
        console.log('Query result:', result.rows);

    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Connection closed');
            } catch (err) {
                console.error(err);
            }
        }
    }
}

run();
