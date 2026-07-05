/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Gemstone, RefMineral, Purchase, Lot } from './types';

// Gemstones seed data representing a premium jewelery / gemology stock
export const SEED_GEMSTONES: Gemstone[] = [
  {
    id: 'gem-001',
    reference: 'PP-2026-DI-001',
    type: 'Diamant',
    weight: 1.42,
    cut: 'Brillant Rond',
    color: 'D',
    clarity: 'IF',
    dimensions: { length: 7.15, width: 7.18, depth: 4.45 },
    refractiveIndex: '2.417',
    specificGravity: 3.52,
    treatment: 'Aucun',
    origin: 'Afrique du Sud (Kimberley)',
    certificate: { authority: 'GIA', number: '2498451120' },
    costPrice: 12500,
    sellingPrice: 19800,
    status: 'Disponible',
    dealer: 'Adamas Distributors Antwerp',
    dateAdded: '2026-03-12',
    description: 'Brillance absolue. Blanc exceptionnel +, sans aucune inclusion visible sous un grossissement de 10x. Proportions de taille idéales (Excellent Cut/Polish/Symmetry).',
    inclusions: ['Aucune (Pure à la loupe 10x)']
  },
  {
    id: 'gem-002',
    reference: 'PP-2026-SA-002',
    type: 'Saphir',
    weight: 3.84,
    cut: 'Coussin Étoilé',
    color: 'Bleu Royal profond',
    clarity: 'VS1',
    dimensions: { length: 9.40, width: 8.25, depth: 5.60 },
    refractiveIndex: '1.762 - 1.770',
    specificGravity: 4.01,
    treatment: 'Aucun (Non chauffé)',
    origin: 'Sri Lanka (Ceylon)',
    certificate: { authority: 'GRS', number: 'GRS-2026-05182' },
    costPrice: 4800,
    sellingPrice: 7800,
    status: 'Disponible',
    dealer: 'Pure Ceylon Gems Colombo',
    dateAdded: '2026-04-01',
    description: 'Saphir naturel non chauffé présentant une couleur de type "Velvet Royal Blue". Magnifique transparence avec des aiguilles de rutile microscopiques légères (soie), typique des gisements birmans ou de Ceylan authentiques.',
    inclusions: ['Aiguilles de rutile (soie légère)', 'Empreinte digitale liquide']
  },
  {
    id: 'gem-003',
    reference: 'PP-2026-EM-003',
    type: 'Émeraude',
    weight: 2.15,
    cut: 'Taille Émeraude',
    color: 'Vert Intense légèrement bleuté',
    clarity: 'VS2',
    dimensions: { length: 8.50, width: 6.70, depth: 4.80 },
    refractiveIndex: '1.577 - 1.583',
    specificGravity: 2.72,
    treatment: 'Huile naturelle mineure',
    origin: 'Colombie (Muzo)',
    certificate: { authority: 'SSEF', number: 'CD-91823' },
    costPrice: 6200,
    sellingPrice: 9400,
    status: 'Réservé',
    dealer: 'Bogota Emerald Syndicate',
    dateAdded: '2026-05-10',
    description: 'Véritable émeraude de Muzo dotée d\'un vert saturé légendaire. Présente un "jardin" interne subtil composé de cristaux de pyrite et de vacuoles biphasées. Huilée de manière traditionnelle avec de l\'huile de cèdre naturelle sans résine.',
    inclusions: ['Inclusions triphasées', 'Cristaux de pyrite', 'Jardin typique de l\'émeraude']
  },
  {
    id: 'gem-004',
    reference: 'PP-2026-RU-004',
    type: 'Rubis',
    weight: 1.89,
    cut: 'Ovale',
    color: 'Rouge Sang de Pigeon',
    clarity: 'SI1',
    dimensions: { length: 7.60, width: 5.90, depth: 4.10 },
    refractiveIndex: '1.762 - 1.770',
    specificGravity: 4.00,
    treatment: 'Chauffé thermiquement',
    origin: 'Birmanie (Mogok)',
    certificate: { authority: 'IGI', number: 'RUB-009841' },
    costPrice: 5900,
    sellingPrice: 8700,
    status: 'Disponible',
    dealer: 'Mogok Ruby Syndicate Brokerage',
    dateAdded: '2026-05-22',
    description: 'Rubis birman "Pigeon Blood Red" ultra fluorescent sous rayons UV. Légère chauffe traditionnelle uniquement pour resserrer la soie. Une teinte de feu exceptionnelle.',
    inclusions: ['Aiguilles de rutile partiellement dissoutes', 'Petites fractures guéries']
  },
  {
    id: 'gem-005',
    reference: 'PP-2026-TA-005',
    type: 'Tanzanite',
    weight: 5.67,
    cut: 'Coussin',
    color: 'Bleu Violet saturé (AAA)',
    clarity: 'IF',
    dimensions: { length: 11.20, width: 10.10, depth: 6.90 },
    refractiveIndex: '1.691 - 1.700',
    specificGravity: 3.35,
    treatment: 'Chauffé (Traditionnel)',
    origin: 'Tanzanie (Merelani)',
    certificate: { authority: 'Custom', number: 'GER-110294' },
    costPrice: 2200,
    sellingPrice: 3950,
    status: 'Confié',
    dealer: 'Arusha Precious Minerals LLC',
    dateAdded: '2026-06-02',
    description: 'Tanzanite d\'un pléochroïsme trichroïque exceptionnel, taillée avec brio en coussin de grande taille. Clarté parfaite à l\'œil et à la loupe. Une pièce de collection.',
    inclusions: ['Aucune inclusion détectée (Loupe 10x)']
  },
  {
    id: 'gem-006',
    reference: 'PP-2026-SP-006',
    type: 'Spinelle',
    weight: 2.31,
    cut: 'Ovale',
    color: 'Rose Néon Mahenge',
    clarity: 'VVS2',
    dimensions: { length: 8.10, width: 6.40, depth: 4.80 },
    refractiveIndex: '1.718',
    specificGravity: 3.60,
    treatment: 'Aucun (Naturel)',
    origin: 'Tanzanie (Mahenge)',
    certificate: { authority: 'Sans', number: '-' },
    costPrice: 1900,
    sellingPrice: 3200,
    status: 'Disponible',
    dealer: 'East Africa Gems Traders',
    dateAdded: '2026-06-10',
    description: 'Spinelle à luminescence naturelle incandescente de la célèbre mine de Mahenge. Transparence vitreuse remarquable avec de minuscules cristaux octaédriques isolés.',
    inclusions: ['Inclusions cristallines d\'octaèdres de spinelle', 'Plumes de tension légères']
  }
];

