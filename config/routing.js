'use strict';

/**
 * Menu David — 4 touches coach, pas de transfert.
 *   1 inscription / tarifs
 *   2 planning, horaires, disciplines
 *   3 abonnement
 *   4 autre motif
 */

function routes() {
    const site = process.env.BOXING_WEBSITE || 'https://boxingcenter.fr';
    const boutique = process.env.LINK_BOUTIQUE || 'https://boutique.boxingcenter.fr';
    return {
        inscription: {
            digit:    '1',
            label:    'Inscription, formules et tarifs',
            transfer: null,
            smsLink:  process.env.LINK_ESSAI || boutique,
            priority: 'normal',
        },
        planning: {
            digit:    '2',
            label:    'Planning, horaires, disciplines',
            transfer: null,
            smsLink:  process.env.LINK_PLANNING || site,
            priority: 'normal',
        },
        administratif: {
            digit:    '3',
            label:    'Gérer l\'abonnement',
            transfer: null,
            smsLink:  process.env.LINK_GERER_ABO || `${boutique.replace(/\/$/, '')}/gerer-abonnement`,
            priority: 'urgent',
        },
        autre: {
            digit:    '4',
            label:    'Autre motif',
            transfer: null,
            smsLink:  site,
            priority: 'normal',
        },
        infos_pratiques: {
            digit:    null,
            label:    'Horaires d\'ouverture',
            transfer: null,
            smsLink:  process.env.LINK_HORAIRES || site,
            priority: 'normal',
        },
        disciplines: {
            digit:    null,
            label:    'Activités et disciplines',
            transfer: null,
            smsLink:  process.env.LINK_PLANNING || site,
            priority: 'normal',
        },
        competition: {
            digit:    null,
            label:    'Compétition',
            transfer: null,
            smsLink:  process.env.LINK_COMPETITION || site,
            priority: 'normal',
        },
    };
}

function getMotifByDigit(digit) {
    if (!digit) return null;
    const all = routes();
    const found = Object.entries(all).find(([, r]) => r.digit === digit);
    return found ? found[0] : null;
}

const ROUTE_ALIASES = {
    horaires:     'infos_pratiques',
    tarifs:       'inscription',
    seance_essai: 'inscription',
    activites:    'disciplines',
    humain:       'autre',
};

function getRoute(motif) {
    const key = ROUTE_ALIASES[motif] || motif;
    return routes()[key] || routes().autre;
}

module.exports = { routes, getMotifByDigit, getRoute, ROUTE_ALIASES };
