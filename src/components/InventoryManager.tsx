/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Gemstone, PriceGuideEntry, Purchase, Supplier } from '../types';
import SupplierFormModal from './SupplierFormModal';
import {
  Save,
  RotateCcw,
  PlusCircle,
  Scale,
  Maximize2,
  Trash2,
  Lock,
  Compass,
  FileCheck,
  Award,
  History, Plus, UserPlus } from 'lucide-react';
import PhotoCapture from './PhotoCapture';
import RecuttingSection from './RecuttingSection';
import MovementHistory from './MovementHistory';

const PROVENANCE_OPTIONS = ['Stock initial', "Transformation d'un lot", 'Autre'];

const FAMOUS_GEM_ORIGINS = [
  "Afrique du Sud",
  "Afrique du Sud (Kimberley)",
  "Colombie (Muzo)",
  "Colombie",
  "Sri Lanka (Ceylon)",
  "Sri Lanka",
  "Birmanie (Mogok)",
  "Birmanie (Myanmar)",
  "Tanzanie (Merelani)",
  "Tanzanie (Mahenge)",
  "Tanzanie",
  "Brésil",
  "Madagascar (Ilakaka)",
  "Madagascar",
  "Mozambique",
  "Zambie",
  "Afghanistan",
  "Pakistan",
  "Éthiopie",
  "Australie",
  "Thaïlande",
  "Inde",
  "États-Unis",
  "Canada"
];

const STANDARD_COUNTRIES_FR = [
  "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", "Antigua-et-Barbuda", "Arabie Saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan", 
  "Bahamas", "Bahreïn", "Bangladesh", "Barbade", "Belgique", "Belize", "Bénin", "Bhoutan", "Biélorussie", "Birmanie (Myanmar)", "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil", "Brunei", "Bulgarie", "Burkina Faso", "Burundi", 
  "Cambodge", "Cameroun", "Canada", "Cap-Vert", "Chili", "Chine", "Chypre", "Colombie", "Comores", "Congo-Brazzaville", "Congo-Kinshasa (RDC)", "Corée du Nord", "Corée du Sud", "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", 
  "Danemark", "Djibouti", "Dominique", 
  "Égypte", "Émirats Arabes Unis", "Équateur", "Érythrée", "Espagne", "Estonie", "Eswatini (Swaziland)", "États-Unis", "Éthiopie", 
  "Fidji", "Finlande", "France", 
  "Gabon", "Gambie", "Géorgie", "Ghana", "Grèce", "Grenade", "Guatemala", "Guinée", "Guinée-Bissau", "Guinée Équatoriale", "Guyana", 
  "Haïti", "Honduras", "Hongrie", 
  "Inde", "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie", 
  "Jamaïque", "Japon", "Jordanie", 
  "Kazakhstan", "Kenya", "Kirghizistan", "Kiribati", "Koweït", 
  "Laos", "Lesotho", "Lettonie", "Liban", "Liberia", "Libye", "Liechtenstein", "Lituanie", "Luxembourg", 
  "Macédoine du Nord", "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Maurice", "Mauritanie", "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie", "Monténégro", "Mozambique", 
  "Namibie", "Nauru", "Népal", "Nicaragua", "Niger", "Nigeria", "Norvège", "Nouvelle-Zélande", 
  "Oman", "Ouganda", "Ouzbékistan", 
  "Pakistan", "Palaos", "Palestine", "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", "Pérou", "Philippines", "Pologne", "Portugal", 
  "Qatar", 
  "République Centrafricaine", "République Dominicaine", "République Tchèque", "Roumanie", "Royaume-Uni", "Russie", "Rwanda", 
  "Saint-Christophe-et-Niévès", "Saint-Vincent-et-les-Grenadines", "Sainte-Lucie", "Salomon", "Samoa", "Sao Tomé-et-Principe", "Sénégal", "Serbie", "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie", "Soudan", "Soudan du Sud", "Sri Lanka", "Suède", "Suisse", "Suriname", "Syrie", 
  "Tadjikistan", "Taïwan", "Tanzanie", "Tchad", "Thaïlande", "Timor oriental", "Togo", "Tonga", "Trinité-et-Tobago", "Tunisie", "Turkménistan", "Turquie", "Tuvalu", 
  "Ukraine", "Uruguay", 
  "Vanuatu", "Vatican", "Venezuela", "Viêt Nam", 
  "Yémen", 
  "Zambie", "Zimbabwe"
];

const ALL_SELECT_ORIGINS = Array.from(new Set([
  ...FAMOUS_GEM_ORIGINS,
  ...STANDARD_COUNTRIES_FR
]));

