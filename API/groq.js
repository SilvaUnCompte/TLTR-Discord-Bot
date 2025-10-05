require('dotenv').config();
const { Groq } = require('groq-sdk');
const errorHandler = require('../utils/errorHandler');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * @param {GroqMessage[]} messages
 * @returns {Promise<string>}
 */
async function sendLLMRequest(messages, max_tokens = 1024) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: messages.map(message => message.toObject()),
            model: process.env.GROQ_MODEL,
            temperature: 0.7,
            max_tokens: max_tokens,
            stream: false
        });

        return chatCompletion.choices[0].message.content;
    } catch (error) {
        // Log specific Groq API errors with context
        const context = {
            messagesCount: messages.length,
            maxTokens: max_tokens,
            model: process.env.GROQ_MODEL
        };

        // Enhance error with more specific information
        if (error.status === 429) {
            const rateLimitError = new Error('Groq API rate limit exceeded');
            rateLimitError.name = 'RateLimitError';
            errorHandler.logError(rateLimitError, context, 'GROQ_API_ERROR');
            throw rateLimitError;
        } else if (error.status === 401) {
            const authError = new Error('Groq API authentication failed');
            authError.name = 'AuthenticationError';
            errorHandler.logError(authError, context, 'GROQ_API_ERROR');
            throw authError;
        } else if (error.status >= 500) {
            const serverError = new Error('Groq API server error');
            serverError.name = 'NetworkError';
            errorHandler.logError(serverError, context, 'GROQ_API_ERROR');
            throw serverError;
        } else {
            errorHandler.logError(error, context, 'GROQ_API_ERROR');
            throw new Error('Unable to contact Groq API');
        }
    }
}

class GroqMessage {
    constructor(role, content) {
        this.role = role;
        this.content = content;
    }
    static user(content) {
        return new GroqMessage("user", content);
    }
    static assistant(content) {
        return new GroqMessage("assistant", content);
    }
    static system(content) {
        return new GroqMessage("system", content);
    }
    static fromDiscordMessage(message) {
        const content = `${message.author.username}: ${message.content}`;
        return GroqMessage.user(content);
    }
    toObject() {
        return {
            role: this.role,
            content: this.content
        };
    }
    toString() {
        return `${this.role}: ${this.content}`;
    }
}

module.exports = { sendLLMRequest, GroqMessage };