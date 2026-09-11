'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTrainSms, normalizePhone, isMobile, TRAIN_INBOX, trainDestinations } = require('../lib/train-qa');

test('SMS entraînement au format Q / R', () => {
    assert.equal(
        formatTrainSms('Les enfants paient l’essai ?', 'Non, c’est offert.'),
        'Q : Les enfants paient l’essai ?\nR : Non, c’est offert.'
    );
});

test('numéro mobile FR reconnu', () => {
    assert.equal(isMobile('+33612345678'), true);
    assert.equal(isMobile('+33939036748'), false);
    assert.equal(normalizePhone('0612345678'), '+33612345678');
    assert.equal(normalizePhone('0762641473'), TRAIN_INBOX);
});

test('SMS entraînement toujours vers le 07 62 64 14 73', () => {
    assert.equal(TRAIN_INBOX, '+33762641473');
    assert.equal(trainDestinations()[0], TRAIN_INBOX);
});
