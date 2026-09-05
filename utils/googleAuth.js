/**
 * Google Cloud authentication for the Speech-to-Text calls.
 *
 * The JWT client refreshes its own access token, so the only thing cached here
 * is the client itself. A failure throws: swallowing it here used to surface
 * much later as "cannot read properties of undefined".
 */
const fs = require('fs');
const { JWT } = require('google-auth-library');
const { str } = require('../lib/env');

const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

let client = null;

/** @returns {object} the parsed service account credentials. */
function readCredentials() {
    const credentialsPath = str('GOOGLE_APPLICATION_CREDENTIALS');
    if (!credentialsPath) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
    }
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Google credentials file not found: ${credentialsPath}`);
    }
    return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
}

/**
 * @returns {JWT} an authenticated client.
 * @throws {Error} when the credentials are missing or unusable.
 */
function getAuthClient() {
    if (client) return client;

    const credentials = readCredentials();
    if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Google credentials file is missing "client_email" or "private_key"');
    }

    client = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: SCOPES,
    });
    return client;
}

/** @returns {Promise<string>} a valid OAuth2 access token. */
async function getAccessToken() {
    const { token } = await getAuthClient().getAccessToken();
    if (!token) throw new Error('Google returned an empty access token');
    return token;
}

module.exports = { getAuthClient, getAccessToken };
