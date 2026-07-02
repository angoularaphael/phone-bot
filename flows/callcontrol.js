'use strict';

/**
 * Webhook Telnyx Call Control v2 — machine à états principale.
 */

const telnyx = require('../lib/telnyx');
const { encodeState, decodeState } = require('../lib/state');
const { saveCall, updateCall } = require('../lib/tracker');
const { getMotifByDigit } = require('../config/routing');
const { getTransferNumber } = require('../lib/transfer');
const { sendSms, buildSmsBody } = require('../lib/sms');
const { log, warn, err } = require('../lib/logger');
const {
    WELCOME,
    MENU,
    MENU_REPEAT,
    SUB_MENU,
    ANSWERS,
    COLLECT_PHONE,
    SMS_CONFIRM,
    CALLBACK_CONFIRM,
    TRANSFER_WAIT,
    TRANSFER_FAILED,
    GOODBYE,
    OUTRO,
    NO_INPUT,
} = require('../config/messages');

function getPayload(body) {
    return body?.data?.payload || {};
}

function getEventType(body) {
    return body?.data?.event_type || '';
}

function normalizePhone(raw) {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, '');

    if (digits.length === 9) return `+33${digits}`;
    if (digits.length === 10 && digits.startsWith('0')) return `+33${digits.slice(1)}`;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length === 11 && digits.startsWith('33')) return `+${digits}`;

    return String(raw).startsWith('+') ? raw : null;
}

function isMobile(number) {
    if (!number) return false;
    const clean = number.replace(/[\s\-().]/g, '');
    return /^\+336|^\+337|^\+1[2-9]|^06|^07/.test(clean);
}

async function playMenu(callControlId) {
    await telnyx.gatherSpeak(callControlId, {
        text:         WELCOME + MENU,
        max:          1,
        clientState:  encodeState({ step: 'menu' }),
    });
}

async function playMenuRepeat(callControlId) {
    await telnyx.gatherSpeak(callControlId, {
        text:         MENU_REPEAT,
        max:          1,
        clientState:  encodeState({ step: 'menu' }),
    });
}

async function playAnswerAndSub(callControlId, motif) {
    const answerText = ANSWERS[motif] || ANSWERS.autre;
    await telnyx.gatherSpeak(callControlId, {
        text:         `${answerText} ${SUB_MENU}`,
        max:          1,
        clientState:  encodeState({ step: 'sub', motif }),
    });
}

async function playSubRepeat(callControlId, motif) {
    const answerText = ANSWERS[motif] || ANSWERS.autre;
    await telnyx.gatherSpeak(callControlId, {
        text:         `${NO_INPUT}${answerText} ${SUB_MENU}`,
        max:          1,
        clientState:  encodeState({ step: 'sub', motif }),
    });
}

async function startSmsCollect(callControlId, motif, caller) {
    if (isMobile(caller)) {
        await sendSmsAndConfirm(callControlId, motif, null, caller, caller);
        return;
    }

    await telnyx.gatherSpeak(callControlId, {
        text:         COLLECT_PHONE,
        max:          12,
        timeoutMs:    15000,
        validDigits:  '0123456789',
        clientState:  encodeState({ step: 'collect_sms', motif }),
    });
}

async function sendSmsAndConfirm(callControlId, motif, name, phone, sessionId) {
    const link = require('../config/routing').routes()[motif]?.smsLink || '';
    const body = buildSmsBody(motif, name, link);

    let smsSent = false;
    let smsError = null;

    if (phone) {
        const result = await sendSms({ to: phone, body });
        smsSent  = result.ok;
        smsError = result.error || null;
    }

    await updateCall(sessionId, {
        callerPhone: phone || null,
        smsSent,
        status:      'completed',
        notes:       smsError ? `sms_error:${smsError}` : null,
    });

    log(`📱 SMS — session: ${sessionId}  tel: ${phone || '?'}  envoyé: ${smsSent}`);

    await telnyx.gatherSpeak(callControlId, {
        text:        SMS_CONFIRM(name) + ' ' + OUTRO,
        max:         1,
        timeoutMs:   8000,
        clientState: encodeState({ step: 'menu' }),
    });
}

async function requestCallback(callControlId, sessionId, motif, caller) {
    log(`📞 Rappel demandé — session: ${sessionId}  de: ${caller}  motif: ${motif}`);

    await updateCall(sessionId, {
        callbackRequested: true,
        status:            'callback_requested',
    });

    await telnyx.gatherSpeak(callControlId, {
        text:        CALLBACK_CONFIRM + ' ' + OUTRO,
        max:         1,
        timeoutMs:   8000,
        clientState: encodeState({ step: 'menu' }),
    });
}

