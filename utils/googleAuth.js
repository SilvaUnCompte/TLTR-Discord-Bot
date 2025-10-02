const { JWT } = require('google-auth-library');
const fs = require('fs');
require('dotenv').config();

let auth;

// Initialize Google Auth using JWT constructor instead of deprecated fromJSON
function getAuthClient() {
    if (auth && auth.credentials && auth.credentials.expiry_date) {

        if (auth.credentials.expiry_date <= Date.now()) {
            auth = null;
        }
    }

    if (!auth) {
        try {
            // Read credentials file
            const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            if (!credentialsPath) {
                throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

            // Use JWT constructor
            auth = new JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });

        } catch (error) {
            console.error('Failed to initialize Google Auth:', error.message);
        }
    }
    return auth;
}

async function getGoogleAuthToken() {
    const authClient = initializeAuth();
    return await authClient.getAccessToken();
}

function getGoogleCredentials() {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
}


module.exports = {
    getAuthClient,
    getGoogleAuthToken,
    getGoogleCredentials,
};