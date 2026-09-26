/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Module 10 : historique des mouvements de stock. Journal immuable — jamais
// modifié ni supprimé, même par le mécanisme d'archivage du Module 11.
export type StockMovementType = 'ACHAT' | 'VENTE' | 'RETAILLE' | 'AJUSTEMENT';

export interface StockMovement {
  id: string;
  type: StockMovementType;
  entityType: 'gemstone' | 'lot';
  entityId: string;
  entityReference: string; // dénormalisé, lisible même si l'objet change ensuite
  weight?: number;
  amount?: number;
  notes?: string;
  createdAt: string;
}

// Module 11 : suppression logique. Un élément archivé de n'importe quelle
// entité, présenté sous une forme unifiée pour l'écran Corbeille.
export type TrashEntityType = 'gemstone' | 'purchase' | 'lot' | 'supplier' | 'client' | 'salesInvoice' | 'priceGuideEntry' | 'bijou';

export interface TrashItem {
  type: TrashEntityType;
  id: string;
  label: string; // ex: référence, nom, n° de facture...
  detail?: string; // ex: variété, fournisseur, montant...
  deletedAt: string;
}

export interface Gemstone {
  id: string;
  reference: string;
  type: string;
  weight: number; // in carats (cts)
  cut: string; // Tail (e.g., Brillant, Coussin, Émeraude, Ovale)
  color: string; // Couleur (e.g., D-Z ou saturation)
  clarity: string; // Pureté (e.g., IF, VVS1, VS2, SI1, AAA)
  dimensions: {
    length: number;
    width: number;
    depth: number;
  };
  refractiveIndex: string; // Indice de réfraction (e.g. 1.762 - 1.770)
  specificGravity: number; // Densité (e.g. 4.00)
  treatment: string; // Traitement (e.g., Aucun, Chauffé, Huilé, Diffusion)
  origin: string; // Origine géographique
  certificate: {
    authority: string; // GIA, IGI, HRD, SSEF, Custom, Sans
    number: string;
  };
  costPrice: number; // Prix d'achat (€)
  sellingPrice: number; // Prix de vente estimé (€)
  status: 'Disponible' | 'Vendu' | 'Réservé' | 'Confié';
  dealer: string; // Fournisseur / Négociant
  dateAdded: string; // Date d'entrée
  description: string;
  inclusions: string[];
  image?: string; // photo data-url : absente des listes, chargée à la demande
  hasImage?: boolean; // une photo existe (les listes ne transportent pas l'image elle-même)
  recuttings?: RecuttingRecord[]; // list of recutting procedures / history
  sourcePurchaseId?: string; // traçabilité : achat d'origine (entrée directe en stock)
  sourceArticleId?: string; // traçabilité : ligne d'article d'origine
  location?: string; // emplacement physique (coffre, tiroir, confié à...)
  provenance?: string; // 'Achat' (auto), 'Stock initial', 'Transformation d'un lot', 'Autre'
}

export interface RecuttingRecord {
  id: string;
  date: string;
  lapidaryName: string; // Artisan lapidaire
  initialWeight: number; // en carats avant
  finalWeight: number; // en carats après
  lossWeight: number; // perte en carats
  lossPercentage: number; // % de perte
  initialDimensions: { length: number; width: number; depth: number };
  finalDimensions: { length: number; width: number; depth: number };
  initialCut: string;
  finalCut: string;
  initialClarity: string;
  finalClarity: string;
  laborCost: number; // Coût main d'œuvre de la retaille (€)
  observations: string; // Notes techniques / inclusions résiduelles
}

export interface RefMineral {
  name: string;
  chemicalFormula: string;
  refractiveIndexMin: number;
  refractiveIndexMax: number;
  specificGravityMin: number;
  specificGravityMax: number;
  hardness: string; // Échelle de Mohs (e.g. "9")
  crystalSystem: string; // Système cristallin (e.g. "Trigonal")
  colors: string[];
  lucideIcon?: string;
  description: string;
  diagnosticInclusions: string[];
}

export interface PurchaseArticle {
  id: string;
  name: string; // e.g. "Lot de brute spinelles rouges"
  gemstoneType: string; // Saphir, Rubis, Spinelle, Tourmaline, etc.
  weight: number; // total weight in ct
  caratPrice: number; // buy price per carat in €
  totalPrice: number; // total cost in €
  notes?: string;
  // Détails saisis à l'achat pour une pierre unique : servent uniquement à créer la
  // fiche pierre (puis retirés de l'achat : la fiche est la seule source de vérité)
  stoneDetails?: { cut?: string; color?: string; clarity?: string; image?: string };
  entryMode?: 'stock' | 'tri'; // 'stock' = pierre unique entrée directement à l'inventaire ; 'tri' (défaut) = colis à trier en lots
}

