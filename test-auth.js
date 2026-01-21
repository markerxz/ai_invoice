const common = require('oci-common');
const os = require('os');
const path = require('path');

const homedir = os.homedir();
const configPath = path.join(homedir, '.oci', 'config');

console.log(`Loading config from: ${configPath}`);

try {
    const provider = new common.ConfigFileAuthenticationDetailsProvider(configPath, "DEFAULT");

    console.log("\n✅ Config loaded successfully!");
    console.log(`User OCID: ${provider.getUser()}`);
    console.log(`Tenancy OCID: ${provider.getTenantId()}`);
    console.log(`Fingerprint: ${provider.getFingerprint()}`);
    console.log(`Region: ${provider.getRegion().regionId}`);
    console.log(`Key File: ${provider.getKeyId()}`);

    // Try to override region
    provider.setRegion('us-chicago-1');
    console.log(`\n✅ Region overridden to: ${provider.getRegion().regionId}`);

} catch (error) {
    console.error("\n❌ Error loading config:", error.message);
    console.error(error);
}
