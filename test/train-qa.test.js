'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTrainSms, normalizePhone, isMobile } = require('../lib/train-qa');

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
});