export interface Purchase {
  id: string;
  reference: string; // numéro interne séquentiel (verrouillé) — racine des refs lots/pierres
  supplierReference?: string; // n° de la facture d'origine du fournisseur (obligatoire sauf exception)
  noSupplierInvoice?: boolean; // achat sans facture fournisseur (particulier, comptant...) : lève l'obligation
  supplier: string;
  date: string;
  status: 'Incomplet' | 'Trié' | 'En cours';
  totalCost: number;
  articles: PurchaseArticle[];
  notes?: string;
}

export interface Lot {
  id: string;
  reference: string; // e.g. "LOT-2026-A-01" (Lot de tri)
  purchaseId: string;
  purchaseArticleId: string; // source article
  gemstoneType: string;
  weight: number; // weight in carat
  quantity?: number; // approximate number of stones
  averageSize?: string; // e.g. "2.2 mm"
  averageColor?: string; // e.g. "Rouge intense"
  averageClarity?: string; // e.g. "VS"
  cutType?: string; // Brillant Rond, Coussin, Brut...
  destination: string; // e.g. "Lot de tri #1"
  dateCreated: string;
  notes?: string;
  image?: string; // photo data-url : absente des listes, chargée à la demande
  hasImage?: boolean; // une photo existe (les listes ne transportent pas l'image elle-même)
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatNumber?: string;
  notes?: string;
  dateAdded: string;
}

export interface PriceGuideEntry {
  id: string;
  gemstoneType: string; // Saphir, Rubis, Émeraude...
  tierName: string; // Palier de qualité défini par l'utilisateur (ex: "Ceylan non chauffé - fine")
  minPricePerCarat: number; // fourchette basse €/ct
  maxPricePerCarat: number; // fourchette haute €/ct
  notes?: string;
  sortOrder?: number;
}

export interface CompanySettings {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  vatNumber: string;
  siret: string;
  website: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  notes?: string;
  dateAdded: string;
}

export interface InvoiceItem {
  id: string;
  gemstoneId?: string;
  gemstoneReference?: string; // référence de la pierre copiée à l'émission (ne suit plus la fiche)
  description: string;
  weight?: number;
  quantity: number;
  unitPrice: number;
  vatRate: number; // percentage (e.g. 20)
  totalAmount: number; // excl tax
}

// Module 12 : bijoux composés (monture + pierres serties) et leur décomposition.
// La liste des pierres serties est stockée directement sur le bijou (comme les
// articles d'un achat) plutôt que via un champ inverse sur Gemstone : une pierre
// est "disponible" pour un nouveau bijou tant qu'elle n'apparaît dans aucun bijou
// non décomposé — seule l'action explicite de décomposition la libère.
export interface Bijou {
  id: string;
  reference: string;
  description: string;
  metal: string; // Or, Argent, Platine...
  metalWeight: number; // grammes
  gemstoneIds: string[]; // pierres actuellement serties
  costPrice: number;
  sellingPrice: number;
  status: 'Disponible' | 'Réservé' | 'Vendu' | 'Confié' | 'Décomposé';
  dateAdded: string;
  notes?: string;
}

// Copie figée à l'émission d'une facture : identité du vendeur et du client telles qu'elles
// étaient ce jour-là. Modifier ensuite les Paramètres ou une fiche client ne change jamais
// une facture déjà émise. Écrite une seule fois, par le serveur.
export interface SellerSnapshot {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  vatNumber: string;
  siret: string;
}

export interface ClientSnapshot {
  name: string;
  contactName?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
}

// Mise en service de la facturation : tant qu'elle n'est pas « réelle », les factures de test
// peuvent être purgées ; une fois démarrée, la purge n'est plus possible (irréversible).
export interface InvoicingStatus {
  live: boolean;
  liveSince?: string;
  invoiceCount: number; // toutes les factures, corbeille comprise
  testDataCount: number; // lignes que « Purger les données de test » supprimerait (hors stock importé, annuaires actifs, paramètres)
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  discount: number;
  totalExclTax: number;
  vatAmount: number;
  totalInclTax: number;
  status: 'Brouillon' | 'Payée' | 'En attente' | 'Annulée';
  paymentMethod: 'Virement' | 'Carte' | 'Espèces' | 'Autre';
  notes?: string;
  issuedAt?: string; // date d'émission (première sortie du brouillon)
  sellerSnapshot?: SellerSnapshot; // absent sur un brouillon et sur les anciennes factures
  clientSnapshot?: ClientSnapshot;
  // Avoir (facture d'annulation) : montants négatifs, numérotation AV-AAAA-NNNN, rattaché à la
  // facture d'origine. Toujours créé par le serveur, jamais par une sauvegarde ordinaire.
  docType?: 'facture' | 'avoir';
  creditedInvoiceId?: string;
}

