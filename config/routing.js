'use strict';

/**
 * Menu David — 3 touches (brief coach).
 *   1 inscriptions / offres
 *   2 activités / plannings → site
 *   3 gestion / résiliation abonnement
 */

function routes() {
    const site = process.env.LINK_SITE || process.env.BOXING_WEBSITE || 'https://www.boxingcenter.fr/';
    const boutique = process.env.LINK_BOUTIQUE || 'https://boutique.boxingcenter.fr/';
    return {
        inscription: {
            digit:    '1',
            label:    'Inscriptions et offres',
            transfer: null,
            smsLink:  boutique,
            priority: 'normal',
        },
        planning: {
            digit:    '2',
            label:    'Activités et plannings',
            transfer: null,
            smsLink:  site,
            priority: 'normal',
        },
        administratif: {
            digit:    '3',
            label:    'Gérer / résilier abonnement',
            transfer: null,
            smsLink:  null,
            priority: 'urgent',
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
    horaires:     'planning',
    tarifs:       'inscription',
    seance_essai: 'inscription',
    activites:    'planning',
    disciplines:  'planning',
    infos_pratiques: 'planning',
    humain:       'inscription',
    autre:        'inscription',
};

function getRoute(motif) {
    const key = ROUTE_ALIASES[motif] || motif;
    return routes()[key] || routes().inscription;
}

module.exports = { routes, getMotifByDigit, getRoute, ROUTE_ALIASES };
