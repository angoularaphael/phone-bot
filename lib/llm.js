'use strict';

/**
 * Groq (+ relais Gemini / Mistral) — même pattern que la boutique Boxing Center.
 */

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function isReasoningModel(model = MODEL) {
    return /gpt-oss|qwen\/qwen3/i.test(model);
}

function poolFor(prefix, test) {
    return [...new Set(
        Object.keys(process.env)
            .filter((k) => k === prefix || k.startsWith(prefix + '_'))
            .sort()
            .map((k) => (process.env[k] || '').trim())
            .filter((v) => (test ? test(v) : Boolean(v)))
    )];
}

function getApiKeys() {
    const balayees = Object.keys(process.env)
        .filter((k) => /^GROQ_API_KEY(_\w+)?$/.test(k))
        .sort()
        .map((k) => process.env[k]);
    const keys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_FALLBACK,
        ...balayees,
        ...(process.env.GROQ_API_KEYS || '').split(','),
    ]
        .map((k) => (k || '').trim())
        .filter((k) => k.startsWith('gsk_'));
    return [...new Set(keys)];
}

function isAiEnabled() {
    if (process.env.USE_AI_REPLY === 'false') return false;
    return getApiKeys().length > 0
        || poolFor('GEMINI_API_KEY', (v) => v.startsWith('AIza')).length > 0
        || poolFor('MISTRAL_API_KEY').length > 0;
}

function shouldRetry(status) {
    return status === 429 || status === 401 || status === 403 || status === 503
        || (status >= 500 && status < 600);
}

function buildRequestBody({ messages, maxTokens, temperature }) {
    const body = {
        model: MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
    };
    if (isReasoningModel()) {
        body.reasoning_effort = process.env.GROQ_REASONING_EFFORT || 'low';
    }
    return body;
}

async function tryGemini(messages, maxTokens, temperature) {
    const keys = poolFor('GEMINI_API_KEY', (v) => v.startsWith('AIza'));
    if (!keys.length) return null;
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
    if (!contents.length) return null;
    for (let i = 0; i < keys.length; i += 1) {
        const bodies = [
            {
                ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
                contents,
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    temperature,
                    thinkingConfig: { thinkingBudget: 0 },
                },
            },
            {
                ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
                contents,
                generationConfig: { maxOutputTokens: maxTokens, temperature },
            },
        ];
        for (const body of bodies) {
            try {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys[i]}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                        signal: AbortSignal.timeout(8000),
                    }
                );
                if (!res.ok) continue;
                const data = await res.json().catch(() => ({}));
                const content = data?.candidates?.[0]?.content?.parts?.map((x) => x.text).join('').trim();
                if (content) return { content, provider: 'gemini' };
            } catch { /* essai suivant */ }
        }
    }
    return null;
}

async function tryMistral(messages, maxTokens, temperature) {
    const keys = poolFor('MISTRAL_API_KEY');
    if (!keys.length) return null;
    const model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
    for (let i = 0; i < keys.length; i += 1) {
        try {
            const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${keys[i]}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) continue;
            const data = await res.json().catch(() => ({}));
            const content = data?.choices?.[0]?.message?.content?.trim();
            if (content) return { content, provider: 'mistral' };
        } catch { /* clé suivante */ }
    }
    return null;
}

async function chatCompletion(messages, { maxTokens = 160, temperature = 0.4 } = {}) {
    const prefer = String(process.env.AI_PROVIDER || 'gemini').toLowerCase();

    if (prefer === 'gemini' || prefer === 'gemini-first') {
        const geminiFirst = await tryGemini(messages, maxTokens, temperature);
        if (geminiFirst) return geminiFirst;
    }

    const keys = getApiKeys();
    let lastError = keys.length ? null : new Error('GROQ_API_KEY manquant');
    for (let i = 0; i < keys.length; i += 1) {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${keys[i]}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildRequestBody({ messages, maxTokens, temperature })),
                signal: AbortSignal.timeout(8000),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const err = new Error(data?.error?.message || `HTTP ${res.status}`);
                err.status = res.status;
                throw err;
            }
            const content = data?.choices?.[0]?.message?.content?.trim();
            if (!content) throw new Error('Réponse Groq vide');
            return { content, provider: 'groq' };
        } catch (err) {
            lastError = err;
            if (err.status === 429) break;
            if (i < keys.length - 1 && (shouldRetry(err.status) || !err.status)) continue;
            break;
        }
    }

    const relais = (prefer === 'gemini' ? null : await tryGemini(messages, maxTokens, temperature))
        || (await tryMistral(messages, maxTokens, temperature));
    if (relais) return relais;

    throw new Error((lastError && lastError.message) || 'Aucun fournisseur disponible');
}

module.exports = { chatCompletion, isAiEnabled, getApiKeys, MODEL };
