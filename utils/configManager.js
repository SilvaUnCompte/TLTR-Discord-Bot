const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'configs');
const CONFIG_FILE = path.join(CONFIG_DIR, 'guilds.json');

// Default configuration for new guilds
const DEFAULT_CONFIG = {
    // ai: {
    //     model: process.env.GROQ_MODEL || 'meta-llama/llama-4-maverick-17b-128e-instruct',
    //     defaultTone: 'normal',
    //     maxContextMessages: 25
    // },
    // voice: {
    //     bufferThreshold: parseInt(process.env.BUFFER_THRESHOLD) || 5000,
    //     minSpeechDuration: parseInt(process.env.MIN_SPEECH_DURATION) || 800,
    //     minVolumeThreshold: parseInt(process.env.MIN_VOLUME_THRESHOLD) || 500,
    //     silenceDuration: parseInt(process.env.SILENCE_DURATION) || 1500,
    //     noiseGateThreshold: parseInt(process.env.STT_NOISE_GATE_THRESHOLD) || 500
    // },
    starboard: {
        channel: ""
    }
};

class ConfigManager {
    constructor() {
        this.configs = new Map();
        this.loadConfigs();
    }

    /**
     * Load all guild configs from file
     */
    loadConfigs() {
        try {
            // Ensure config directory exists
            if (!fs.existsSync(CONFIG_DIR)) {
                fs.mkdirSync(CONFIG_DIR, { recursive: true });
            }

            // Load existing configs or create new file
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf8');
                const guildsData = JSON.parse(data);
                
                // Load into Map
                Object.keys(guildsData).forEach(guildId => {
                    this.configs.set(guildId, guildsData[guildId]);
                });
                
                console.log(`✅ Loaded configs for ${this.configs.size} guilds`);
            } else {
                // Create empty config file
                this.saveConfigs();
                console.log('✅ Created new guild configs file');
            }
        } catch (error) {
            console.error('❌ Error loading configs:', error);
            this.configs = new Map();
        }
    }

    /**
     * Save all configs to file
     */
    saveConfigs() {
        try {
            const guildsData = {};
            this.configs.forEach((config, guildId) => {
                guildsData[guildId] = config;
            });
            
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(guildsData, null, 2), 'utf8');
        } catch (error) {
            console.error('❌ Error saving configs:', error);
        }
    }

    /**
     * Get config for a guild (creates default if doesn't exist)
     * @param {string} guildId - Guild ID
     * @returns {object} Guild config
     */
    getGuildConfig(guildId) {
        if (!this.configs.has(guildId)) {
            // Create default config for new guild
            this.configs.set(guildId, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
            this.saveConfigs();
            console.log(`📝 Created default config for guild ${guildId}`);
        }
        return this.configs.get(guildId);
    }

    /**
     * Get a specific setting value
     * @param {string} guildId - Guild ID
     * @param {string} path - Setting path (e.g., 'ai.model' or 'voice.silenceDuration')
     * @returns {*} Setting value
     */
    get(guildId, path) {
        const config = this.getGuildConfig(guildId);
        const keys = path.split('.');
        let value = config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    /**
     * Set a specific setting value
     * @param {string} guildId - Guild ID
     * @param {string} path - Setting path (e.g., 'ai.model')
     * @param {*} value - New value
     * @returns {boolean} Success
     */
    set(guildId, path, value) {
        try {
            const config = this.getGuildConfig(guildId);
            const keys = path.split('.');
            const lastKey = keys.pop();
            let target = config;
            
            // Navigate to the parent object
            for (const key of keys) {
                if (!(key in target)) {
                    target[key] = {};
                }
                target = target[key];
            }
            
            // Set the value
            target[lastKey] = value;
            
            // Save changes
            this.saveConfigs();
            console.log(`✅ Updated ${path} for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error setting ${path}:`, error);
            return false;
        }
    }

    /**
     * Reset guild config to defaults
     * @param {string} guildId - Guild ID
     * @returns {boolean} Success
     */
    reset(guildId) {
        try {
            this.configs.set(guildId, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
            this.saveConfigs();
            console.log(`🔄 Reset config for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error resetting config:`, error);
            return false;
        }
    }

    /**
     * Delete guild config
     * @param {string} guildId - Guild ID
     * @returns {boolean} Success
     */
    delete(guildId) {
        try {
            this.configs.delete(guildId);
            this.saveConfigs();
            console.log(`🗑️ Deleted config for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error deleting config:`, error);
            return false;
        }
    }

    /**
     * Get all available settings paths
     * @returns {string[]} Array of setting paths
     */
    getAvailableSettings() {
        const paths = [];
        
        const traverse = (obj, prefix = '') => {
            for (const key in obj) {
                const path = prefix ? `${prefix}.${key}` : key;
                if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    traverse(obj[key], path);
                } else {
                    paths.push(path);
                }
            }
        };
        
        traverse(DEFAULT_CONFIG);
        return paths;
    }
}

// Export singleton instance
module.exports = new ConfigManager();