// Reference mineral parameters to pre-fill on variety choice
const PARAM_TEMPLATES: Record<string, { ri: string; sg: number; defaultOrigin: string; defaultTreatment: string }> = {
  'Diamant': { ri: '2.417', sg: 3.52, defaultOrigin: 'Afrique du Sud', defaultTreatment: 'Aucun' },
  'Saphir': { ri: '1.762 - 1.770', sg: 4.01, defaultOrigin: 'Sri Lanka', defaultTreatment: 'Aucun (Non chauffé)' },
  'Rubis': { ri: '1.762 - 1.770', sg: 4.00, defaultOrigin: 'Birmanie (Mogok)', defaultTreatment: 'Aucun (Non chauffé)' },
  'Émeraude': { ri: '1.577 - 1.583', sg: 2.72, defaultOrigin: 'Colombie (Muzo)', defaultTreatment: 'Huile naturelle mineure' },
  'Tanzanite': { ri: '1.691 - 1.700', sg: 3.35, defaultOrigin: 'Tanzanie (Merelani)', defaultTreatment: 'Chauffé (Traditionnel)' },
  'Spinelle': { ri: '1.718', sg: 3.60, defaultOrigin: 'Tanzanie (Mahenge)', defaultTreatment: 'Aucun' },
  'Tourmaline': { ri: '1.624 - 1.644', sg: 3.06, defaultOrigin: 'Brésil', defaultTreatment: 'Aucun' },
  'Topaze': { ri: '1.619 - 1.627', sg: 3.53, defaultOrigin: 'Brésil', defaultTreatment: 'Aucun' }
};

interface InventoryManagerProps {
  suppliers?: Supplier[];
  onSaveSupplier?: (s: Supplier) => Promise<boolean | void> | boolean | void;
  gemstones: Gemstone[];
  selectedGem: Gemstone | null;
  onSaveGem: (gem: Gemstone) => void;
  onClearSelection: () => void;
  priceGuide?: PriceGuideEntry[];
  purchases?: Purchase[];
  onDeleteGem?: (id: string) => void;
  onCorrectGem?: (id: string, field: string, value: string, reason: string) => Promise<boolean>;
  onUpdateGemInline?: (gem: Gemstone) => void;
  onGenerateCertificate?: (reference: string) => void;
}

// Champs corrigeables sur une pierre vendue (miroir de CORRECTABLE_GEM_FIELDS côté serveur).
// Une donnée qui provient d'un document se corrige sur le document : la description de la
// marchandise (facture de vente) par un avoir, le fournisseur et le prix d'achat (achat) dans l'achat.
const CORRECTABLE_FIELDS: { key: string; label: string; numeric?: boolean; fromPurchase?: boolean }[] = [
  { key: 'costPrice', label: "Prix d'achat", numeric: true, fromPurchase: true },
  { key: 'dealer', label: 'Fournisseur', fromPurchase: true }
];

