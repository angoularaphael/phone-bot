'use strict';

/**
 * Secours si l'appelant parle au lieu d'appuyer.
 * Le chemin principal est le menu DTMF (welcome → dispatch).
 * Pendant la réflexion de l'IA : musique d'attente, puis la réponse.
 */

const { buildVoiceGather, buildRedirect, buildHangup, buildPlayThenRedirect, holdMusicUrl } = require('../lib/twiml');
const { voiceUrl } = require('../lib/url');
const { updateCall } = require('../lib/tracker');
const { log, warn } = require('../lib/logger');
const { chatCompletion, isAiEnabled } = require('../lib/llm');
const { buildSystemPrompt } = require('../config/voice-prompt');
const { classify, isCancelIntent } = require('../lib/classifier');
const { getAnswer, ASK_REPEAT, SMS_ALREADY_SENT, getFollowUp, GOODBYE } = require('../config/messages');
const { planningReply, GYMS, correctStt, nearbyGymId, detectGyms } = require('../config/kb');
const { wantsKids, fallbackFromKnowledge } = require('../config/knowledge-file');
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

const MAX_THINK_LOOPS = 12;
const thinkingJobs = new Map();

function inferMotif(text) {
    if (isCancelIntent(text)) return 'administratif';
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

const COACH_NAMES =
    'Mehdi|Dadi|Brice|J[ée]r[ôo]me|Zouhir|Valentin(?:\\s+(?:Tapia|Guth))?|Sonia|Renaud|Samuel(?:\\s+Pinto)?|Nicolas|Enzo|Mourad|Ingrid|Farouk|Hicham|Tawee|Yannis(?:\\s+Chouet)?|Cl[ée]ment|Chlo[ée]';

function askedCoachName(text) {
    return /qui\s+(est|c['’]est).*(coach|encadr)|c['’]est qui.*(coach|encadr)|nom du coach|quel coach/i.test(
        text || ''
    );
}

function oralHour(h, m) {
    const hh = String(Number(h));
    const mm = Number(m);
    if (!mm) return `${hh} heures`;
    return `${hh} heures ${mm}`;
}

function speakHours(text) {
    let t = String(text || '');
    t = t.replace(
        /\b(\d{1,2})\s*[hH]\s*(\d{2})\s*[–\-àa]\s*(\d{1,2})\s*[hH]\s*(\d{2})\b/g,
        (_, a, b, c, d) => `${oralHour(a, b)} à ${oralHour(c, d)}`
    );
    t = t.replace(/\b(\d{1,2})\s*[hH]\s*(\d{2})\b/g, (_, h, m) => oralHour(h, m));
    t = t.replace(/\b(\d{1,2})\s+h\s+(?:et\s+)?(\d{1,2})\b/gi, (_, h, m) => oralHour(h, m));
    return t;
}

function stripCoachNames(text) {
    let t = String(text || '');
    t = t.replace(new RegExp(`\\s*\\([^)]*(?:${COACH_NAMES})[^)]*\\)`, 'gi'), '');
    t = t.replace(new RegExp(`\\s*,?\\s*(?:avec|coach)\\s+(?:le\\s+)?(?:${COACH_NAMES})\\b`, 'gi'), '');
    t = t.replace(new RegExp(`\\b(?:${COACH_NAMES})\\s+(?:fait|donne|encadre)\\b`, 'gi'), 'il y a');
    t = t.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.');
    return t;
}

function sanitizeSpeech(text, { keepCoaches = false } = {}) {
    let t = String(text || '');
    t = t.replace(/\[boutons:[^\]]*\]/gi, '');
    t = t.replace(/https?:\/\/\S+/gi, '');
    t = t.replace(/[*_`#]+/g, '');
    t = t.replace(/\s*un instant[, ]+je v[ée]rifie[.!]?\s*/gi, ' ');
    t = speakHours(t);
    if (!keepCoaches) t = stripCoachNames(t);
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
    const sess = session.get(callSid);
    const allTalk = (sess.messages || []).map((m) => String(m.content || '')).join('\n');
    const system = buildSystemPrompt(`${allTalk}\n${contextBlob(callSid, question)}\n${question}`);
    const history = session.historyForLlm(callSid);
    const prior = history.length && history[history.length - 1].role === 'user'
        ? history.slice(0, -1)
        : history;
    const messages = [
        { role: 'system', content: system },
        ...prior,
        { role: 'user', content: question },
    ];
    const { content, provider } = await chatCompletion(messages, { maxTokens: 400, temperature: 0.25 });
    log(`🤖 LLM ${provider || '?'} — CallSid: ${callSid}`);
    return sanitizeSpeech(content, { keepCoaches: askedCoachName(question) });
}

function fallbackReply(question) {
    const fromKb = fallbackFromKnowledge(question);
    if (fromKb) return sanitizeSpeech(fromKb);
    return sanitizeSpeech(getAnswer(inferMotif(question)));
}

async function answerQuestion(callSid, question) {
    const sess = session.get(callSid);
    const cancel = isCancelIntent(question);
    const gymHint = nearbyGymId(question) || detectGyms(question)[0] || sess.lastGym || null;
    const planned = cancel
        ? { gym: null, text: null }
        : planningReply(question, gymHint, sess.lastQuestion);
    const gym = planned.gym || gymHint || sess.lastGym || null;
    if (gym) session.touch(callSid, { lastGym: gym });

    session.pushTurn(callSid, 'user', question);

    let text = null;
    if (cancel) {
        text = getAnswer('administratif');
    } else {
        try {
            text = await llmReply(callSid, question);
        } catch (e) {
            warn(`LLM converse: ${e.message}`);
        }
        if (!text && planned.text) text = planned.text;
        if (!text) text = fallbackReply(question);
    }

    text = sanitizeSpeech(text, { keepCoaches: askedCoachName(question) });
    const motif = cancel
        ? 'administratif'
        : (wantsKids(question) ? 'inscription' : inferMotif(question));
    session.pushTurn(callSid, 'assistant', text);
    session.touch(callSid, {
        lastMotif: motif,
        lastQuestion: question,
        lastGym: gym || sess.lastGym || null,
    });
    await updateCall(callSid, {
        motif,
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

function holdThenThink() {
    return buildPlayThenRedirect({
        say: null,
        play: holdMusicUrl(),
        action: voiceUrl('converse', { phase: 'think' }),
        pause: 2,
    });
}

function startThinking(callSid, question) {
    const existing = thinkingJobs.get(callSid);
    if (existing && existing.question === question && !existing.done) return existing;
    const job = {
        question,
        done: false,
        result: null,
        error: null,
        loops: 0,
    };
    thinkingJobs.set(callSid, job);
    job.promise = answerQuestion(callSid, question)
        .then((text) => {
            job.result = text;
            job.done = true;
            return text;
        })
        .catch((e) => {
            warn(`Think job: ${e.message}`);
            job.error = e;
            job.result = fallbackReply(question);
            job.done = true;
            return job.result;
        });
    return job;
}

function clearThinkingJob(callSid) {
    if (callSid) thinkingJobs.delete(callSid);
}

function needsHoldMusic(question) {
    return isAiEnabled() && !isCancelIntent(question);
}

async function converse(req, res) {
    let phase = req.query.phase || 'ask';
    const callSid = req.body.CallSid;
    const { digit, speech, spoken } = speechOrDigit(req);

    res.type('text/xml');

    if (!req.query.phase && !speech && !digit && thinkingJobs.has(callSid)) {
        phase = 'think';
    }

    if (phase === 'think') {
        const job = thinkingJobs.get(callSid);
        if (!job) {
            return res.send(gatherAsk(ASK_REPEAT));
        }
        if (!job.done) {
            job.loops += 1;
            if (job.loops >= MAX_THINK_LOOPS) {
                job.done = true;
                job.result = job.result || fallbackReply(job.question);
            } else {
                return res.send(holdThenThink());
            }
        }
        thinkingJobs.delete(callSid);
        return res.send(gatherAfter(`${job.result} ${followUpSay(callSid)}`));
    }

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

    let question = speech ? correctStt(speech) : speech;
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

    if (!needsHoldMusic(question)) {
        const answer = await answerQuestion(callSid, question);
        return res.send(gatherAfter(`${answer} ${followUpSay(callSid)}`));
    }

    startThinking(callSid, question);
    return res.send(holdThenThink());
}

module.exports = { converse, DTMF_ASK, sanitizeSpeech, clearThinkingJob };
