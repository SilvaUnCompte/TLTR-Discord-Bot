/**
 * Groq chat completion client.
 *
 * Conversation history is never replayed as real chat turns: anything written
 * by a Discord member is untrusted input, so it is wrapped in a single
 * delimited block that the system prompt marks as data. Replaying it as `user`
 * turns is what lets a member overwrite the instructions.
 */
const { Groq } = require('groq-sdk');
const errorHandler = require('../utils/errorHandler');
const { str } = require('../lib/env');

const DEFAULT_MODEL = 'meta-llama/llama-4-maverick-17b-128e-instruct';
const TRANSCRIPT_OPEN = '<<<CONVERSATION>>>';
const TRANSCRIPT_CLOSE = '<<<END_CONVERSATION>>>';

let client = null;

function getClient() {
    if (!client) {
        const apiKey = str('GROQ_API_KEY');
        if (!apiKey) throw new Error('GROQ_API_KEY is not set');
        client = new Groq({ apiKey });
    }
    return client;
}

/**
 * @param {GroqMessage[]} messages The system message must come first.
 * @param {number} maxTokens
 * @returns {Promise<string>} the assistant answer.
 */
async function sendLLMRequest(messages, maxTokens = 1024) {
    const model = str('GROQ_MODEL', DEFAULT_MODEL);

    try {
        const completion = await getClient().chat.completions.create({
            messages: messages.map((message) => message.toObject()),
            model,
            temperature: 0.7,
            max_tokens: maxTokens,
            stream: false,
        });

        return completion.choices[0]?.message?.content ?? '';
    } catch (error) {
        throw describeGroqError(error, { messagesCount: messages.length, maxTokens, model });
    }
}

/** Turns an SDK error into a named error the user-facing layer can map. */
function describeGroqError(error, context) {
    const named = (name, message) => {
        const wrapped = new Error(message);
        wrapped.name = name;
        return wrapped;
    };

    let result;
    if (error.status === 429) {
        result = named('RateLimitError', 'Groq API rate limit exceeded');
    } else if (error.status === 401 || error.status === 403) {
        result = named('AuthenticationError', 'Groq API authentication failed');
    } else if (error.status >= 500) {
        result = named('NetworkError', 'Groq API server error');
    } else {
        result = named('Error', `Unable to contact the Groq API: ${error.message}`);
    }

    errorHandler.logError(result, context, 'GROQ_API_ERROR');
    return result;
}

/**
 * Renders Discord messages as one delimited, clearly-labelled transcript.
 * @param {Array<{ author: object, content: string }>} messages Oldest first.
 * @param {number} maxCharacters Budget; the oldest messages are dropped first.
 * @returns {{ transcript: string, used: number, dropped: number }}
 */
function buildTranscript(messages, maxCharacters) {
    const lines = messages
        .filter((message) => message.content?.trim())
        .map((message) => `${message.author?.username ?? 'unknown'}: ${message.content.trim()}`);

    let total = 0;
    const kept = [];

    // Walk backwards so the most recent messages survive the budget.
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const cost = lines[index].length + 1;
        if (total + cost > maxCharacters) break;
        total += cost;
        kept.unshift(lines[index]);
    }

    return {
        transcript: `${TRANSCRIPT_OPEN}\n${kept.join('\n')}\n${TRANSCRIPT_CLOSE}`,
        used: kept.length,
        dropped: lines.length - kept.length,
    };
}

class GroqMessage {
    constructor(role, content) {
        this.role = role;
        this.content = content;
    }

    static user(content) {
        return new GroqMessage('user', content);
    }

    static assistant(content) {
        return new GroqMessage('assistant', content);
    }

    static system(content) {
        return new GroqMessage('system', content);
    }

    toObject() {
        return { role: this.role, content: this.content };
    }

    toString() {
        return `${this.role}: ${this.content}`;
    }
}

module.exports = {
    sendLLMRequest,
    buildTranscript,
    GroqMessage,
    TRANSCRIPT_OPEN,
    TRANSCRIPT_CLOSE,
};