export default function InventoryManager({
  gemstones,
  selectedGem,
  onSaveGem,
  onClearSelection,
  priceGuide = [],
  purchases = [],
  suppliers = [],
  onSaveSupplier,
  onDeleteGem,
  onCorrectGem,
  onUpdateGemInline,
  onGenerateCertificate
}: InventoryManagerProps) {
  const [id, setId] = useState('');
  const [reference, setReference] = useState('');
  const [referenceError, setReferenceError] = useState('');
  const [sellingPriceError, setSellingPriceError] = useState('');
  const [type, setType] = useState('Diamant');
  const [customType, setCustomType] = useState('');
  const [weight, setWeight] = useState<number | string>(1.0);
  const [cut, setCut] = useState('Brillant Rond');
  const [color, setColor] = useState('F');
  const [clarity, setClarity] = useState('VS1');
  
  // Dimensions
  const [length, setLength] = useState<number | string>(6.0);
  const [width, setWidth] = useState<number | string>(6.0);
  const [depth, setDepth] = useState<number | string>(3.7);

  // Constants
  const [refractiveIndex, setRefractiveIndex] = useState('2.417');
  const [specificGravity, setSpecificGravity] = useState<number | string>(3.52);

  // Status & origin
  const [treatment, setTreatment] = useState('Aucun');
  const [origin, setOrigin] = useState('Afrique du Sud');
  const [isManualOrigin, setIsManualOrigin] = useState(false);
  const [certAuthority, setCertAuthority] = useState('GIA');
  const [certNumber, setCertNumber] = useState('');
  // Volontairement vides par défaut : une valeur pré-remplie fausserait
  // silencieusement les totaux du tableau de bord si elle n'est pas corrigée
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [sellingPrice, setSellingPrice] = useState<number | string>('');
  const [selectedTierId, setSelectedTierId] = useState('');
  const [status, setStatus] = useState<'Disponible' | 'Vendu' | 'Réservé' | 'Confié'>('Disponible');
  const [provenance, setProvenance] = useState('Stock initial');
  const [location, setLocation] = useState('');
  const [dealer, setDealer] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  // Fournisseurs proposés : ceux de l'annuaire ; la valeur déjà saisie sur une ancienne fiche reste visible
  const directorySuppliers = Array.from(new Set(suppliers.map(sp => (sp.name || '').trim()).filter(Boolean)))
    .sort((x, y) => x.localeCompare(y, 'fr'));
  const [description, setDescription] = useState('');
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [newInclusion, setNewInclusion] = useState('');
  const [image, setImage] = useState('');
  // Faux tant que la photo d'une pierre existante n'est pas chargée : on n'envoie alors
  // pas le champ image à l'enregistrement, pour ne jamais écraser la photo stockée
  const [imageReady, setImageReady] = useState(true);

  // Pierre vendue : le cœur de la fiche est verrouillé, on ne corrige que par une correction tracée
  const soldLocked = selectedGem?.status === 'Vendu';
  const [showCorrection, setShowCorrection] = useState(false);
  const [corrField, setCorrField] = useState('costPrice');
  const [corrValue, setCorrValue] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [corrError, setCorrError] = useState('');
  const [corrBusy, setCorrBusy] = useState(false);
  useEffect(() => { setShowCorrection(false); setCorrValue(''); setCorrReason(''); setCorrError(''); }, [selectedGem?.id]);

  const submitCorrection = async () => {
    if (!onCorrectGem || !selectedGem) return;
    if (corrValue.trim() === '') { setCorrError('Saisissez la nouvelle valeur.'); return; }
    if (corrReason.trim().length < 3) { setCorrError('Le motif est obligatoire.'); return; }
    setCorrBusy(true);
    setCorrError('');
    const ok = await onCorrectGem(selectedGem.id, corrField, corrValue, corrReason.trim());
    setCorrBusy(false);
    if (ok) { setShowCorrection(false); setCorrValue(''); setCorrReason(''); }
    else setCorrError('Correction refusée par le serveur (voir le message en haut de page).');
  };

  // Manage selection update
  useEffect(() => {
    let cancelled = false;
    if (selectedGem) {
      setId(selectedGem.id);
      setReference(selectedGem.reference);
      setReferenceError('');
      setSellingPriceError('');
      setType(selectedGem.type);
      setWeight(selectedGem.weight);
      setCut(selectedGem.cut);
      setColor(selectedGem.color);
      setClarity(selectedGem.clarity);
      setLength(selectedGem.dimensions.length);
      setWidth(selectedGem.dimensions.width);
      setDepth(selectedGem.dimensions.depth);
      setRefractiveIndex(selectedGem.refractiveIndex);
      setSpecificGravity(selectedGem.specificGravity);
      setTreatment(selectedGem.treatment);
      setOrigin(selectedGem.origin);
      if (selectedGem.origin && !ALL_SELECT_ORIGINS.includes(selectedGem.origin)) {
        setIsManualOrigin(true);
      } else {
        setIsManualOrigin(false);
      }
      setCertAuthority(selectedGem.certificate.authority);
      setCertNumber(selectedGem.certificate.number);
      setCostPrice(selectedGem.costPrice || '');
      setSellingPrice(selectedGem.sellingPrice || '');
      setSelectedTierId('');
      setStatus(selectedGem.status);
      setProvenance(selectedGem.provenance || (selectedGem.sourcePurchaseId ? 'Achat' : 'Stock initial'));
      setLocation(selectedGem.location || '');
      setDealer(selectedGem.dealer);
      setDescription(selectedGem.description);
      setInclusions(selectedGem.inclusions || []);
      setImage(selectedGem.image || '');
      if (selectedGem.hasImage && !selectedGem.image) {
        setImageReady(false);
        fetch(`/api/gemstones/${selectedGem.id}/image`)
          .then(r => (r.ok ? r.json() : { image: null }))
          .then(d => { if (!cancelled) { setImage(d.image || ''); setImageReady(true); } })
          .catch(() => { if (!cancelled) setImageReady(true); });
      } else {
        setImageReady(true);
      }
    } else {
      // Set to blank with generic next reference
      resetForm();
      setImageReady(true);
    }
    return () => { cancelled = true; };
  }, [selectedGem, gemstones]);

  // Autofill properties on Variety selection
  const handleTypeChange = (chosenType: string) => {
    setType(chosenType);
    setSelectedTierId('');
    const defaults = PARAM_TEMPLATES[chosenType];
    if (defaults) {
      setRefractiveIndex(defaults.ri);
      setSpecificGravity(defaults.sg);
      setOrigin(defaults.defaultOrigin);
      setTreatment(defaults.defaultTreatment);
      if (defaults.defaultOrigin && !ALL_SELECT_ORIGINS.includes(defaults.defaultOrigin)) {
        setIsManualOrigin(true);
      } else {
        setIsManualOrigin(false);
      }
    }
  };

  const resetForm = () => {
    setId('');
    const newRefId = gemstones.length + 1;
    setReference(`PP-2026-NEW-${newRefId.toString().padStart(3, '0')}`);
    setReferenceError('');
    setSellingPriceError('');
    setType('Diamant');
    setWeight(1.0);
    setCut('Brillant Rond');
    setColor('G');
    setClarity('VS1');
    setLength(6.0);
    setWidth(6.0);
    setDepth(3.7);
    setRefractiveIndex('2.417');
    setSpecificGravity(3.52);
    setTreatment('Aucun');
    setOrigin('Afrique du Sud');
    setIsManualOrigin(false);
    setCertAuthority('GIA');
    setCertNumber('');
    setCostPrice('');
    setSellingPrice('');
    setSelectedTierId('');
    setStatus('Disponible');
    setProvenance('Stock initial');
    setLocation('');
    setDealer('');
    setDescription('');
    setInclusions([]);
    setImage('');
    onClearSelection();
  };

  // Barème d'estimation : paliers définis par l'utilisateur dans Paramètres,
  // filtrés sur la variété courante. L'utilisateur juge la qualité (choix du
  // palier), l'app ne fait que multiplier la fourchette €/ct par le poids.
  const tiersForType = useMemo(() => {
    const finalType = (type === 'Autre (Saisir)' ? customType : type).trim().toLowerCase();
    if (!finalType) return [];
    return priceGuide.filter(e => e.gemstoneType.trim().toLowerCase() === finalType);
  }, [priceGuide, type, customType]);

  const selectedTier = tiersForType.find(t => t.id === selectedTierId) || null;
  const numericWeight = Number(weight) || 0;
  const tierRange = selectedTier && numericWeight > 0
    ? {
        min: Math.round(selectedTier.minPricePerCarat * numericWeight),
        max: Math.round(selectedTier.maxPricePerCarat * numericWeight)
      }
    : null;

  const handleAddInclusion = () => {
    if (newInclusion.trim() && !inclusions.includes(newInclusion.trim())) {
      setInclusions([...inclusions, newInclusion.trim()]);
      setNewInclusion('');
    }
  };

  const handleRemoveInclusion = (index: number) => {
    setInclusions(inclusions.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) {
      setReferenceError("Référence requise");
      document.getElementById('gem-ref-input')?.focus();
      return;
    }

    // Module 9 : le prix de vente devient obligatoire au moment de passer une
    // pierre au statut "Disponible" (pas avant, le temps de l'expertiser).
    if (status === 'Disponible' && !(Number(sellingPrice) > 0)) {
      setSellingPriceError("Prix de vente requis");
      document.getElementById('gem-selling-price-input')?.focus();
      return;
    }

    const finalType = type === 'Autre (Saisir)' ? customType : type;

    const updatedGem: Gemstone = {
      id: id || `gem-${Date.now()}`,
      reference: reference.toUpperCase(),
      type: finalType,
      weight: Number(weight),
      cut,
      color,
      clarity,
      dimensions: {
        length: Number(length),
        width: Number(width),
        depth: Number(depth)
      },
      refractiveIndex,
      specificGravity: Number(specificGravity),
      treatment,
      origin,
      certificate: {
        authority: certAuthority,
        number: certNumber
      },
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      status,
      location: location.trim() || undefined,
      dealer: dealer || 'N/A',
      dateAdded: selectedGem?.dateAdded || new Date().toISOString().split('T')[0],
      description: description || 'Pas de description clinique additionnelle.',
      inclusions,
      // '' = photo retirée ; undefined = photo non chargée, le serveur conserve l'existante
      image: imageReady ? image : undefined,
      hasImage: imageReady ? !!image : selectedGem?.hasImage,
      recuttings: selectedGem?.recuttings,
      // Traçabilité conservée : ne jamais écraser le lien vers l'achat d'origine
      sourcePurchaseId: selectedGem?.sourcePurchaseId,
      sourceArticleId: selectedGem?.sourceArticleId,
      provenance: selectedGem?.sourcePurchaseId ? 'Achat' : provenance
    };

    onSaveGem(updatedGem);
  };

  return (
    <div className="bg-[#121620] border border-[#212a3d] rounded-xl overflow-hidden shadow-2xl" id="inventory-tab">
      <div className="p-5 border-b border-[#212a3d] flex flex-wrap justify-between items-center gap-3 bg-[#171d2b]">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>{id ? `📝 Fiche Pierre — ${reference}` : "➕ Nouvelle Pierre (hors achat)"}</span>
          </h2>
          <p className="text-xs text-gray-400">
            {id
              ? "Caractéristiques, évaluation, retailles et certificat de cette pierre"
              : "Saisie manuelle : stock initial, transformation d'un lot ou autre provenance. Les acquisitions passent par Achats."}
          </p>
        </div>
        {id && (
          <div className="flex items-center gap-2">
            {onGenerateCertificate && (
              <button
                id="btn-fiche-certificate"
                type="button"
                onClick={() => onGenerateCertificate(reference)}
                className="px-3 py-1.5 text-xs bg-transparent hover:bg-gray-800 text-yellow-500 border border-yellow-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Award className="h-3.5 w-3.5" />
                <span>Imprimer la fiche</span>
              </button>
            )}
            {onDeleteGem && (
              <button
                id="btn-fiche-delete"
                type="button"
                onClick={() => onDeleteGem(id)}
                disabled={soldLocked}
                title={soldLocked ? 'Une pierre vendue figure sur une facture : elle ne peut pas être supprimée.' : undefined}
                className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Supprimer</span>
              </button>
            )}
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-xs bg-[#1f283b] hover:bg-[#2b3952] text-gray-300 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5 text-green-400" />
              <span>Créer Nouveau</span>
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} data-sold-locked={soldLocked ? 'true' : undefined} className="p-6 space-y-6">
        {soldLocked && (
          <div id="gem-locked-banner" className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300 leading-relaxed">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>Pierre vendue : fiche immuable.</strong> Ce qui a été vendu ne change plus. Une erreur sur la pierre se corrige par un avoir sur la facture de vente,
              puis une nouvelle facture. Seuls le prix d'achat et le fournisseur d'une pierre du stock initial se corrigent (« Corriger une donnée », sous le statut).
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column : General & 4Cs */}
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-sm font-bold font-mono text-[#b4985c] uppercase border-b border-gray-800 pb-1.5 flex items-center gap-1.5">
              <Compass className="h-4 w-4" />
              <span>1. Identification & Grades Essentiels (4Cs)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reference */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1 flex items-center gap-1">
                  <span>RÉFÉRENCE UNIQUE *</span>
                  {selectedGem?.sourcePurchaseId && <Lock className="h-3 w-3 text-gray-500 normal-case" />}
                </label>
                <input disabled={soldLocked}
                  id="gem-ref-input"
                  type="text"
                  readOnly={!!selectedGem?.sourcePurchaseId}
                  value={reference}
                  onChange={(e) => { setReference(e.target.value); setReferenceError(''); }}
                  title={selectedGem?.sourcePurchaseId ? "Référence attribuée automatiquement à partir de l'achat d'origine (n° facture/suffixe) — non modifiable" : undefined}
                  className={`w-full px-3 py-2 text-xs bg-[#171e2c] border ${referenceError ? 'border-red-500/70' : 'border-[#27354d]'} rounded-lg text-white focus:outline-none focus:border-[#b4985c] font-mono ${selectedGem?.sourcePurchaseId ? 'cursor-not-allowed bg-[#12161f]' : ''}`}
                  placeholder="ex: PP-2026-DI-001"
                />
                <p className="h-[14px] mt-0.5 text-red-400 text-[10px] leading-[14px] whitespace-nowrap overflow-hidden text-ellipsis" title={referenceError || undefined}>{referenceError}</p>
              </div>

              {/* Gemstone Variety */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">VARIÉTÉ / ESPÈCE DE PIERRE</label>
                <select disabled={soldLocked} 
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 rounded-lg focus:outline-none focus:border-[#b4985c]"
                >
                  <option value="Diamant">Diamant</option>
                  <option value="Saphir">Saphir</option>
                  <option value="Rubis">Rubis</option>
                  <option value="Émeraude">Émeraude</option>
                  <option value="Tanzanite">Tanzanite</option>
                  <option value="Spinelle">Spinelle</option>
                  <option value="Tourmaline">Tourmaline</option>
                  <option value="Topaze">Topaze</option>
                  <option value="Autre (Saisir)">Autre (Saisir)</option>
                </select>
                {type === 'Autre (Saisir)' && (
                  <input disabled={soldLocked} 
                    type="text" 
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c]"
                    placeholder="Saisissez la variété (ex: Alexandrite)"
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Weight in carats */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1 flex items-center justify-between">
                  <span>POIDS (cts) *</span>
                </label>
                <div className="relative">
                  <input disabled={soldLocked} 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c] font-mono font-bold"
                    required
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-gray-500 font-mono">ct</span>
                </div>
              </div>

              {/* Cut shape */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">TYPE DE TAILLE</label>
                <input disabled={soldLocked} 
                  type="text" 
                  value={cut} 
                  onChange={(e) => setCut(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c]"
                  placeholder="ex: Brillant Rond, Ovale, Coussin"
                />
              </div>

              {/* Color Grade */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">COULEUR / GRADE</label>
                <input disabled={soldLocked} 
                  type="text" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c]"
                  placeholder="ex: D (Diamant) ou Bleu saturé"
                />
              </div>

              {/* Clarity Grade */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">PURETÉ / CLARTÉ</label>
                <input disabled={soldLocked} 
                  type="text" 
                  value={clarity} 
                  onChange={(e) => setClarity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c]"
                  placeholder="ex: IF, VVS1, VS2, AAA"
                />
              </div>
            </div>

            <div className="border border-[#232f46]/40 bg-[#161c29]/50 p-4 rounded-xl space-y-3">
              <label className="block text-gray-300 text-xs font-mono uppercase tracking-wider">Dimensions Physiques (mm)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase font-mono">Longueur</label>
                  <input disabled={soldLocked} 
                    type="number" 
                    step="0.01" 
                    value={length} 
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#121620] border border-[#212a3d] rounded text-white focus:outline-none focus:border-[#b4985c]" 
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase font-mono">Largeur</label>
                  <input disabled={soldLocked} 
                    type="number" 
                    step="0.01" 
                    value={width} 
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#121620] border border-[#212a3d] rounded text-white focus:outline-none focus:border-[#b4985c]" 
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase font-mono">Profondeur</label>
                  <input disabled={soldLocked} 
                    type="number" 
                    step="0.01" 
                    value={depth} 
                    onChange={(e) => setDepth(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#121620] border border-[#212a3d] rounded text-white focus:outline-none focus:border-[#b4985c]" 
                  />
                </div>
              </div>
            </div>

            {/* Scientific constants Identification Details */}
            <h3 className="text-sm font-bold font-mono text-[#b4985c] uppercase border-b border-gray-800 pt-2 pb-1.5 flex items-center gap-1.5">
              <Scale className="h-4 w-4" />
              <span>2. Caractérisation Physico-Chimique (Laboratoire)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Refraction Index */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">INDICE DE RÉFRACTION (IR)</label>
                <input disabled={soldLocked} 
                  type="text" 
                  value={refractiveIndex} 
                  onChange={(e) => setRefractiveIndex(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white font-mono focus:outline-none focus:border-[#b4985c]"
                  placeholder="ex: 1.762 - 1.770"
                />
              </div>

              {/* Density Specific Gravity */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">DENSITÉ SPÉCIFIQUE (SG)</label>
                <input disabled={soldLocked} 
                  type="number" 
                  step="0.01"
                  value={specificGravity} 
                  onChange={(e) => setSpecificGravity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white font-mono focus:outline-none focus:border-[#b4985c]"
                  placeholder="ex: 4.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Treatment */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">TRAITEMENTS DÉTECTÉS</label>
                <input disabled={soldLocked} 
                  type="text" 
                  value={treatment} 
                  onChange={(e) => setTreatment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c]"
                  placeholder="ex: Aucun, Chauffé thermiquement, Huile mineure"
                />
              </div>

              {/* Geographic Origin */}
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">ORIGINE GÉOGRAPHIQUE</label>
                <div className="space-y-1.5">
                  <select disabled={soldLocked} 
                    value={isManualOrigin ? "__manual__" : origin} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__manual__") {
                        setIsManualOrigin(true);
                      } else {
                        setIsManualOrigin(false);
                        setOrigin(val);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none focus:border-[#b4985c] cursor-pointer"
                  >
                    <optgroup label="Origines Célèbres & Gisements">
                      {FAMOUS_GEM_ORIGINS.map((o) => (
                        <option key={`famous-${o}`} value={o}>{o}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Tous les Pays">
                      {STANDARD_COUNTRIES_FR.map((c) => (
                        <option key={`country-${c}`} value={c}>{c}</option>
                      ))}
                    </optgroup>
                    <option value="__manual__">— Autre (Saisie libre...) —</option>
                  </select>
                  
                  {isManualOrigin && (
                    <input disabled={soldLocked} 
                      type="text" 
                      value={origin} 
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c] animate-fadeIn"
                      placeholder="Saisissez l'origine précise..."
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column : Financial, Certificates, Inclusions */}
          <div className="space-y-4 bg-[#111520] p-4 rounded-xl border border-[#212a3d]">
            <h3 className="text-sm font-bold font-mono text-[#b4985c] uppercase border-b border-gray-800 pb-1.5 flex items-center gap-1.5">
              <FileCheck className="h-4 w-4" />
              <span>3. Certification & Comptabilité</span>
            </h3>

            {/* Provenance : automatique si issue d'un achat, sinon choix manuel */}
            <div>
              <label className="block text-gray-400 text-xs font-mono mb-1">PROVENANCE</label>
              {selectedGem?.sourcePurchaseId || (selectedGem && provenance === 'Achat') ? (
                (() => {
                  const srcPurchase = purchases.find(p => p.id === selectedGem?.sourcePurchaseId);
                  return (
                    <div id="provenance-readonly" className="px-3 py-2 text-xs bg-[#171e2c]/60 border border-[#27354d] rounded-lg text-gray-300 flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-gray-500 shrink-0" />
                      <span className="font-mono">
                        {srcPurchase
                          ? `Achat ${srcPurchase.reference} — ${srcPurchase.supplier}`
                          : 'Achat (facture supprimée)'}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <select disabled={soldLocked}
                  id="provenance-select"
                  value={provenance}
                  onChange={(e) => setProvenance(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 rounded-lg focus:outline-none focus:border-[#b4985c]"
                >
                  {PROVENANCE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-gray-400 text-xs font-mono mb-1">STATUT DE STOCK</label>
              <select
                id="gem-status-select"
                value={status}
                disabled={soldLocked}
                onChange={(e) => { setStatus(e.target.value as any); setSellingPriceError(''); }}
                className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 rounded-lg focus:outline-none focus:border-[#b4985c] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="Disponible">Disponible</option>
                <option value="Réservé">Réservé</option>
                {selectedGem?.status === 'Vendu' && <option value="Vendu">Vendu (par facture)</option>}
                <option value="Confié">Confié</option>
              </select>
              {soldLocked && (
                <>
                <p id="gem-sold-note" className="mt-1 text-[10px] text-gray-500 leading-snug">
                  Pierre vendue : sa fiche est immuable et son statut ne change que par un avoir sur la facture de vente.
                </p>
                {onCorrectGem && !selectedGem?.sourcePurchaseId && (showCorrection ? (
                  <div id="correction-panel" className="mt-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 space-y-2">
                    <p className="text-[10px] text-violet-200 leading-snug">
                      La correction est enregistrée dans l'historique de la pierre (ancienne valeur, nouvelle valeur, motif).
                    </p>
                    <p id="correction-rules" className="text-[10px] text-gray-400 leading-snug">
                      Une erreur sur la pierre elle-même (variété, poids, couleur, certificat, photo, description…) se corrige par un avoir sur la facture de vente, puis une nouvelle facture.
                    </p>
                    <select
                      id="correction-field"
                      value={corrField}
                      onChange={(e) => { setCorrField(e.target.value); setCorrValue(''); setCorrError(''); }}
                      className="w-full px-3 py-1.5 text-xs bg-[#171e2c] border border-[#27354d] text-gray-200 rounded-lg"
                    >
                      {CORRECTABLE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    <input
                      id="correction-value"
                      type={CORRECTABLE_FIELDS.find(f => f.key === corrField)?.numeric ? 'number' : 'text'}
                      step="any"
                      value={corrValue}
                      onChange={(e) => setCorrValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="Nouvelle valeur"
                      className="w-full px-3 py-1.5 text-xs bg-[#171e2c] border border-[#27354d] text-white rounded-lg"
                    />
                    <input
                      id="correction-reason"
                      type="text"
                      value={corrReason}
                      onChange={(e) => setCorrReason(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCorrection(); } }}
                      placeholder="Motif (obligatoire)"
                      className="w-full px-3 py-1.5 text-xs bg-[#171e2c] border border-[#27354d] text-white rounded-lg"
                    />
                    {corrError && <p id="correction-error" className="text-red-400 text-[10px]">{corrError}</p>}
                    <div className="flex gap-2">
                      <button
                        id="btn-confirm-correction"
                        type="button"
                        disabled={corrBusy}
                        onClick={submitCorrection}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-50 cursor-pointer"
                      >
                        Enregistrer la correction
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCorrection(false); setCorrError(''); }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-300 hover:text-white cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    id="btn-open-correction"
                    type="button"
                    onClick={() => setShowCorrection(true)}
                    className="mt-2 text-[11px] px-2.5 py-1 rounded border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 cursor-pointer"
                  >
                    Corriger une donnée…
                  </button>
                ))}
                {onCorrectGem && selectedGem?.sourcePurchaseId && (
                  <p id="gem-purchase-origin-note" className="mt-2 text-[10px] text-gray-400 leading-snug">
                    Le fournisseur et le prix d'achat proviennent de l'achat d'origine : modifiez-les dans « Achats », la fiche suivra.
                  </p>
                )}
                </>
              )}
            </div>

            {/* Emplacement physique */}
            <div>
              <label className="block text-gray-400 text-xs font-mono mb-1">EMPLACEMENT</label>
              <input
                id="gem-location-input"
                type="text"
                value={location}
                disabled={soldLocked}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ex: Coffre 2, tiroir B / confié à M. Durand"
                className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 rounded-lg focus:outline-none focus:border-[#b4985c]"
              />
            </div>

            {/* Cost and Appraised margins */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#171e2c]/60 rounded-lg border border-gray-800/60">
              <div>
                <label className="block text-gray-400 text-[10px] font-mono mb-1">PRIX D'ACHAT (€)</label>
                <input disabled={soldLocked}
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="—"
                  className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-[#212a3d] rounded text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-[10px] font-mono mb-1">
                  ESTIMATION (€) {status === 'Disponible' && <span className="text-red-400">*</span>}
                </label>
                <input disabled={soldLocked}
                  id="gem-selling-price-input"
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => { setSellingPrice(e.target.value); setSellingPriceError(''); }}
                  placeholder="Non estimée"
                  className={`w-full px-2 py-1.5 text-xs bg-[#121620] border ${sellingPriceError ? 'border-red-500/70' : 'border-[#212a3d]'} rounded text-white font-mono text-yellow-500 font-bold`}
                />
                <p className="h-[14px] mt-0.5 text-red-400 text-[10px] leading-[14px] whitespace-nowrap overflow-hidden text-ellipsis" title={sellingPriceError || undefined}>{sellingPriceError}</p>
              </div>

              {/* Barème d'estimation par paliers métier */}
              <div className="col-span-2 border-t border-gray-800/60 pt-2.5 space-y-1.5">
                <label className="block text-gray-400 text-[10px] font-mono">BARÈME (VOS PALIERS €/CT)</label>
                {tiersForType.length > 0 ? (
                  <>
                    <select disabled={soldLocked}
                      id="tier-select"
                      value={selectedTierId}
                      onChange={(e) => setSelectedTierId(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-[#212a3d] text-gray-300 rounded focus:outline-none focus:border-[#b4985c] cursor-pointer"
                    >
                      <option value="">Choisir un palier de qualité...</option>
                      {tiersForType.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.tierName} ({t.minPricePerCarat}–{t.maxPricePerCarat} €/ct)
                        </option>
                      ))}
                    </select>
                    {tierRange && (
                      <div id="tier-range" className="flex items-center justify-between gap-2 bg-[#121620] border border-[#2a3550] rounded px-2 py-1.5 animate-fadeIn">
                        <span className="text-[10px] font-mono text-gray-300">
                          {numericWeight} ct → <b className="text-[#e0b760]">{tierRange.min.toLocaleString('fr-FR')} – {tierRange.max.toLocaleString('fr-FR')} €</b>
                        </span>
                        <span className="flex gap-1">
                          {[
                            { label: 'Min', value: tierRange.min },
                            { label: 'Moy', value: Math.round((tierRange.min + tierRange.max) / 2) },
                            { label: 'Max', value: tierRange.max }
                          ].map(btn => (
                            <button
                              key={btn.label}
                              type="button"
                              onClick={() => setSellingPrice(btn.value)}
                              disabled={soldLocked}
                              className="px-1.5 py-0.5 text-[9px] font-bold bg-[#1f283b] hover:bg-[#bda165] hover:text-black text-gray-300 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {btn.label}
                            </button>
                          ))}
                        </span>
                      </div>
                    )}
                    {selectedTier && numericWeight <= 0 && (
                      <p className="text-[9px] text-gray-500 italic font-sans">Saisissez le poids pour calculer la fourchette.</p>
                    )}
                  </>
                ) : (
                  <p className="text-[9px] text-gray-500 italic font-sans leading-relaxed">
                    Aucun palier défini pour cette variété. Créez votre barème dans <b>Paramètres → Barème d'estimation</b>.
                  </p>
                )}
              </div>
            </div>

            {/* Laboratory Authority Certificates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">LABO EN CHARGE</label>
                <select disabled={soldLocked} 
                  value={certAuthority}
                  onChange={(e) => setCertAuthority(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 rounded-lg focus:outline-none"
                >
                  <option value="GIA">GIA</option>
                  <option value="IGI">IGI</option>
                  <option value="GRS">GRS</option>
                  <option value="SSEF">SSEF</option>
                  <option value="HRD">HRD</option>
                  <option value="Custom">Interne</option>
                  <option value="Sans">Aucun</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-mono mb-1">N° CERTIFICAT</label>
                <input 
                  type="text" 
                  value={certNumber} 
                  onChange={(e) => setCertNumber(e.target.value)}
                  disabled={soldLocked || certAuthority === 'Sans'}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white font-mono focus:outline-none focus:border-[#b4985c] disabled:opacity-40"
                  placeholder="ex: 2910481"
                />
              </div>
            </div>

            {/* Fournisseur : choisi dans l'annuaire, ou créé sur place */}
            <div>
              <label className="block text-gray-400 text-xs font-mono mb-1">FOURNISSEUR / NÉGOCIANT</label>
              <div className="flex items-center gap-2">
                <select disabled={soldLocked}
                  id="gem-dealer-select"
                  value={dealer}
                  onChange={(e) => setDealer(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c] cursor-pointer"
                >
                  <option value="">-- Aucun --</option>
                  {dealer && dealer !== 'N/A' && !directorySuppliers.includes(dealer) && (
                    <option value={dealer}>{dealer} (hors annuaire)</option>
                  )}
                  {directorySuppliers.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {onSaveSupplier && (
                  <button
                    type="button"
                    id="gem-new-supplier-button"
                    onClick={() => setIsSupplierModalOpen(true)}
                    disabled={soldLocked}
                    title={soldLocked ? 'Pierre vendue : le fournisseur ne peut plus être changé' : 'Nouveau fournisseur'}
                    className="shrink-0 px-3 py-2 bg-[#171e2c] hover:bg-[#1f283d] border border-[#27354d] text-[#bda165] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Inclusions List Management */}
            <div>
              <label className="block text-gray-400 text-xs font-mono mb-1">CARACTÉRISTIQUES D'INCLUSIONS (LOUPE 10X)</label>
              <div className="flex gap-2">
                <input disabled={soldLocked} 
                  type="text" 
                  value={newInclusion} 
                  onChange={(e) => setNewInclusion(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-[#171e2c] border border-[#27354d] rounded text-white"
                  placeholder="ex: Grains de carbone, soie"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInclusion(); } }}
                />
                <button 
                  type="button" 
                  onClick={handleAddInclusion}
                  disabled={soldLocked}
                  className="px-2.5 bg-[#1f283b] hover:bg-[#2b3952] text-white rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Ajouter
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {inclusions.map((inc, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 font-mono text-[9px] px-1.5 py-0.5 rounded border border-amber-500/15">
                    <span>{inc}</span>
                    {!soldLocked && <button type="button" onClick={() => handleRemoveInclusion(i)} className="text-red-400 hover:text-red-200">×</button>}
                  </span>
                ))}
              </div>
            </div>

            {/* Live Camera Reception Capture */}
            <div className="border-t border-gray-800 pt-4">
              <fieldset disabled={soldLocked} className="contents">
              <PhotoCapture 
                value={image}
                onChange={setImage}
                onClear={() => setImage('')}
                label="Prise de vue Réception"
              />
              </fieldset>
            </div>

          </div>
        </div>

        {/* Observation text area */}
        <div>
          <label className="block text-gray-400 text-xs font-mono mb-1">DESCRIPTION GENERALE & OBSERVATIONS CLINIQUES</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={soldLocked}
            rows={3}
            className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c] placeholder-gray-600"
            placeholder="Écrivez vos observations cliniques : micro-fractures soignées, fluorescence, pléochroïsme ou toute note importante relative à l'estimation."
          ></textarea>
        </div>

        {/* Actions Submit : rien à enregistrer sur une pierre vendue (fiche immuable) */}
        {!soldLocked && (
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
          <button 
            type="button" 
            onClick={resetForm}
            className="px-4 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="h-4.5 w-4.5" />
            <span>Réinitialiser</span>
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs bg-[#bda165] hover:bg-[#cca96e] text-black font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Save className="h-4.5 w-4.5" />
            <span>{id ? "Mettre à jour" : "Sauvegarder Pierre"}</span>
          </button>
        </div>
        )}
      </form>

      {/* Historique des retailles : uniquement sur une pierre existante */}
      {selectedGem && !soldLocked && onUpdateGemInline && (
        <div className="px-6 pb-6" id="fiche-recutting-section">
          <div className="border-t border-gray-800 pt-5">
            <RecuttingSection
              gemstone={selectedGem}
              onUpdateGemstone={onUpdateGemInline}
            />
          </div>
        </div>
      )}

      {/* Module 10 : historique des mouvements de stock de cette pierre */}
      {selectedGem && (
        <div className="px-6 pb-6">
          <div className="border-t border-gray-800 pt-5">
            <h3 className="text-sm font-bold font-mono text-[#b4985c] uppercase border-b border-gray-800 pb-1.5 mb-3 flex items-center gap-1.5">
              <History className="h-4 w-4" />
              <span>Historique des mouvements</span>
            </h3>
            {/* La key force un remontage (donc un nouveau fetch) quand la retaille ou le poids changent */}
            <div key={`${selectedGem.id}-${selectedGem.recuttings?.length ?? 0}-${selectedGem.weight}`}>
              <MovementHistory entityType="gemstone" entityId={selectedGem.id} />
            </div>
          </div>
        </div>
      )}

      {isSupplierModalOpen && onSaveSupplier && (
        <SupplierFormModal
          supplier={null}
          onSave={async (newSupplier) => {
            const ok = await onSaveSupplier(newSupplier);
            if (ok === false) return false;
            setDealer(newSupplier.name);
            return true;
          }}
          onClose={() => setIsSupplierModalOpen(false)}
        />
      )}
    </div>
  );
}
