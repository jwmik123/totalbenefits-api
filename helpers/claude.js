const Anthropic = require('@anthropic-ai/sdk');

const MODELS = {
    EXTRACTION: 'claude-haiku-4-5',   // extractParams
    REASONING:  'claude-sonnet-4-6',  // generateSchema, generateInsight
};

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
    const { maxTokens = DEFAULT_MAX_TOKENS, system, model = MODELS.REASONING } = options;

    const params = {
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    };

    if (system) {
        // Structured system with cache_control so the HR specialist persona
        // gets cached across calls (5-min ephemeral TTL).
        params.system = [
            {
                type: 'text',
                text: system,
                cache_control: { type: 'ephemeral' },
            },
        ];
    }

    const response = await getClient().messages.create(params);
    return response.content[0].text;
};

const callClaudeJSON = async (prompt, options = {}) => {
    const text = await callClaudeText(prompt, options);
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
};

module.exports = { callClaudeText, callClaudeJSON, MODELS };
