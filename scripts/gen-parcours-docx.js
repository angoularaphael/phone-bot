'use strict';

/**
 * Génère "Parcours-appel-Boxing-Center.docx"
 * Usage :  node scripts/gen-parcours-docx.js [dossier_module_docx]
 */

const path = require('path');
const fs   = require('fs');

const docxDir = process.argv[2] || '';
const docx = require(docxDir ? path.join(docxDir, 'node_modules', 'docx') : 'docx');

const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    Table, TableRow, TableCell, WidthType, AlignmentType,
} = docx;

const M = require('../config/messages');

const BLUE = '1F4E79';
const GREY = '666666';

function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 }, children: [new TextRun({ text, color: BLUE })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 250, after: 100 }, children: [new TextRun({ text, color: BLUE })] }); }
function p(text, opts = {}) { return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, italics: opts.i, bold: opts.b, color: opts.c })] }); }
function quote(text) {
    return new Paragraph({
        spacing: { after: 120 },
        indent: { left: 400 },
        children: [new TextRun({ text: `« ${text.trim()} »`, italics: true, color: GREY })],
    });
}

function cell(text, bold = false, width) {
    return new TableCell({
        width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
        children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
    });
}

function table(headers, rows) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({ children: headers.map(h => cell(h, true)) }),
            ...rows.map(r => new TableRow({ children: r.map(c => cell(c)) })),
        ],
    });
}

const children = [
    new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Boxing Center — Bot téléphonique', color: BLUE })],
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({ text: 'Parcours d\'appel — conversation vocale, sans transfert humain', color: GREY })],
    }),

    h1('1. Accueil'),
    p('Dès que l\'appel est décroché, le bot lit :'),
    quote(M.WELCOME),
    p('Il écoute ensuite la parole (et une touche de secours).'),

    h1('2. Conversation'),
    p('Chaque question est traitée par l\'assistante vocale (base de connaissances Boxing Center). Aucun appel n\'est transféré vers un conseiller.'),
    p('Touches de secours si la parole n\'est pas comprise :'),
    table(['Touche', 'Question injectée'], [
        ['1', 'Horaires d\'ouverture'],
        ['2', 'Tarifs, offres, inscription'],
        ['3', 'Cours et salles'],
        ['4', 'Résiliation, facture, contrat'],
        ['5', 'Le bot demande la question (plus de transfert)'],
    ]),

    h1('3. Réponses de secours (si l\'IA est indisponible)'),
    h2('Horaires'),
    quote(M.ANSWERS.infos_pratiques),
    h2('Tarifs et inscription'),
    quote(M.ANSWERS.inscription),
    h2('Compétition'),
    quote(M.ANSWERS.competition),
    h2('Administratif / résiliation'),
    quote(M.ANSWERS.administratif),

    h1('4. Après une réponse'),
    quote(M.FOLLOW_UP),
    table(['Touche', 'Action'], [
        ['1', 'SMS avec les liens'],
        ['2', 'WhatsApp'],
        ['3', 'Demande de rappel (pas un transfert live)'],
        ['Parole', 'Nouvelle question'],
        ['Au revoir', 'Fin d\'appel'],
    ]),
    p('Il n\'existe plus de touche « parler à un conseiller ».'),

    h1('5. Demande de conseiller'),
    quote(M.HUMAN_STEER),
    p('Le bot reste en ligne et répond. Aucun Dial Twilio.'),

    h1('6. SMS'),
    quote(M.COLLECT_NAME),
    quote(M.SMS_CONFIRM('Marie')),

    h1('7. Rappel'),
    quote(M.CALLBACK_CONFIRM),

    h1('8. Fin d\'appel'),
    quote(M.GOODBYE),
    p('Chaque appel est enregistré dans Supabase. Les variables TRANSFER_* ne sont plus utilisées.'),
];

const doc = new Document({ sections: [{ children }] });

const out = path.join(__dirname, '..', 'Parcours-appel-Boxing-Center.docx');
Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(out, buf);
    console.log('✅ Généré :', out);
}).catch((e) => {
    console.warn('docx non généré (module absent ?) :', e.message);
    process.exit(0);
});