// Reference minerals database for physical parameters-based identification
export const MINERALS_DATABASE: RefMineral[] = [
  {
    name: 'Diamant (Diamond)',
    chemicalFormula: 'C (Carbone pur)',
    refractiveIndexMin: 2.417,
    refractiveIndexMax: 2.417,
    specificGravityMin: 3.51,
    specificGravityMax: 3.53,
    hardness: '10',
    crystalSystem: 'Isométrique (Cubique)',
    colors: ['Incolore', 'Jaune', 'Brun', 'Bleu', 'Rose', 'Vert', 'Noir'],
    diagnosticInclusions: ['Grains de carbone', 'Cristaux de Grenat/Olivine inclus', 'Nuages de points', 'Lignes de croissance cristalline'],
    description: 'Le minéral le plus dur sur Terre. Dispersion extrêmement élevée (0.044) provoquant des feux (dispersion spectrale) spectaculaires. Réfraction simple.'
  },
  {
    name: 'Corindon (Saphir & Rubis)',
    chemicalFormula: 'Al2O3 (Oxyde d\'Aluminium)',
    refractiveIndexMin: 1.762,
    refractiveIndexMax: 1.770,
    specificGravityMin: 3.99,
    specificGravityMax: 4.02,
    hardness: '9',
    crystalSystem: 'Trigonal',
    colors: ['Bleu (Saphir)', 'Rouge (Rubis)', 'Rose', 'Jaune', 'Incolore', 'Vert', 'Violet'],
    diagnosticInclusions: ['Aiguilles de rutile fines (soie)', 'Zonage de couleur hexagonal', 'Empreintes digitales (fingerprints)', 'Givres de guérison'],
    description: 'Le saphir et le rubis appartiennent à la famille des corindons. Double réfraction faible, biréfringence de 0.008. Pléochroïsme fort.'
  },
  {
    name: 'Béryl (Émeraude, Aigue-Marine, Morganite)',
    chemicalFormula: 'Be3Al2Si6O18 (Silicate de Béryllium et d\'Aluminium)',
    refractiveIndexMin: 1.570,
    refractiveIndexMax: 1.585,
    specificGravityMin: 2.67,
    specificGravityMax: 2.78,
    hardness: '7.5 - 8',
    crystalSystem: 'Hexagonal',
    colors: ['Vert (Émeraude)', 'Bleu (Aigue-Marine)', 'Rose (Morganite)', 'Jaune (Héliodore)', 'Incolore (Goshénite)'],
    diagnosticInclusions: ['Vacuoles triphasées (liquide-gaz-solide dans l\'émeraude colombienne)', 'Pyrite', 'Tubes parallèles ronds ("pluie" dans l\'aigue-marine)', 'Bi-phases'],
    description: 'Espèce majeure en joaillerie. L\'émeraude tire sa couleur de traces de chrome et de vanadium, et contient presque toujours des inclusions ("le jardin de l\'émeraude").'
  },
  {
    name: 'Spinelle (Spinel)',
    chemicalFormula: 'MgAl2O4 (Aluminate de Magnésium)',
    refractiveIndexMin: 1.712,
    refractiveIndexMax: 1.720,
    specificGravityMin: 3.54,
    specificGravityMax: 3.63,
    hardness: '8',
    crystalSystem: 'Isométrique (Cubique)',
    colors: ['Rouge', 'Rose', 'Bleu cobalt', 'Violet', 'Gris', 'Orange'],
    diagnosticInclusions: ['Octaèdres alignés de spinelle ou magnétite', 'Plumes cristallines', 'Voiles de micro-cristaux'],
    description: 'Longtemps confondu avec le rubis (comme sur la couronne britannique). Réfraction simple. Très estimé pour son éclat vitreux et sa durabilité.'
  },
  {
    name: 'Chrysobéryl (Alexandrite, Oeil de Chat)',
    chemicalFormula: 'BeAl2O4',
    refractiveIndexMin: 1.744,
    refractiveIndexMax: 1.758,
    specificGravityMin: 3.68,
    specificGravityMax: 3.75,
    hardness: '8.5',
    crystalSystem: 'Orthorhombique',
    colors: ['Jaune', 'Vert', 'Brun', 'Alexandrite (Vert le jour, Rouge/Violet sous lampe incandescente)'],
    diagnosticInclusions: ['Aiguilles parallèles provoquant la chatoiement (Oeil de chat)', 'Zonage de croissance ondulé', 'Canaux creux rectilignes'],
    description: 'Célèbre pour sa variété "Alexandrite" qui change radicalement de couleur selon la source lumineuse (effet alexandrite ou trichroïsme extrême).'
  },
  {
    name: 'Tanzanite (Variété de Zoïsite)',
    chemicalFormula: 'Ca2Al3(SiO4)3(OH)',
    refractiveIndexMin: 1.691,
    refractiveIndexMax: 1.702,
    specificGravityMin: 3.30,
    specificGravityMax: 3.38,
    hardness: '6.5',
    crystalSystem: 'Orthorhombique',
    colors: ['Bleu intense', 'Violet royal', 'Brun (naturel avant traitement thermique)'],
    diagnosticInclusions: ['Canaux étroits parallèles', 'Petits cristaux de diopside', 'Cassures conchoïdales internes'],
    description: 'Trouvée exclusivement dans les collines de Merelani en Tanzanie. Présente un pléochroïsme trichroïque phénoménal (bleu, violet, rouge-bordeaux).'
  },
  {
    name: 'Grenat Tsavorite (Grossulaire)',
    chemicalFormula: 'Ca3Al2(SiO4)3',
    refractiveIndexMin: 1.738,
    refractiveIndexMax: 1.745,
    specificGravityMin: 3.59,
    specificGravityMax: 3.63,
    hardness: '7 - 7.5',
    crystalSystem: 'Isométrique (Cubique)',
    colors: ['Vert émeraude vif', 'Vert jaunâtre'],
    diagnosticInclusions: ['Cristaux arrondis de diopside', 'Aiguilles de trémolite courtes', 'Fibres d\'actinolithe'],
    description: 'Une des variétés les plus précieuses et brillantes de grenat. Couleur provoquée par le vanadium. Réfraction simple.'
  },
  {
    name: 'Tourmaline (Elbaïte, Rubellite)',
    chemicalFormula: 'Silicate complexe de borosilicate et d\'aluminium',
    refractiveIndexMin: 1.624,
    refractiveIndexMax: 1.644,
    specificGravityMin: 3.02,
    specificGravityMax: 3.26,
    hardness: '7 - 7.5',
    crystalSystem: 'Trigonal',
    colors: ['Vert', 'Rose/Rouge (Rubellite)', 'Bleu (Indicolite ou Paraïba)', 'Multicolore (Pastèque)'],
    diagnosticInclusions: ['Tubes liquides longs et fins ("canaux")', 'Trichites (fines fractures remplies de liquide)', 'Zonage de couleur platonique'],
    description: 'Biréfringence très élevée de 0.020 (doublement des facettes facilement observable à la loupe). Propriétés piézoélectriques.'
  },
  {
    name: 'Topaze',
    chemicalFormula: 'Al2SiO4(F,OH)2',
    refractiveIndexMin: 1.609,
    refractiveIndexMax: 1.638,
    specificGravityMin: 3.49,
    specificGravityMax: 3.57,
    hardness: '8',
    crystalSystem: 'Orthorhombique',
    colors: ['Bleu (souvent irradié)', 'Jaune/Or (Topaze Impériale)', 'Rose', 'Incolore'],
    diagnosticInclusions: ['Inclusions liquides bi-phases non miscibles', 'Clivage basal prononcé', 'Cristaux négatifs biphasés'],
    description: 'La Topaze Impériale du Brésil est la plus rare et recherchée. Clivage parfait, rendant la pierre sensible aux chocs.'
  },
  {
    name: 'Zircon',
    chemicalFormula: 'ZrSiO4 (Silicate de Zirconium)',
    refractiveIndexMin: 1.920,
    refractiveIndexMax: 1.984,
    specificGravityMin: 4.60,
    specificGravityMax: 4.75,
    hardness: '7.5',
    crystalSystem: 'Tétragonal',
    colors: ['Incolore', 'Jaune', 'Brun', 'Bleu', 'Rouge'],
    diagnosticInclusions: ['Doublement prononcé des arêtes de facettes secondaires', 'Halo radioactif autour de zircons microscopiques', 'Fines files de bulles/nuages'],
    description: 'À ne pas confondre avec l\'oxyde de zirconium synthétique. Le zircon naturel possède un éclat adamant à sub-adamant exceptionnel.'
  },
  {
    name: 'Quartz (Améthyste, Citrine, Prasiolite)',
    chemicalFormula: 'SiO2 (Dioxyde de Silicium)',
    refractiveIndexMin: 1.544,
    refractiveIndexMax: 1.553,
    specificGravityMin: 2.65,
    specificGravityMax: 2.66,
    hardness: '7',
    crystalSystem: 'Trigonal',
    colors: ['Violet (Améthyste)', 'Jaune (Citrine)', 'Rose', 'Fumé', 'Incolore (Cristal de roche)'],
    diagnosticInclusions: ['Inclusions tigrées (tiger-stripe)', 'Fractures de tension de type "zébrure"', 'Givres liquides de forme irrégulière'],
    description: 'Une des espèces minérales les plus abondantes. Biréfringence de 0.009, axe optique positif uni-axe.'
  }
];

