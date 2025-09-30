require('dotenv').config();
const { Groq } = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * @param {GroqMessage[]} messages
 * @returns {Promise<string>}
 */
async function sendRequest(messages, max_tokens = 1024) {
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
        console.error('Error API Groq:', error);
        throw new Error('Unable to contact Groq API');
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

module.exports = { sendRequest, GroqMessage };