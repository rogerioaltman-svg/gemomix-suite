/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Purchase, PurchaseArticle, Lot, Supplier, Gemstone } from '../types';
import PhotoCapture from './PhotoCapture';
import MovementHistory from './MovementHistory';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Layers,
  Database,
  Calendar,
  TrendingUp,
  Calculator,
  FolderOpen,
  FileText,
  ChevronRight,
  Activity,
  Sparkles,
  Hash,
  ArrowRight,
  Sparkle,
  Inbox,
  Scale,
  Check,
  Pencil,
  Lock,
  History
} from 'lucide-react';

interface PurchaseManagerProps {
  purchases: Purchase[];
  lots: Lot[];
  gemstones?: Gemstone[];
  onSavePurchase: (p: Purchase) => void;
  onDeletePurchase: (id: string) => void;
  onSaveLot: (l: Lot) => void;
  onDeleteLot: (id: string) => void;
  suppliers?: Supplier[];
}

export default function PurchaseManager({
  purchases,
  lots,
  gemstones = [],
  onSavePurchase,
  onDeletePurchase,
  onSaveLot,
  onDeleteLot,
  suppliers = []
}: PurchaseManagerProps) {
  // Tab within this component: 'purchases' or 'all-lots'
  const [managerTab, setManagerTab] = useState<'purchases' | 'all-lots'>('purchases');

  // Form states for NEW Purchase
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [purchaseRef, setPurchaseRef] = useState('');
  const [supplier, setSupplier] = useState('');

  // Erreurs de validation inline (clé = champ concerné)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Module 10 : lots dont l'historique des mouvements est actuellement déplié
  const [expandedHistoryLots, setExpandedHistoryLots] = useState<Set<string>>(new Set());
  const toggleLotHistory = (lotId: string) => {
    setExpandedHistoryLots(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId); else next.add(lotId);
      return next;
    });
  };

  const clearError = (key: string) => {
    setFormErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const showErrors = (errs: Record<string, string>, firstFieldId?: string) => {
    setFormErrors(prev => ({ ...prev, ...errs }));
    if (firstFieldId) document.getElementById(firstFieldId)?.focus();
  };

  const errorBorder = (key: string) => formErrors[key] ? 'border-red-500/70' : 'border-[#27354d]';

  const FieldError = ({ field }: { field: string }) =>
    formErrors[field] ? (
      <p className="text-red-400 text-[10px] font-sans normal-case mt-1">{formErrors[field]}</p>
    ) : null;

  // List of all suppliers for dropdown. Combine:
  // 1. Registered suppliers (props.suppliers)
  // 2. Suppliers from previous purchases
  // 3. Fallbacks to standard gem suppliers so it is never empty.
  const allSuppliers = useMemo(() => {
    const list = new Set<string>();
    
    // Add registered suppliers
    suppliers.forEach(s => {
      if (s.name && s.name.trim()) {
        list.add(s.name.trim());
      }
    });

    // Add suppliers from historic purchases
    purchases.forEach(p => {
      if (p.supplier && p.supplier.trim()) {
        list.add(p.supplier.trim());
      }
    });

    // Add default common suppliers as backup/placeholder options if empty
    if (list.size === 0) {
      list.add("Chanthaburi Sapphire Syndicate");
      list.add("Antwerp Diam Wholesale");
      list.add("Mogok Ruby House");
      list.add("Bogota Emerald Traders");
      list.add("Sri Lanka Gems Export");
    }

    return Array.from(list).sort();
  }, [suppliers, purchases]);

  const [isManualSupplier, setIsManualSupplier] = useState(false);

  // Editing state
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);

  const handleStartEditPurchase = (p: Purchase) => {
    setEditingPurchaseId(p.id);
    setPurchaseRef(p.reference);
    setSupplier(p.supplier);
    setPDate(p.date);
    setPNotes(p.notes || '');
    setSupplierRef(p.supplierReference || '');
    setTempArticles(p.articles || []);
    setIsManualSupplier(true);
    setIsAddingPurchase(true);
  };

  const handleStartEditLot = (lot: Lot) => {
    setEditingLotId(lot.id);
    setShowLotDetails(true);
    setLastSavedLot(null);
    // Amène le formulaire (collant en haut de colonne) dans le champ de vision
    setTimeout(() => document.getElementById('lot-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    setLotRef(lot.reference);
    setLotWeight(lot.weight.toString());
    setLotQty(lot.quantity ? lot.quantity.toString() : '');
    setLotSize(lot.averageSize || '');
    setLotColor(lot.averageColor || '');
    setLotClarity(lot.averageClarity || '');
    setLotCut(lot.cutType);
    setLotDest(lot.destination || '');
    setLotNotes(lot.notes || '');
    setLotImage(lot.image || '');
  };

  const [pDate, setPDate] = useState(new Date().toISOString().split('T')[0]);
  const [pNotes, setPNotes] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [tempArticles, setTempArticles] = useState<Omit<PurchaseArticle, 'id'>[]>([]);

  // States for adding a Single Article inside the temp purchase form
  const [artName, setArtName] = useState('');
  const [artType, setArtType] = useState('Saphir');
  const [artWeight, setArtWeight] = useState('');
  const [artCaratPrice, setArtCaratPrice] = useState('');
  const [artNotes, setArtNotes] = useState('');
  const [artDirectEntry, setArtDirectEntry] = useState(false);

  // Triage Workspace state: active PurchaseArticle under triaging
  const [activeTriageArticle, setActiveTriageArticle] = useState<{
    purchase: Purchase;
    article: PurchaseArticle;
  } | null>(null);

  // Form state for NEW LOT under active triage article
  const [lotRef, setLotRef] = useState('');
  const [lotWeight, setLotWeight] = useState('');
  const [lotQty, setLotQty] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [lotColor, setLotColor] = useState('');
  const [lotClarity, setLotClarity] = useState('');
  const [lotCut, setLotCut] = useState('Brut');
  const [lotDest, setLotDest] = useState('Lot de tri #1');
  const [lotNotes, setLotNotes] = useState('');
  const [lotImage, setLotImage] = useState('');

  // Ergonomie du tri : détails repliés par défaut, confirmation sur place, réf auto
  const [showLotDetails, setShowLotDetails] = useState(false);
  const [lastSavedLot, setLastSavedLot] = useState<{ id: string; reference: string; weight: number } | null>(null);

  // Module 7 : la référence du lot (n° facture d'achat / suffixe, ex "1/A") est
  // toujours attribuée par le serveur. On récupère un aperçu avant enregistrement.
  const fetchNextSubReference = async (purchaseId: string): Promise<string> => {
    try {
      const { reference } = await fetch(`/api/purchases/${purchaseId}/next-sub-reference`).then(r => r.json());
      return reference || '';
    } catch {
      return ''; // Le serveur attribuera la référence à l'enregistrement
    }
  };

  // Add article to temp list
  const handleAddTempArticle = () => {
    const weightNum = parseFloat(artWeight) || 0;
    const priceNum = parseFloat(artCaratPrice) || 0;

    const errs: Record<string, string> = {};
    if (!artName.trim()) errs.artName = "Veuillez saisir un nom pour l'article.";
    if (weightNum <= 0) errs.artWeight = "Le poids doit être supérieur à 0.";
    if (priceNum <= 0) errs.artCaratPrice = "Le prix au carat doit être supérieur à 0.";
    if (Object.keys(errs).length > 0) {
      showErrors(errs, errs.artName ? 'art-name-input' : errs.artWeight ? 'art-weight-input' : 'art-price-input');
      return;
    }
    clearError('articles');

    setTempArticles([
      ...tempArticles,
      {
        name: artName,
        gemstoneType: artType,
        weight: weightNum,
        caratPrice: priceNum,
        totalPrice: Number((weightNum * priceNum).toFixed(2)),
        notes: artNotes,
        entryMode: artDirectEntry ? 'stock' : 'tri'
      }
    ]);

    // Reset article form fields
    setArtName('');
    setArtWeight('');
    setArtCaratPrice('');
    setArtNotes('');
    setArtDirectEntry(false);
  };

  const handleRemoveTempArticle = (idx: number) => {
    setTempArticles(tempArticles.filter((_, i) => i !== idx));
  };

  // Save full purchase
  const handleSaveFullPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!purchaseRef.trim()) errs.purchaseRef = "La référence est requise.";
    if (!supplier.trim()) errs.supplier = "Le fournisseur est requis.";
    if (tempArticles.length === 0) errs.articles = "Ajoutez au moins un article d'achat avant d'enregistrer.";
    if (Object.keys(errs).length > 0) {
      showErrors(errs, errs.purchaseRef ? 'pur-ref'
        : errs.supplier ? (isManualSupplier ? 'pur-supplier' : 'pur-supplier-select')
        : 'art-name-input');
      return;
    }

    const totalCost = tempArticles.reduce((sum, art) => sum + art.totalPrice, 0);
    const newPurchase: Purchase = {
      id: editingPurchaseId || ('pur-' + Date.now()),
      reference: purchaseRef.trim(),
      supplierReference: supplierRef.trim() || undefined,
      supplier: supplier.trim(),
      date: pDate,
      status: 'En cours',
      totalCost: Number(totalCost.toFixed(2)),
      articles: tempArticles.map((art, i) => ({
        ...art,
        id: art.id ? art.id : `pa-${Date.now()}-${i}`
      })),
      notes: pNotes.trim()
    };

    onSavePurchase(newPurchase);

    // Reset state
    setSupplierRef('');
    setPurchaseRef('');
    setSupplier('');
    setPNotes('');
    setTempArticles([]);
    setIsAddingPurchase(false);
    setEditingPurchaseId(null);
    setFormErrors({});
  };

  // Save new lot de tri in triage workspace
  const handleSaveLotInTriage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTriageArticle) return;

    const weightNum = parseFloat(lotWeight) || 0;
    const errs: Record<string, string> = {};
    if (!lotRef.trim() || lotRef === '…') errs.lotRef = "La référence n'a pas pu être générée. Réessayez d'ouvrir le tri.";
    if (weightNum <= 0) errs.lotWeight = "Le poids du lot doit être supérieur à 0 ct.";
    else {
      // Blocage strict : le total trié ne peut pas dépasser le poids acheté du colis
      const otherLotsWeight = articleLots
        .filter(l => l.id !== editingLotId)
        .reduce((sum, l) => sum + l.weight, 0);
      const available = Number((activeTriageArticle.article.weight - otherLotsWeight).toFixed(2));
      if (weightNum > available + 0.0001) {
        errs.lotWeight = available > 0
          ? `Dépassement : il ne reste que ${available} ct à trier sur ce colis (${activeTriageArticle.article.weight} ct achetés).`
          : `Ce colis est entièrement trié (${activeTriageArticle.article.weight} ct) : aucun poids disponible.`;
      }
    }
    if (Object.keys(errs).length > 0) {
      showErrors(errs, errs.lotRef ? 'lot-ref-input' : 'lot-weight-input');
      return;
    }

    const { purchase, article } = activeTriageArticle;

    const newLot: Lot = {
      id: editingLotId || ('lot-' + Date.now()),
      reference: lotRef.trim(),
      purchaseId: purchase.id,
      purchaseArticleId: article.id,
      gemstoneType: article.gemstoneType,
      weight: weightNum,
      quantity: parseInt(lotQty) || undefined,
      averageSize: lotSize.trim() || undefined,
      averageColor: lotColor.trim() || undefined,
      averageClarity: lotClarity.trim() || undefined,
      cutType: lotCut,
      destination: lotDest.trim() || 'Lot de tri',
      dateCreated: editingLotId ? (lots.find(l => l.id === editingLotId)?.dateCreated || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      notes: lotNotes.trim() || undefined,
      image: lotImage || undefined
    };

    const wasEditing = !!editingLotId;
    onSaveLot(newLot);

    // Confirmation sur place + préparation de la saisie en chaîne
    if (!wasEditing) {
      setLastSavedLot({ id: newLot.id, reference: newLot.reference, weight: newLot.weight });
      setTimeout(() => {
        setLastSavedLot(prev => (prev?.id === newLot.id ? null : prev));
      }, 6000);
    }

    // Clear active lot form ; la réf suivante (attribuée par le serveur) est
    // pré-proposée, focus sur le poids
    setLotRef('…');
    fetchNextSubReference(purchase.id).then(setLotRef);
    setLotWeight('');
    setLotQty('');
    setLotSize('');
    setLotColor('');
    setLotClarity('');
    setLotNotes('');
    setLotImage('');
    setEditingLotId(null);
    setFormErrors({});
    setTimeout(() => document.getElementById('lot-weight-input')?.focus(), 0);
  };

  // Group lots by active article
  const articleLots = useMemo(() => {
    if (!activeTriageArticle) return [];
    return lots.filter(l => l.purchaseArticleId === activeTriageArticle.article.id);
  }, [lots, activeTriageArticle]);

  // Compute remaining unsorted weight on the current triage article
  const triageWeightStats = useMemo(() => {
    if (!activeTriageArticle) return { total: 0, sorted: 0, remaining: 0, percent: 0 };
    const total = activeTriageArticle.article.weight;
    const sorted = articleLots.reduce((sum, l) => sum + l.weight, 0);
    const remaining = Math.max(0, Number((total - sorted).toFixed(2)));
    const percent = Math.min(100, Math.round((sorted / total) * 100));
    return { total, sorted, remaining, percent };
  }, [activeTriageArticle, articleLots]);

  // All gemstone types helper
  const gemstoneTypesList = ['Saphir', 'Rubis', 'Émeraude', 'Diamant', 'Tanzanite', 'Spinelle', 'Tourmaline', 'Grenat', 'Autre'];

  return (
    <div className="space-y-6">
      
      {/* Tab select bar */}
      <div className="flex justify-between items-center bg-[#111520] p-4 rounded-xl border border-[#212a3d]">
        <div className="flex gap-2">
          <button 
            id="subtab-purchases"
            onClick={() => { 
              setManagerTab('purchases'); 
              setActiveTriageArticle(null); 
              setEditingLotId(null);
              setLotRef('');
              setLotWeight('');
              setLotQty('');
              setLotSize('');
              setLotColor('');
              setLotClarity('');
              setLotNotes('');
              setLotImage('');
            }}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg border transition-all flex items-center gap-2 ${managerTab === 'purchases' && !activeTriageArticle ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-gray-800'}`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Saisie & Registre des Achats</span>
          </button>
          <button 
            id="subtab-all-lots"
            onClick={() => { 
              setManagerTab('all-lots'); 
              setActiveTriageArticle(null); 
              setEditingLotId(null);
              setLotRef('');
              setLotWeight('');
              setLotQty('');
              setLotSize('');
              setLotColor('');
              setLotClarity('');
              setLotNotes('');
              setLotImage('');
            }}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg border transition-all flex items-center gap-2 ${managerTab === 'all-lots' && !activeTriageArticle ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-gray-800'}`}
          >
            <Layers className="h-4 w-4" />
            <span>Tous les Lots de Tri ({lots.length})</span>
          </button>
        </div>

        {managerTab === 'purchases' && !isAddingPurchase && !activeTriageArticle && (
          <button
            id="btn-trigger-add-pur"
            onClick={async () => {
              setIsAddingPurchase(true);
              setEditingPurchaseId(null);
              setPurchaseRef('…'); // Numéro en cours d'attribution
              setSupplier('');
              setSupplierRef('');
              setPNotes('');
              setTempArticles([]);
              try {
                const { reference } = await fetch('/api/purchases/next-reference').then(r => r.json());
                setPurchaseRef(reference);
              } catch {
                setPurchaseRef(''); // Le serveur attribuera le numéro à l'enregistrement
              }
            }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Saisir un Nouvel Achat</span>
          </button>
        )}
      </div>

      {/* 1. TRIAGE WORKSPACE DETAILED SUB-VIEW */}
      {activeTriageArticle && (
        <div className="space-y-6" id="triage-workspace">
          {/* Back breadcrumb */}
          <div className="flex items-center justify-between">
            <button 
              id="btn-back-to-registry"
              onClick={() => {
                setActiveTriageArticle(null);
                setEditingLotId(null);
                setLotRef('');
                setLotWeight('');
                setLotQty('');
                setLotSize('');
                setLotColor('');
                setLotClarity('');
                setLotNotes('');
                setLotImage('');
                setLastSavedLot(null);
                setShowLotDetails(false);
                setFormErrors({});
              }}
              className="text-xs font-mono font-bold text-gray-400 hover:text-white flex items-center gap-1 bg-[#161d2d] border border-gray-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Retour au registre d'achats
            </button>
            <span className="text-xs text-amber-500 font-mono tracking-wide bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/15">
              Ref d'Achat d'Origine : <b>{activeTriageArticle.purchase.reference}</b> ({activeTriageArticle.purchase.supplier})
            </span>
          </div>

          {/* Bandeau horizontal compact du colis de départ : libère la colonne du formulaire */}
          <div id="triage-source-banner" className="bg-[#121620] border border-[#212a3d] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="min-w-0 lg:w-1/3">
              <span className="text-[10px] uppercase tracking-wider text-[#b4985c] font-mono font-bold block">COLIS DE DÉPART</span>
              <h3 className="text-base font-bold text-white truncate mt-0.5">{activeTriageArticle.article.name}</h3>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full font-semibold">
                  {activeTriageArticle.article.gemstoneType}
                </span>
                <span className="text-[11px] text-gray-400 font-mono">
                  {activeTriageArticle.article.totalPrice.toLocaleString()} € ({activeTriageArticle.article.caratPrice} €/ct)
                </span>
              </div>
              {activeTriageArticle.article.notes && (
                <p className="text-[10px] text-gray-500 italic truncate mt-1" title={activeTriageArticle.article.notes}>
                  "{activeTriageArticle.article.notes}"
                </p>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 flex items-center gap-1.5"><Scale className="h-4 w-4 text-emerald-500" /> Bilan de tri matière</span>
                <span className="font-mono text-gray-500">{triageWeightStats.percent}% trié</span>
              </div>

              <div className="w-full bg-[#181f2f] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${triageWeightStats.percent}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                  <span className="text-gray-500 block text-[9px] uppercase">Achat total</span>
                  <span className="text-white font-bold">{triageWeightStats.total} ct</span>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/10">
                  <span className="text-emerald-500 block text-[9px] uppercase">En lots</span>
                  <span className="text-emerald-400 font-bold">{triageWeightStats.sorted} ct</span>
                </div>
                <div
                  className={`p-2 rounded-lg border ${triageWeightStats.remaining > 0 ? 'bg-yellow-500/5 border-yellow-500/10 text-yellow-500' : 'bg-green-500/10 border-green-500/10 text-green-400'}`}
                  title="Le résidu non trié ou poussière se calcule automatiquement à partir du poids total des lots consignés."
                >
                  <span className="block text-[9px] uppercase">Reste / Perte</span>
                  <span className="font-bold">{triageWeightStats.remaining} ct</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* LEFT COLUMN: FORM, collant à l'écran pendant que la liste défile */}
            <div className="lg:col-span-1 lg:sticky lg:top-20">

              {/* Form to create a new lot de tri */}
              <div id="lot-form-card" className="bg-[#121620] border border-[#212a3d] rounded-xl p-5 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto">
                <h4 className="text-xs font-mono font-bold text-white uppercase border-b border-gray-800 pb-2 flex items-center justify-between mb-4">
                  <span className="flex items-center gap-1.5">
                    {editingLotId ? <Pencil className="h-4 w-4 text-amber-500 animate-pulse" /> : <Plus className="h-4 w-4 text-emerald-500" />}
                    <span>{editingLotId ? "Modifier le Lot de Tri" : "Nouveau Lot de Tri"}</span>
                  </span>
                  {editingLotId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingLotId(null);
                        setLotRef('');
                        setLotWeight('');
                        setLotQty('');
                        setLotSize('');
                        setLotColor('');
                        setLotClarity('');
                        setLotNotes('');
                        setLotImage('');
                      }} 
                      className="text-[10px] text-gray-400 hover:text-white normal-case underline bg-transparent border-0 cursor-pointer"
                    >
                      Annuler modif
                    </button>
                  )}
                </h4>

                <form onSubmit={handleSaveLotInTriage} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-mono text-[10px] uppercase flex items-center gap-1">
                        <span>Réf. Lot / Pierre</span>
                        <Lock className="h-3 w-3 text-gray-500 normal-case" />
                      </label>
                      <input
                        id="lot-ref-input"
                        type="text"
                        readOnly
                        value={lotRef}
                        title="Numéro attribué automatiquement à partir du n° de la facture d'achat"
                        className={`w-full px-2.5 py-1.5 bg-[#12161f] border ${errorBorder('lotRef')} text-gray-300 rounded font-mono cursor-not-allowed`}
                      />
                      <FieldError field="lotRef" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-mono text-[10px] uppercase">Poids trié (ct)</label>
                      <input
                        id="lot-weight-input"
                        type="number"
                        step="0.001"
                        value={lotWeight}
                        onChange={(e) => { setLotWeight(e.target.value); clearError('lotWeight'); }}
                        placeholder="ex: 15.5"
                        className={`w-full px-2.5 py-1.5 bg-[#171e2c] border ${errorBorder('lotWeight')} text-[#eedfa7] rounded font-mono font-bold`}
                      />
                      <FieldError field="lotWeight" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-mono text-[10px] uppercase">Qté de pierres (approx)</label>
                      <input
                        id="lot-qty-input"
                        type="number"
                        value={lotQty}
                        onChange={(e) => setLotQty(e.target.value)}
                        placeholder="ex: 45"
                        className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-mono text-[10px] uppercase">Destination / Rangement</label>
                      <input
                        id="lot-dest-input"
                        type="text"
                        value={lotDest}
                        onChange={(e) => setLotDest(e.target.value)}
                        placeholder="ex: Tiroir A-3 sachet rouge"
                        className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Détails optionnels : repliés par défaut pour garder le bouton visible */}
                  <button
                    id="btn-toggle-lot-details"
                    type="button"
                    onClick={() => setShowLotDetails(!showLotDetails)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#161d2d] hover:bg-[#1b2333] border border-gray-800 rounded-lg text-[10px] font-mono uppercase text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <span>{showLotDetails ? '▾' : '▸'} Détails optionnels (taille, couleur, pureté, forme, notes, photo)</span>
                    <span className="text-gray-600 normal-case">{showLotDetails ? 'replier' : 'déplier'}</span>
                  </button>

                  {showLotDetails && (
                    <div className="space-y-3.5 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-gray-400 font-mono text-[10px] uppercase">Taille Moyenne</label>
                          <input
                            id="lot-size-input"
                            type="text"
                            value={lotSize}
                            onChange={(e) => setLotSize(e.target.value)}
                            placeholder="ex: 2.1mm - 2.3mm"
                            className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-gray-400 font-mono text-[10px] uppercase">Forme / Taille physique</label>
                          <select
                            id="lot-cut-select"
                            value={lotCut}
                            onChange={(e) => setLotCut(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded"
                          >
                            <option value="Brut">Brut / Cristaux</option>
                            <option value="Brillant Rond">Brillant Rond</option>
                            <option value="Coussin">Coussin</option>
                            <option value="Émeraude">Émeraude</option>
                            <option value="Ovale">Ovale</option>
                            <option value="Poire">Poire</option>
                            <option value="Autre / Mixte">Autre / Mixte</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-gray-400 font-mono text-[10px] uppercase">Couleur Moyenne</label>
                          <input
                            id="lot-color-input"
                            type="text"
                            value={lotColor}
                            onChange={(e) => setLotColor(e.target.value)}
                            placeholder="ex: Bleu Royal vif"
                            className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-gray-400 font-mono text-[10px] uppercase">Pureté Globale</label>
                          <input
                            id="lot-clarity-input"
                            type="text"
                            value={lotClarity}
                            onChange={(e) => setLotClarity(e.target.value)}
                            placeholder="ex: VS"
                            className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-gray-400 font-mono text-[10px] uppercase">Notes additionnelles</label>
                        <textarea
                          id="lot-notes-input"
                          rows={2}
                          value={lotNotes}
                          onChange={(e) => setLotNotes(e.target.value)}
                          placeholder="Commentaires sur la qualité du lot de tri physique..."
                          className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded"
                        />
                      </div>

                      {/* Lot snapshot photo taker */}
                      <div className="border-t border-gray-800 pt-4">
                        <PhotoCapture
                          value={lotImage}
                          onChange={setLotImage}
                          onClear={() => setLotImage('')}
                          label="Prise de vue du Lot"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    id="btn-save-lot"
                    type="submit"
                    className={`w-full py-2 ${editingLotId ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500 hover:bg-emerald-400'} text-black font-bold font-mono text-center rounded transition-colors`}
                  >
                    {editingLotId ? "Enregistrer les modifications" : "Enregistrer le Lot de Tri"}
                  </button>

                  {/* Confirmation sur place après consignation */}
                  {lastSavedLot && !editingLotId && (
                    <div
                      id="lot-saved-banner"
                      className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 animate-fadeIn"
                    >
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-emerald-300 font-mono">
                        Lot <b>{lastSavedLot.reference}</b> consigné ({lastSavedLot.weight} ct) — prêt pour le suivant
                      </span>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: LIST OF CREATED SACHETS FOR THIS BULK ARTICLE */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold font-mono text-gray-400 uppercase border-b border-gray-800 pb-2 flex items-center justify-between">
                <span>Contenu du tri : Lots générés ({articleLots.length})</span>
                <span className="text-[10px] text-emerald-400">Total accumulé : {triageWeightStats.sorted} ct</span>
              </h3>

              {articleLots.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-[#121620] border border-dashed border-gray-800 rounded-xl text-center">
                  <Inbox className="h-12 w-12 text-gray-600 mb-3" />
                  <p className="text-sm font-mono text-gray-400 font-bold mb-1">Aucun lot de tri consigné.</p>
                  <p className="text-xs text-gray-500 max-w-sm">
                    Utilisez le formulaire à gauche pour enregistrer un premier lot issu du tri de votre article brut.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {articleLots.map((lot) => (
                    <div
                      key={lot.id}
                      className={`bg-[#121620] border rounded-xl p-4 space-y-3 hover:border-[#b4985c]/40 transition-all duration-200 ${lastSavedLot?.id === lot.id ? 'border-emerald-400/70 ring-1 ring-emerald-400/40 animate-fadeIn' : 'border-[#232f46]'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2.5 items-center">
                          {lot.image && (
                            <img 
                              src={lot.image} 
                              alt="Aperçu du lot"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 object-cover rounded-lg border border-gray-800 bg-black shrink-0 animate-fadeIn"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-base">{lot.reference}</span>
                              <span className="bg-[#181f2f] text-[#eedfa7] border border-[#b4985c]/20 font-mono text-[10px] px-2 py-0.5 rounded">
                                {lot.weight.toFixed(2)} ct
                              </span>
                            </div>
                            <span className="text-xs text-sky-400 font-mono block mt-0.5">Lot de {lot.gemstoneType}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            id={`btn-edit-lot-${lot.id}`}
                            onClick={() => handleStartEditLot(lot)}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded transition-colors"
                            title="Modifier ce lot"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            id={`btn-del-lot-${lot.id}`}
                            onClick={() => onDeleteLot(lot.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                            title="Supprimer ce lot de tri"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-gray-800/60 pt-3">
                        <div>
                          <span className="text-gray-500 block">Forme/Taille:</span>
                          <span className="text-gray-300">{lot.cutType}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Unités approx:</span>
                          <span className="text-gray-300">{lot.quantity ? `${lot.quantity} pcs` : '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Plage taille:</span>
                          <span className="text-[#eedfa7]">{lot.averageSize || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Couleur/Pureté:</span>
                          <span className="text-gray-300">{[lot.averageColor, lot.averageClarity].filter(Boolean).join(' / ') || '-'}</span>
                        </div>
                      </div>

                      {/* Module 8 : report auto du prix d'achat depuis l'article parent (lecture seule) */}
                      <div className="flex items-center justify-between gap-2 bg-[#12161f] border border-gray-800/60 rounded-lg px-2.5 py-2 text-[11px] font-mono">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Prix d'achat
                        </span>
                        <span className="text-[#eedfa7]">
                          {activeTriageArticle.article.caratPrice.toLocaleString('fr-FR')} €/ct
                          <span className="text-gray-500 mx-1">→</span>
                          <b>{(lot.weight * activeTriageArticle.article.caratPrice).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €</b>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleLotHistory(lot.id)}
                        className="w-full flex items-center justify-between text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors py-1"
                      >
                        <span className="flex items-center gap-1"><History className="h-3 w-3" /> Historique des mouvements</span>
                        <span>{expandedHistoryLots.has(lot.id) ? '▾ replier' : '▸ déplier'}</span>
                      </button>
                      {expandedHistoryLots.has(lot.id) && (
                        <MovementHistory entityType="lot" entityId={lot.id} compact />
                      )}

                      {lot.notes && (
                        <p className="text-[11px] text-gray-400 bg-black/30 p-2 rounded border border-gray-800/40 italic">
                          "{lot.notes}"
                        </p>
                      )}

                      <div className="text-[10px] font-mono text-gray-500 flex justify-between pt-1 border-t border-gray-800/40">
                        <span>Créé le: {lot.dateCreated}</span>
                        <span className="text-[#b4985c]">{lot.destination}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD NEW PURCHASE FORM MODE */}
      {isAddingPurchase && (
        <form onSubmit={handleSaveFullPurchase} className="bg-[#121620] border border-[#212a3d] rounded-xl p-6 space-y-6" id="add-purchase-form">
          <div className="border-b border-gray-800 pb-4 flex justify-between items-center bg-[#171d2b] -mx-6 -mt-6 p-6 rounded-t-xl mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#eedfa7]" />
                <span>{editingPurchaseId ? "Modification de l'Achat" : "Saisie d'un Nouvel Achat de Pierres"}</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{editingPurchaseId ? "Modifiez les informations générales et le bordereau d'articles de cet achat." : "Enregistrez un bordereau d'achat ou une facture de brut / colis mélangé."}</p>
            </div>
            <button 
              id="btn-cancel-add-pur"
              type="button"
              onClick={() => {
                setIsAddingPurchase(false);
                setEditingPurchaseId(null);
                setPurchaseRef('');
                setSupplier('');
                setSupplierRef('');
                setPNotes('');
                setTempArticles([]);
                setFormErrors({});
              }}
              className="text-xs font-mono font-bold text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded transition-all"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1 font-mono uppercase">
              <label className="block text-gray-300 flex items-center gap-1">
                <span>N° Facture d'Achat</span>
                <Lock className="h-3 w-3 text-gray-500 normal-case" />
              </label>
              <input
                id="pur-ref"
                type="text"
                readOnly
                value={purchaseRef}
                title="Numéro attribué automatiquement — sert de racine à la numérotation des lots et pierres issus de cet achat"
                className={`w-full px-3 py-2 bg-[#12161f] border ${errorBorder('purchaseRef')} text-gray-300 rounded cursor-not-allowed`}
              />
              <FieldError field="purchaseRef" />
              <label className="block text-gray-300 mt-3">N° Facture Fournisseur</label>
              <input
                id="pur-supplier-ref"
                type="text"
                value={supplierRef}
                onChange={(e) => setSupplierRef(e.target.value)}
                placeholder="N° d'origine (optionnel)"
                title="Numéro figurant sur la facture émise par le fournisseur"
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded focus:border-[#b4985c] normal-case"
              />
            </div>
            <div className="space-y-1 font-mono uppercase col-span-2">
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-gray-300">Fournisseur / Négociant de brut</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualSupplier(!isManualSupplier);
                    setSupplier('');
                  }}
                  className="text-[10px] text-amber-400 hover:underline hover:text-amber-300 transition-colors normal-case animate-pulse"
                >
                  {isManualSupplier ? "🔌 Choisir dans la liste" : "✍️ Saisie libre"}
                </button>
              </div>
              
              {isManualSupplier ? (
                <input
                  id="pur-supplier"
                  type="text"
                  value={supplier}
                  onChange={(e) => { setSupplier(e.target.value); clearError('supplier'); }}
                  placeholder="ex: Antwerp Diam Wholesale, Chanthaburi Syndicate"
                  className={`w-full px-3 py-2 bg-[#171e2c] border ${errorBorder('supplier')} text-white rounded focus:border-[#b4985c]`}
                />
              ) : (
                <div className="relative">
                  <select
                    id="pur-supplier-select"
                    value={supplier}
                    onChange={(e) => {
                      clearError('supplier');
                      if (e.target.value === "__NEW__") {
                        setIsManualSupplier(true);
                        setSupplier('');
                      } else {
                        setSupplier(e.target.value);
                      }
                    }}
                    className={`w-full px-3 py-2 bg-[#171e2c] border ${errorBorder('supplier')} text-white rounded focus:border-[#b4985c] cursor-pointer appearance-none pr-8`}
                  >
                    <option value="">-- Choisir un fournisseur --</option>
                    {allSuppliers.map(supName => (
                      <option key={supName} value={supName}>
                        {supName}
                      </option>
                    ))}
                    <option value="__NEW__" className="text-amber-400 font-bold font-mono">+ Nouveau fournisseur / Saisie libre...</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              )}
              <FieldError field="supplier" />
            </div>
            <div className="space-y-1 font-mono uppercase">
              <label className="block text-gray-300">Date d'Acquisition</label>
              <input 
                id="pur-date"
                type="date"
                required
                value={pDate}
                onChange={(e) => setPDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded focus:border-[#b4985c]"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="block text-gray-400 font-mono uppercase">Notes de bordereau d'achats</label>
            <textarea 
              id="pur-notes"
              rows={2}
              value={pNotes}
              onChange={(e) => setPNotes(e.target.value)}
              placeholder="Spécifiez les détails administratifs, de douane, ou d'origine internationale..."
              className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded focus:border-[#b4985c]"
            />
          </div>

          {/* Sub-Articles Adder block inside the form */}
          <div className="bg-[#111520] p-4 rounded-xl border border-[#212a3d] space-y-4">
            <h4 className="text-xs font-bold font-mono text-[#b4985c] uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
              <span>Articles Composants l'Achat</span>
              <span className="text-[10px] text-gray-500 font-sans normal-case">Ajoutez chaque lot ou diamant brut de la facture</span>
            </h4>
            <FieldError field="articles" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs items-end">
              <div className="md:col-span-5 space-y-1">
                <label className="block text-gray-400 font-mono text-[10px] uppercase">Désignation de l'Article / Colis</label>
                <input
                  id="art-name-input"
                  type="text"
                  value={artName}
                  onChange={(e) => { setArtName(e.target.value); clearError('artName'); }}
                  placeholder="ex: Lot de 50 saphirs jaunes bruts"
                  className={`w-full px-2.5 py-1.5 bg-[#171e2c] border ${errorBorder('artName')} text-white rounded`}
                />
                <FieldError field="artName" />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="block text-gray-400 font-mono text-[10px] uppercase">Structure Minérale</label>
                <select 
                  id="art-type-select"
                  value={artType}
                  onChange={(e) => setArtType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded"
                >
                  {gemstoneTypesList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-gray-400 font-mono text-[10px] uppercase">Poids total (ct)</label>
                <input
                  id="art-weight-input"
                  type="number"
                  step="0.01"
                  value={artWeight}
                  onChange={(e) => { setArtWeight(e.target.value); clearError('artWeight'); }}
                  placeholder="ex: 80.00"
                  className={`w-full px-2.5 py-1.5 bg-[#171e2c] border ${errorBorder('artWeight')} text-white font-mono rounded`}
                />
                <FieldError field="artWeight" />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-gray-400 font-mono text-[10px] uppercase">Prix d'achat / ct (€)</label>
                <input
                  id="art-price-input"
                  type="number"
                  step="0.1"
                  value={artCaratPrice}
                  onChange={(e) => { setArtCaratPrice(e.target.value); clearError('artCaratPrice'); }}
                  placeholder="ex: 45.00"
                  className={`w-full px-2.5 py-1.5 bg-[#171e2c] border ${errorBorder('artCaratPrice')} text-white font-mono rounded`}
                />
                <FieldError field="artCaratPrice" />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-gray-400 font-mono text-[10px] uppercase">Notes physiques de l'Article (Optionnel)</label>
              <input
                id="art-notes-input"
                type="text"
                value={artNotes}
                onChange={(e) => setArtNotes(e.target.value)}
                placeholder="Rapport d'aspect, dimension grossière des bruts, couleur d'aspect d'origine..."
                className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-[#27354d] text-gray-300 rounded"
              />
            </div>

            {/* Ligne d'action : nature de l'article + ajout au bordereau */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs pt-1">
              <label
                htmlFor="art-direct-entry"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${artDirectEntry ? 'bg-[#bda165]/15 border-[#bda165]/50 text-[#e0b760]' : 'bg-[#171e2c] border-[#27354d] text-gray-400 hover:text-gray-200'}`}
                title="La pierre sera créée automatiquement dans l'inventaire à l'enregistrement de l'achat, sans passer par le tri"
              >
                <input
                  id="art-direct-entry"
                  type="checkbox"
                  checked={artDirectEntry}
                  onChange={(e) => setArtDirectEntry(e.target.checked)}
                  className="accent-[#bda165] cursor-pointer"
                />
                <span className="text-[11px] font-semibold">💎 Pierre unique — entrée directe en stock</span>
              </label>
              <button
                id="btn-add-subart"
                type="button"
                onClick={handleAddTempArticle}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-750 text-yellow-500 font-mono font-bold hover:text-yellow-400 rounded border border-gray-700 flex items-center justify-center gap-1 transition-colors shrink-0"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>Ajouter{artDirectEntry ? ' la pierre' : " l'article"}</span>
              </button>
            </div>

            {/* List of currently created temp articles */}
            {tempArticles.length > 0 && (
              <div className="mt-4 border-t border-gray-800 pt-3">
                <span className="text-[10px] font-mono uppercase text-gray-500 block mb-2">Bordereau temporaire des articles saisis :</span>
                <div className="space-y-2">
                  {tempArticles.map((art, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-black/30 p-2.5 rounded-lg border border-gray-800 font-mono text-xs text-gray-300">
                      <div>
                        <span className="font-bold text-white font-sans text-sm">{art.name}</span>
                        <span className={`ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded border ${art.entryMode === 'stock' ? 'bg-[#bda165]/10 text-[#e0b760] border-[#bda165]/30' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                          {art.entryMode === 'stock' ? '💎 Stock direct' : '📦 À trier'}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-3">
                          <span>Catégorie : <b className="text-gray-300 font-sans">{art.gemstoneType}</b></span>
                          <span>•</span>
                          <span>Poids : <b className="text-[#eedfa7]">{art.weight} ct</b></span>
                          <span>•</span>
                          <span>Prix/ct : <b>{art.caratPrice} €/ct</b></span>
                        </div>
                        {art.notes && <p className="text-[10px] text-gray-500 italic font-sans mt-0.5">"{art.notes}"</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[#eedfa7] font-bold text-sm">{(art.weight * art.caratPrice).toLocaleString()} €</span>
                        <button 
                          id={`btn-remove-tempart-${idx}`}
                          type="button"
                          onClick={() => handleRemoveTempArticle(idx)}
                          className="p-1 hover:bg-red-500/10 text-red-400 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pr-4 text-xs mt-3 font-mono">
                    <span className="text-gray-400">Coût total du bordereau : </span>
                    <span className="text-emerald-400 font-bold ml-2 text-sm">
                      {tempArticles.reduce((sum, a) => sum + a.totalPrice, 0).toLocaleString()} €
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              id="btn-cancel-form"
              type="button"
              onClick={() => {
                setIsAddingPurchase(false);
                setEditingPurchaseId(null);
                setPurchaseRef('');
                setSupplier('');
                setSupplierRef('');
                setPNotes('');
                setTempArticles([]);
                setFormErrors({});
              }}
              className="px-5 py-2.5 bg-transparent hover:bg-gray-800 text-gray-300 rounded-lg text-xs font-semibold"
            >
              Fermer sans enregistrer
            </button>
            <button 
              id="btn-confirm-add-pur"
              type="submit"
              className={`px-6 py-2.5 ${editingPurchaseId ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500 hover:bg-emerald-400'} text-black font-bold font-mono text-xs rounded-lg transition-colors flex items-center gap-1`}
            >
              <Check className="h-4 w-4" />
              <span>{editingPurchaseId ? "Enregistrer les modifications" : "Valider l'Achat complet"}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. PURCHASES GENERAL VIEW TAB */}
      {managerTab === 'purchases' && !isAddingPurchase && !activeTriageArticle && (
        <div className="space-y-4" id="purchases-registry-view">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-amber-500" />
              <span>Registre d'Acquisitions de Joaillerie</span>
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">
              Total cumulé des achats: <b>{purchases.reduce((sum, p) => sum + p.totalCost, 0).toLocaleString()} €</b>
            </span>
          </div>

          {purchases.length === 0 ? (
            <div className="text-center p-12 bg-[#121620] rounded-xl border border-dashed border-gray-800 text-gray-400">
              <Inbox className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-sm font-bold">Aucun achat consigné dans l'historique.</p>
              <p className="text-xs text-gray-500 mt-1">Créez votre première facture en cliquant sur "Saisir un Nouvel Achat".</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((purchase) => {
                // Compute number of sorted lots in this purchase
                const pLots = lots.filter(l => l.purchaseId === purchase.id);
                return (
                  <div 
                    key={purchase.id} 
                    className="bg-[#121620] border border-[#212a3d] rounded-xl overflow-hidden hover:border-[#b4985c]/30 transition-all duration-300"
                  >
                    {/* Header bar of purchase card */}
                    <div className="p-4 bg-[#171d2b] border-b border-[#212a3d] flex flex-wrap justify-between items-center gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs bg-[#b4985c]/10 text-[#eedfa7] border border-[#b4985c]/20 font-mono px-2 py-0.5 rounded font-bold">
                          {purchase.reference}
                        </span>
                        <h4 className="font-bold text-white text-sm">{purchase.supplier}</h4>
                        {purchase.supplierReference && (
                          <span className="text-[10px] text-gray-400 font-mono" title="N° de facture du fournisseur">
                            Fact. fourn. {purchase.supplierReference}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {purchase.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono">
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 block">TOTAL FACTURE</span>
                          <span className="text-emerald-400 font-extrabold text-sm">{purchase.totalCost.toLocaleString()} €</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            id={`btn-edit-pur-${purchase.id}`}
                            onClick={() => handleStartEditPurchase(purchase)}
                            className="p-1 px-2 hover:bg-amber-500/10 text-amber-500 rounded text-xs flex items-center gap-1 transition-colors"
                            title="Modifier cet achat"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            id={`btn-delete-pur-${purchase.id}`}
                            onClick={() => onDeletePurchase(purchase.id)}
                            className="p-1 px-2 hover:bg-red-500/10 text-red-400 rounded text-xs flex items-center gap-1 transition-colors"
                            title="Supprimer cet achat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Purchase notes if any */}
                    {purchase.notes && (
                      <p className="px-5 py-2 text-xs italic text-gray-400 bg-black/20 border-b border-gray-900 leading-relaxed">
                        "{purchase.notes}"
                      </p>
                    )}

                    {/* Articles list contained inside this purchase */}
                    <div className="p-5 space-y-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block">Articles de l'achat (colis à trier & pierres uniques) :</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {purchase.articles.map((article) => {
                          // Compute weight stats specifically for this individual article
                          const subLots = pLots.filter(l => l.purchaseArticleId === article.id);
                          const totalSorted = subLots.reduce((sum, l) => sum + l.weight, 0);
                          const weightPercent = Math.min(100, Math.round((totalSorted / article.weight) * 100));

                          return (
                            <div 
                              key={article.id} 
                              className="bg-[#111520] p-4 rounded-xl border border-[#1f283d] flex flex-col justify-between space-y-3.5"
                            >
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <h5 className="font-bold text-[#eedfa7] text-sm leading-tight">{article.name}</h5>
                                  <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-bold font-mono">
                                    {article.gemstoneType}
                                  </span>
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[10px] text-gray-400">
                                  <div>Poids parcel: <b className="text-white">{article.weight} ct</b></div>
                                  <div>Carat: <b className="text-white">{article.caratPrice} €/ct</b></div>
                                  <div>Total: <b className="text-[#eedfa7]">{article.totalPrice.toLocaleString()} €</b></div>
                                </div>
                                {article.notes && (
                                  <p className="text-[10px] text-gray-500 italic mt-1.5">"{article.notes}"</p>
                                )}
                              </div>

                              {article.entryMode === 'stock' ? (
                                /* Pierre unique : entrée directe en stock, pas de tri */
                                (() => {
                                  const linkedGem = gemstones.find(g => g.sourceArticleId === article.id);
                                  return (
                                    <div className="pt-1.5 border-t border-gray-800/40">
                                      {linkedGem ? (
                                        <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2.5">
                                          <span className="text-[11px] font-mono text-emerald-400 font-bold">💎 En stock : {linkedGem.reference}</span>
                                          <span className="text-[10px] font-mono text-gray-400">Statut : {linkedGem.status}</span>
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-gray-500 italic py-2">
                                          Pierre unique — entrée directe en stock (fiche supprimée de l'inventaire ou en attente de création).
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <>
                                  {/* Small Triage gauge underneath */}
                                  <div className="space-y-1 pt-1.5 border-t border-gray-800/40">
                                    <div className="flex justify-between text-[9px] font-mono text-gray-400">
                                      <span>Trié en lots : {totalSorted.toFixed(1)} ct / {article.weight} ct</span>
                                      <span className={weightPercent === 100 ? 'text-green-400 font-bold' : 'text-amber-500'}>
                                        {weightPercent}% trié
                                      </span>
                                    </div>

                                    <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-1.5 rounded-full transition-all duration-300 ${weightPercent === 100 ? 'bg-green-500' : 'bg-amber-400'}`}
                                        style={{ width: `${weightPercent}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Triage Trigger action btn */}
                                  <button
                                    id={`btn-triage-${article.id}`}
                                    onClick={async () => {
                                      setActiveTriageArticle({ purchase, article });
                                      setLotRef('…');
                                      setLastSavedLot(null);
                                      setLotRef(await fetchNextSubReference(purchase.id));
                                    }}
                                    className="w-full py-2 bg-[#1b2333] hover:bg-[#202a3d] border border-gray-700 hover:border-gray-600 text-xs font-mono font-bold text-[#eedfa7] rounded-lg transition-all flex items-center justify-center gap-1"
                                  >
                                    <span>🛠️ Organiser & Trier en Lots ({subLots.length})</span>
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. ALL LOTS / SACHETS PHYSICAL VIEW TAB */}
      {managerTab === 'all-lots' && !activeTriageArticle && (
        <div className="space-y-4" id="all-lots-view">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h3 className="text-xs font-bold font-mono text-gray-400 uppercase flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[#b4985c]" />
              <span>Tableau Centralisé des Lots de Tri en Coffre</span>
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">
              Poids total cumulé des lots triés: <b>{lots.reduce((sum, l) => sum + l.weight, 0).toFixed(2)} Carats</b>
            </span>
          </div>

          {lots.length === 0 ? (
            <div className="text-center p-12 bg-[#121620] rounded-xl border border-dashed border-gray-800 text-gray-400">
              <Layers className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-sm font-bold">Aucun lot de tri consigné.</p>
              <p className="text-xs text-gray-500 mt-1">
                Naviguez vers la rubrique "Registre des Achats" et cliquez sur "Organiser & Trier en Lots" sur un article brut spécifique.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lots.map((lot) => {
                const parentPurchase = purchases.find(p => p.id === lot.purchaseId);
                const parentArticle = parentPurchase?.articles.find(a => a.id === lot.purchaseArticleId);
                return (
                  <div 
                    key={lot.id} 
                    className="bg-[#121620] border border-[#232f46] rounded-xl p-4.5 space-y-3 hover:border-amber-400/30 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2.5 items-center">
                        {lot.image && (
                          <img 
                            src={lot.image} 
                            alt="Aperçu du lot" 
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 object-cover rounded-lg border border-gray-800 bg-black shrink-0 animate-fadeIn"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-base">{lot.reference}</span>
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] px-2 py-0.5 rounded font-bold">
                              {lot.weight.toFixed(1)} ct
                            </span>
                          </div>
                          <span className="text-xs text-sky-400 font-mono block mt-1">Lot de {lot.gemstoneType}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          id={`btn-edit-globallot-${lot.id}`}
                          onClick={() => {
                            const parentPurchase = purchases.find(p => p.id === lot.purchaseId);
                            const parentArticle = parentPurchase?.articles.find(a => a.id === lot.purchaseArticleId);
                            if (parentPurchase && parentArticle) {
                              setActiveTriageArticle({ purchase: parentPurchase, article: parentArticle });
                              setManagerTab('purchases');
                              handleStartEditLot(lot);
                            } else {
                              alert("Impossible d'identifier l'achat d'origine pour ce lot.");
                            }
                          }}
                          className="p-1 px-1.5 hover:bg-amber-500/10 text-amber-500 rounded text-xs transition-colors"
                          title="Modifier les détails de ce lot en coffre"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          id={`btn-del-globallot-${lot.id}`}
                          onClick={() => onDeleteLot(lot.id)}
                          className="p-1 px-1.5 hover:bg-red-500/10 text-red-400 rounded text-xs transition-colors"
                          title="Supprimer ce lot du coffre"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono border-t border-gray-800/80 pt-3">
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase">Forme/Aspect:</span>
                        <span className="text-gray-300 font-serif italic text-xs">{lot.cutType}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase">Unités Estimées:</span>
                        <span className="text-gray-300 font-extrabold">{lot.quantity ? `${lot.quantity} pcs` : '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase">Plage diamètres:</span>
                        <span className="text-[#eedfa7]">{lot.averageSize || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[9px] uppercase">Qualité aspect :</span>
                        <span className="text-gray-300 truncate block">{[lot.averageColor, lot.averageClarity].filter(Boolean).join(' / ') || '-'}</span>
                      </div>
                    </div>

                    {/* Module 8 : report auto du prix d'achat depuis l'article parent (lecture seule) */}
                    <div className="flex items-center justify-between gap-2 bg-black/20 border border-gray-800/60 rounded-lg px-2.5 py-2 text-[11px] font-mono">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Prix d'achat
                      </span>
                      {parentArticle ? (
                        <span className="text-[#eedfa7]">
                          {parentArticle.caratPrice.toLocaleString('fr-FR')} €/ct
                          <span className="text-gray-500 mx-1">→</span>
                          <b>{(lot.weight * parentArticle.caratPrice).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €</b>
                        </span>
                      ) : (
                        <span className="text-gray-600 italic">Article d'origine introuvable</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleLotHistory(lot.id)}
                      className="w-full flex items-center justify-between text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors py-1"
                    >
                      <span className="flex items-center gap-1"><History className="h-3 w-3" /> Historique des mouvements</span>
                      <span>{expandedHistoryLots.has(lot.id) ? '▾ replier' : '▸ déplier'}</span>
                    </button>
                    {expandedHistoryLots.has(lot.id) && (
                      <MovementHistory entityType="lot" entityId={lot.id} compact />
                    )}

                    {lot.notes && (
                      <p className="text-[11px] text-gray-400 bg-black/40 p-2 rounded.md border border-gray-800/50 italic leading-relaxed">
                        "{lot.notes}"
                      </p>
                    )}

                    <div className="border-t border-gray-800/60 pt-2.5 text-[10px] font-mono text-gray-500 flex justify-between items-center bg-black/10 -mx-4 -mb-4 p-4 rounded-b-xl flex-wrap gap-2">
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase">Achat parent</span>
                        <span className="text-gray-400 font-bold">{parentPurchase?.reference || 'Inconnu'}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-gray-500 uppercase">Coffrage physique :</span>
                        <span className="text-[#b4985c] font-bold">{lot.destination}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