export const SEED_PURCHASES: Purchase[] = [
  {
    id: 'pur-001',
    reference: 'ACH-2026-SA-01',
    supplier: 'Chanthaburi Sapphire Ltd',
    date: '2026-05-15',
    status: 'En cours',
    totalCost: 15400,
    articles: [
      {
        id: 'pa-001',
        name: 'Lot de Saphirs Bleus Bruts de Madagascar',
        gemstoneType: 'Saphir',
        weight: 120.0,
        caratPrice: 85,
        totalPrice: 10200,
        notes: "Saphirs alluvionnaires d'Ikala. Très bonne saturation."
      },
      {
        id: 'pa-002',
        name: 'Saphir Rose facetté en vrac (Mélange)',
        gemstoneType: 'Saphir',
        weight: 40.0,
        caratPrice: 130,
        totalPrice: 5200,
        notes: 'Tailles mixtes rond/ovale de Beforona. Clarté commerciale.'
      }
    ],
    notes: 'Achat salon international. Passage douane France validé.'
  },
  {
    id: 'pur-002',
    reference: 'ACH-2026-RU-02',
    supplier: 'Mogok Gem Traders Guild',
    date: '2026-06-01',
    status: 'Trié',
    totalCost: 9500,
    articles: [
      {
        id: 'pa-003',
        name: 'Parcel de Rubis Facettés Ovale Calibrés',
        gemstoneType: 'Rubis',
        weight: 25.0,
        caratPrice: 380,
        totalPrice: 9500,
        notes: 'Rubis de taille calibrée ovale 4x6 mm de Mogok chaud traditionnel.'
      }
    ],
    notes: 'Livré via transporteur sécurisé express.'
  }
];

