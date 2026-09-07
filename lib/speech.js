'use strict';

/**
 * Distingue une vraie question parlée d'un bruit / d'un « un, deux » STT.
 * Twilio envoie parfois Digits + SpeechResult : la parole doit gagner.
 */
function isSpokenQuestion(speech, digit) {
    const s = String(speech || '').trim();
    if (!s) return false;
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length >= 3) return true;
    if (s.length >= 14) return true;
    if (/[?]/.test(s)) return true;
    if (digit && words.length <= 2 && /^(un|une|deux|trois|quatre|cinq|oui|non|ok|s\.?m\.?s)$/i.test(s)) {
        return false;
    }
    return !digit && s.length >= 5;
}

function speechOrDigit(req) {
    const digit = String(req.body.Digits || '').trim();
    const speech = String(req.body.SpeechResult || '').trim();
    return { digit, speech, spoken: isSpokenQuestion(speech, digit) };
}

module.exports = { isSpokenQuestion, speechOrDigit };
