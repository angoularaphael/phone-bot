'use strict';

/**
 * Groq + Gemini + Mistral en parallèle : le premier qui répond gagne.
 * Groq en quota / trop lent → Gemini, puis Mistral. Musique d'attente pendant ce temps.
 */

const { warn } = require('./logger');

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 5000);
const RELAY_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);

let groqBlockedUntil = 0;

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

function mustHaveContent(result, label) {
    return Promise.resolve(result).then((v) => {
        if (v && v.content) return v;
        throw new Error(`${label} vide`);
    });
}

function geminiModels() {
    const preferred = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    return [...new Set([preferred, 'gemini-2.5-flash', 'gemini-2.0-flash'])];
}

function geminiText(data) {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => String(p.text || '')).join('').trim();
}

async function tryGemini(messages, maxTokens, temperature) {
    const keys = poolFor('GEMINI_API_KEY', (v) => v.startsWith('AIza'));
    if (!keys.length) {
        warn('Gemini : aucune GEMINI_API_KEY');
        return null;
    }
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
    if (!contents.length) return null;
    const outTokens = Math.max(maxTokens, 400);
    const models = geminiModels();

    for (let i = 0; i < keys.length; i += 1) {
        for (const model of models) {
            const configs = [
                {
                    maxOutputTokens: outTokens,
                    temperature,
                    thinkingConfig: { thinkingBudget: 0 },
                },
                { maxOutputTokens: outTokens, temperature },
            ];
            for (const generationConfig of configs) {
                try {
                    const res = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys[i]}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
                                contents,
                                generationConfig,
                            }),
                            signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
                        }
                    );
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        warn(`Gemini ${model} HTTP ${res.status} : ${data?.error?.message || ''}`.trim());
                        continue;
                    }
                    const content = geminiText(data);
                    if (content) return { content, provider: 'gemini' };
                } catch (e) {
                    warn(`Gemini ${model} : ${e.message}`);
                }
            }
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
                body: JSON.stringify({ model, messages, temperature, max_tokens: Math.max(maxTokens, 400) }),
                signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
            });
            if (!res.ok) continue;
            const data = await res.json().catch(() => ({}));
            const content = data?.choices?.[0]?.message?.content?.trim();
            if (content) return { content, provider: 'mistral' };
        } catch { /* clé suivante */ }
    }
    return null;
}

async function tryGroq(messages, maxTokens, temperature) {
    if (Date.now() < groqBlockedUntil) return null;
    const keys = getApiKeys();
    if (!keys.length) return null;
    for (let i = 0; i < keys.length; i += 1) {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${keys[i]}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildRequestBody({ messages, maxTokens, temperature })),
                signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
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
            if (err.status === 429) {
                groqBlockedUntil = Date.now() + 60 * 60 * 1000;
                warn(`Groq quota — relais Gemini/Mistral : ${err.message}`);
                break;
            }
            if (err.name === 'TimeoutError' || err.name === 'AbortError') {
                warn('Groq trop lent — relais Gemini/Mistral');
                break;
            }
            if (i < keys.length - 1 && (shouldRetry(err.status) || !err.status)) continue;
            break;
        }
    }
    return null;
}

async function chatCompletion(messages, { maxTokens = 160, temperature = 0.4 } = {}) {
    try {
        return await Promise.any([
            mustHaveContent(tryGemini(messages, maxTokens, temperature), 'gemini'),
            mustHaveContent(tryGroq(messages, maxTokens, temperature), 'groq'),
            mustHaveContent(tryMistral(messages, maxTokens, temperature), 'mistral'),
        ]);
    } catch (err) {
        const detail = err && err.errors && err.errors[0] ? err.errors[0].message : (err && err.message);
        throw new Error(detail || 'Aucun fournisseur disponible');
    }
}

module.exports = { chatCompletion, isAiEnabled, getApiKeys, MODEL };
