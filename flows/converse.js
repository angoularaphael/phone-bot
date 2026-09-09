'use strict';

/**
 * Secours si l'appelant parle au lieu d'appuyer.
 * Le chemin principal est le menu DTMF (welcome → dispatch).
 */

const { buildVoiceGather, buildRedirect, buildHangup } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { updateCall } = require('../lib/tracker');
const { log, warn } = require('../lib/logger');
const { chatCompletion, isAiEnabled } = require('../lib/llm');
const { buildSystemPrompt } = require('../config/voice-prompt');
const { classify } = require('../lib/classifier');
const { getAnswer, ASK_REPEAT, SMS_ALREADY_SENT, getFollowUp, GOODBYE } = require('../config/messages');
const { planningReply, GYMS } = require('../config/kb');
const session = require('../lib/session');
const { speechOrDigit } = require('../lib/speech');

const DTMF_ASK = {
    1: "Quels sont les tarifs, les offres en cours et comment s'inscrire ?",
    2: "Quels sont les horaires, le planning des cours et les disciplines ?",
    3: 'Comment gérer mon abonnement, résilier ou obtenir une facture ?',
    4: "J'ai une autre question sur Boxing Center.",
};

const GOODBYE_RE = /\b(au revoir|c'?est tout|rien d'autre|non merci|terminer|raccroch|stop)\b/i;
const SMS_RE = /\b(s\.?m\.?s|texto|par message|whats\s?app)\b/i;
const HUMAN_RE = /\b(conseiller|humain|quelqu'un|op[eé]rateur|un manager|parler [aà] quelqu)\b/i;

function inferMotif(text) {
    const { motif } = classify(text || '');
    const aliases = {
        horaires:     'infos_pratiques',
        planning:     'planning',
        tarifs:       'inscription',
        seance_essai: 'inscription',
        autre:        'autre',
    };
    return aliases[motif] || motif || 'autre';
}

function sanitizeSpeech(text) {
    let t = String(text || '');
    t = t.replace(/\[boutons:[^\]]*\]/gi, '');
    t = t.replace(/https?:\/\/\S+/gi, '');
    t = t.replace(/[*_`#]+/g, '');
    t = t.replace(/\s+/g, ' ').trim();
    if ((t.match(/[.!?]/g) || []).length < 1 && t.length > 40) {
        t = t.replace(/\s+(vous |est-ce |sinon )/i, '. $1');
    }
    if (t && !/[.!?…]$/.test(t)) t += '.';
    const words = t.split(/\s+/);
    if (words.length > 90) {
        const cut = words.slice(0, 90).join(' ');
        const m = cut.match(/^[\s\S]*[.!?]/);
        t = (m && m[0].length > 40 ? m[0] : `${cut}.`).trim();
    }
    return t;
}

function contextBlob(callSid, question) {
    const sess = session.get(callSid);
    const gymLabel = sess.lastGym && GYMS[sess.lastGym] ? GYMS[sess.lastGym].fullLabel : '';
    const lastAsst = [...(sess.messages || [])].reverse().find((m) => m.role === 'assistant');
    return [
        sess.lastQuestion ? `Question précédente : ${sess.lastQuestion}` : '',
        lastAsst ? `Dernière réponse déjà donnée : ${String(lastAsst.content).slice(0, 280)}` : '',
        gymLabel ? `Salle déjà retenue : ${gymLabel}` : '',
        `Question actuelle : ${question}`,
    ]
        .filter(Boolean)
        .join('\n');
}

async function llmReply(callSid, question) {
    if (!isAiEnabled()) return null;
    const system = buildSystemPrompt(contextBlob(callSid, question));
    const history = session.historyForLlm(callSid);
    const prior = history.length && history[history.length - 1].role === 'user'
        ? history.slice(0, -1)
        : history;
    const messages = [
        { role: 'system', content: system },
        ...prior,
        { role: 'user', content: question },
    ];
    const { content, provider } = await chatCompletion(messages, { maxTokens: 260, temperature: 0.25 });
    log(`🤖 LLM ${provider || '?'} — CallSid: ${callSid}`);
    return sanitizeSpeech(content);
}

function fallbackReply(question) {
    return sanitizeSpeech(getAnswer(inferMotif(question)));
}

async function answerQuestion(callSid, question) {
    const sess = session.get(callSid);
    const planned = planningReply(question, sess.lastGym, sess.lastQuestion);
    if (planned.gym) session.touch(callSid, { lastGym: planned.gym });

    session.pushTurn(callSid, 'user', question);

    let text = null;
    try {
        text = await llmReply(callSid, question);
    } catch (e) {
        warn(`LLM converse: ${e.message}`);
    }
    if (!text && planned.text) text = planned.text;
    if (!text) text = fallbackReply(question);

    text = sanitizeSpeech(text);
    session.pushTurn(callSid, 'assistant', text);
    session.touch(callSid, {
        lastMotif: inferMotif(question),
        lastQuestion: question,
        lastGym: planned.gym || sess.lastGym || null,
    });
    await updateCall(callSid, {
        motif: inferMotif(question),
        notes: String(question).slice(0, 240),
    });
    return text;
}

function lastMotif(callSid) {
    return session.get(callSid).lastMotif || 'autre';
}

function smsAlreadySent(callSid) {
    return !!session.get(callSid).smsSent;
}

function followUpSay(callSid) {
    return getFollowUp({ motif: lastMotif(callSid), smsSent: smsAlreadySent(callSid) });
}

function gatherAfter(say) {
    return buildVoiceGather({
        say,
        action: voiceUrl('converse', { phase: 'after' }),
        timeout: 8,
    });
}

function gatherAsk(say) {
    return buildVoiceGather({
        say,
        action: voiceUrl('converse'),
        timeout: 8,
    });
}

async function converse(req, res) {
    const phase = req.query.phase || 'ask';
    const callSid = req.body.CallSid;
    const { digit, speech, spoken } = speechOrDigit(req);

    res.type('text/xml');

    if (phase === 'after' && !spoken) {
        if (digit === '1') {
            if (smsAlreadySent(callSid)) {
                return res.send(gatherAfter(`${SMS_ALREADY_SENT} ${followUpSay(callSid)}`));
            }
            return res.send(buildRedirect(voiceUrl('collect/name', { motif: lastMotif(callSid) })));
        }
        if (digit === '*') {
            return res.send(buildRedirect(voiceUrl('menu')));
        }
        if (GOODBYE_RE.test(speech)) {
            return res.send(buildRedirect(voiceUrl('bye')));
        }
        if (!digit && !speech) {
            const sess = session.addMiss(callSid);
            if (sess.misses >= 2) return res.send(buildHangup(GOODBYE));
            return res.send(gatherAfter(followUpSay(callSid)));
        }
        if (digit === '4' || digit === '5') {
            return res.send(buildRedirect(voiceUrl('menu')));
        }
        if (digit) {
            return res.send(gatherAfter(followUpSay(callSid)));
        }
    }

    if (digit === '*' && !spoken) {
        return res.send(buildRedirect(voiceUrl('menu')));
    }

    if (digit && DTMF_ASK[digit] && !spoken) {
        const { dispatch } = require('./dispatch');
        return dispatch(req, res);
    }

    let question = speech;
    if (digit && DTMF_ASK[digit] && !spoken) question = DTMF_ASK[digit];

    if (!question) {
        const sess = session.addMiss(callSid);
        if (sess.misses >= 2) return res.send(buildRedirect(voiceUrl('menu')));
        return res.send(gatherAsk(ASK_REPEAT));
    }

    session.resetMisses(callSid);

    if (GOODBYE_RE.test(question) && question.length < 40) {
        return res.send(buildRedirect(voiceUrl('bye')));
    }
    if (SMS_RE.test(question) && question.length < 50) {
        if (smsAlreadySent(callSid)) {
            return res.send(gatherAfter(`${SMS_ALREADY_SENT} ${followUpSay(callSid)}`));
        }
        return res.send(buildRedirect(voiceUrl('collect/name', { motif: lastMotif(callSid) })));
    }
    if (HUMAN_RE.test(question) && question.length < 60) {
        question = "L'appelant voulait parler à un conseiller. Réponds que tu peux l'aider maintenant et demande sa question concrète : planning, tarifs, essai, résiliation…";
    }

    log(`🗣️  Converse — CallSid: ${callSid}  Q: ${question.slice(0, 80)}`);

    const answer = await answerQuestion(callSid, question);
    return res.send(gatherAfter(`${answer} ${followUpSay(callSid)}`));
}

module.exports = { converse, DTMF_ASK, sanitizeSpeech };
