const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 2048;

let client = null;

function getClient() {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not set');
    }
    if (!client) {
        client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return client;
}

const callClaudeText = async (prompt, options = {}) => {
    const { maxTokens = DEFAULT_MAX_TOKENS, system } = options;
    const params = {
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    };
    if (system) params.system = system;
    const response = await getClient().messages.create(params);
    return response.content[0].text;
};

const callClaudeJSON = async (prompt, options = {}) => {
    const text = await callClaudeText(prompt, options);
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
};

module.exports = { callClaudeText, callClaudeJSON };