export const SEED_LOTS: Lot[] = [
  {
    id: 'lot-001',
    reference: 'SAC-2026-B-01',
    purchaseId: 'pur-001',
    purchaseArticleId: 'pa-001',
    gemstoneType: 'Saphir',
    weight: 45.5,
    quantity: 110,
    averageSize: '2.5 mm à 3.5 mm',
    averageColor: 'Bleu Intense',
    averageClarity: 'VS-SI',
    cutType: 'Brut',
    destination: 'Lot de tri #1 (Haute qualité facettage)',
    dateCreated: '2026-05-16',
    notes: 'Excellente qualité de couleur. Prêt pour l\'atelier de taille de Paris.'
  },
  {
    id: 'lot-002',
    reference: 'SAC-2026-B-02',
    purchaseId: 'pur-001',
    purchaseArticleId: 'pa-001',
    gemstoneType: 'Saphir',
    weight: 65.0,
    quantity: 230,
    averageSize: '1.5 mm à 2.5 mm',
    averageColor: 'Bleu clair / Zoner',
    averageClarity: 'SI2-I1',
    cutType: 'Brut',
    destination: 'Lot de tri #2 (Commercial second choix)',
    dateCreated: '2026-05-16',
    notes: 'Quelques lignes de croissance zonées bleues et grises.'
  }
];