async function transferToHuman(callControlId, sessionId, motif) {
    const number = getTransferNumber(motif);

    log(`👤 Transfert — session: ${sessionId}  motif: ${motif}  vers: ${number || '(aucun)'}`);

    if (!number) {
        await updateCall(sessionId, {
            callbackRequested: true,
            status:            'callback_requested',
            notes:             'no_transfer_number',
        });
        await telnyx.speak(callControlId, TRANSFER_FAILED + ' ' + CALLBACK_CONFIRM, encodeState({ step: 'hangup' }));
        return;
    }

    await updateCall(sessionId, {
        transferredTo: number,
        status:        'transferred',
    });

    await telnyx.speak(
        callControlId,
        TRANSFER_WAIT,
        encodeState({ step: 'transfer', motif, transferTo: number }),
    );
}

async function handleMenuDigit(callControlId, sessionId, digit, caller) {
    if (!digit || digit === '*') {
        return playMenuRepeat(callControlId);
    }

    const motif = getMotifByDigit(digit);
    if (!motif) {
        return playMenuRepeat(callControlId);
    }

    log(`🎯 Menu — session: ${sessionId}  touche: ${digit}  motif: ${motif}`);
    await updateCall(sessionId, { motif, rawDigits: digit });

    if (motif === 'humain') {
        return transferToHuman(callControlId, sessionId, motif);
    }

    return playAnswerAndSub(callControlId, motif);
}

async function handleSubDigit(callControlId, sessionId, digit, motif, caller) {
    switch (digit) {
        case '1':
            return startSmsCollect(callControlId, motif, caller);

        case '2':
            await telnyx.speak(
                callControlId,
                'WhatsApp n est pas encore disponible. Nous vous envoyons les informations par S.M.S.',
                encodeState({ step: 'sms_after_wa', motif }),
            );
            return;

        case '3':
            return requestCallback(callControlId, sessionId, motif, caller);

        case '4':
            return transferToHuman(callControlId, sessionId, motif);

        case '*':
            return playMenu(callControlId);

        default:
            return playSubRepeat(callControlId, motif);
    }
}

async function handleGatherEnded(payload, state) {
    const callControlId = payload.call_control_id;
    const sessionId     = payload.call_session_id;
    const caller        = payload.from;
    const digit         = (payload.digits || '').trim();
    const step          = state.step || 'menu';

    if (step === 'menu') {
        return handleMenuDigit(callControlId, sessionId, digit, caller);
    }

    if (step === 'sub') {
        return handleSubDigit(callControlId, sessionId, digit, state.motif || 'autre', caller);
    }

    if (step === 'collect_sms') {
        const phone = normalizePhone(digit);
        if (!phone) {
            return telnyx.speak(callControlId, 'Numéro invalide. Au revoir.', encodeState({ step: 'hangup' }));
        }
        return sendSmsAndConfirm(callControlId, state.motif || 'autre', null, phone, sessionId);
    }

    return playMenuRepeat(callControlId);
}

async function handleSpeakEnded(payload, state) {
    const callControlId = payload.call_control_id;
    const sessionId     = payload.call_session_id;
    const caller        = payload.from;
    const step          = state.step;

    if (step === 'transfer' && state.transferTo) {
        try {
            await telnyx.transfer(callControlId, state.transferTo, encodeState({ motif: state.motif }));
        } catch (e) {
            warn(`Transfert échoué: ${e.message}`);
            await updateCall(sessionId, {
                callbackRequested: true,
                status:            'callback_requested',
                notes:             `transfer_error:${e.message}`,
            });
            await telnyx.speak(callControlId, TRANSFER_FAILED + ' ' + CALLBACK_CONFIRM, encodeState({ step: 'hangup' }));
        }
        return;
    }

    if (step === 'sms_after_wa') {
        return startSmsCollect(callControlId, state.motif || 'autre', caller);
    }

    if (step === 'hangup') {
        return telnyx.hangup(callControlId);
    }
}

async function handleEvent(body) {
    const eventType = getEventType(body);
    const payload   = getPayload(body);
    const state     = decodeState(payload.client_state);

    if (!payload.call_control_id) return;

    log(`📡 Telnyx — ${eventType}  session: ${payload.call_session_id || '?'}`);

    switch (eventType) {
        case 'call.initiated':
            if (payload.direction === 'incoming') {
                await saveCall({
                    callSid: payload.call_session_id,
                    caller:  payload.from,
                    called:  payload.to,
                    status:  'in_progress',
                });
                await telnyx.answer(payload.call_control_id, encodeState({ step: 'menu' }));
            }
            break;

        case 'call.answered':
            if (state.step === 'menu') {
                await playMenu(payload.call_control_id);
            }
            break;

        case 'call.gather.ended':
            await handleGatherEnded(payload, state);
            break;

        case 'call.speak.ended':
            await handleSpeakEnded(payload, state);
            break;

        case 'call.hangup':
            await updateCall(payload.call_session_id, {
                status:      'completed',
                durationSec: payload.end_time && payload.start_time
                    ? Math.round((new Date(payload.end_time) - new Date(payload.start_time)) / 1000)
                    : null,
            });
            break;

        default:
            break;
    }
}

async function handle(req, res) {
    res.status(200).send('OK');

    try {
        await handleEvent(req.body);
    } catch (e) {
        err(`CallControl: ${e.message}`);
        if (process.env.DEBUG === 'true') console.error(e);
    }
}

module.exports = { handle };
