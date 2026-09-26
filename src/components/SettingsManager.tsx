import React, { useState, useEffect } from 'react';
import PageHeader, { btnPrimary, btnSecondary } from './PageHeader';
import AiSettingsSection from './AiSettingsSection';
import { CompanySettings, PriceGuideEntry, InvoicingStatus } from '../types';
import { Settings, Save, MapPin, Phone, Mail, Building2, Globe, CheckCircle, Database, Gem, Pencil, Trash2, Plus, X } from 'lucide-react';

const COMMON_VARIETIES = ['Diamant', 'Saphir', 'Rubis', 'Émeraude', 'Tanzanite', 'Spinelle', 'Tourmaline', 'Topaze'];

interface SettingsManagerProps {
  settings: CompanySettings | null;
  onSaveSettings: (settings: CompanySettings) => void;
  priceGuide?: PriceGuideEntry[];
  onSavePriceGuideEntry?: (entry: PriceGuideEntry) => void;
  onDeletePriceGuideEntry?: (id: string) => void;
  invoicingStatus?: InvoicingStatus | null;
  onPurgeTestInvoices?: () => Promise<boolean>;
  onStartLiveInvoicing?: () => Promise<boolean>;
}

export default function SettingsManager({ settings, onSaveSettings, priceGuide = [], onSavePriceGuideEntry, onDeletePriceGuideEntry, invoicingStatus, onPurgeTestInvoices, onStartLiveInvoicing }: SettingsManagerProps) {
  const [isSaved, setIsSaved] = useState(false);
  // Confirmations affichées sur place (pas de fenêtre du navigateur)
  const [pendingAction, setPendingAction] = useState<'purge' | 'live' | null>(null);
  const [form, setForm] = useState<CompanySettings>({
    name: '',
    address: '',
    postalCode: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    vatNumber: '',
    siret: '',
    website: ''
  });

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // --- Éditeur du barème d'estimation ---
  const [tierEditId, setTierEditId] = useState<string | null>(null);
  const [tierGemType, setTierGemType] = useState('');
  const [tierName, setTierName] = useState('');
  const [tierMin, setTierMin] = useState('');
  const [tierMax, setTierMax] = useState('');
  const [tierNotes, setTierNotes] = useState('');
  const [tierError, setTierError] = useState('');

  const resetTierForm = () => {
    setTierEditId(null);
    setTierGemType('');
    setTierName('');
    setTierMin('');
    setTierMax('');
    setTierNotes('');
    setTierError('');
  };

  const handleEditTier = (entry: PriceGuideEntry) => {
    setTierEditId(entry.id);
    setTierGemType(entry.gemstoneType);
    setTierName(entry.tierName);
    setTierMin(entry.minPricePerCarat.toString());
    setTierMax(entry.maxPricePerCarat.toString());
    setTierNotes(entry.notes || '');
    setTierError('');
  };

  const handleSaveTier = () => {
    const min = parseFloat(tierMin) || 0;
    const max = parseFloat(tierMax) || 0;
    if (!tierGemType.trim() || !tierName.trim()) {
      setTierError('La variété et le nom du palier sont requis.');
      return;
    }
    if (min <= 0 || max <= 0) {
      setTierError('Les prix min et max au carat doivent être supérieurs à 0.');
      return;
    }
    if (max < min) {
      setTierError('Le prix max doit être supérieur ou égal au prix min.');
      return;
    }
    onSavePriceGuideEntry?.({
      id: tierEditId || `pg-${Date.now()}`,
      gemstoneType: tierGemType.trim(),
      tierName: tierName.trim(),
      minPricePerCarat: min,
      maxPricePerCarat: max,
      notes: tierNotes.trim() || undefined,
      sortOrder: tierEditId ? (priceGuide.find(e => e.id === tierEditId)?.sortOrder ?? 0) : priceGuide.length
    });
    resetTierForm();
  };

  // Groupement par variété pour l'affichage
  const groupedGuide = priceGuide.reduce<Record<string, PriceGuideEntry[]>>((acc, e) => {
    (acc[e.gemstoneType] = acc[e.gemstoneType] || []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Paramètres de l'entreprise"
        description="Ces informations apparaîtront sur vos factures, devis, certificats et autres documents officiels générés par l'application."
      />
      <div className="bg-[#121620] border border-[#212a3d] rounded-2xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
          {/* General Information */}
          <div className="bg-[#171e2c] border border-[#27354d] rounded-xl p-5 space-y-4">
            <h3 className="text-[#e0b760] font-sans font-bold flex items-center gap-2 mb-2 text-xs uppercase tracking-wider">
              <Building2 className="h-4 w-4" />
              Identité de l'entreprise
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Nom / Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165] font-semibold"
                  placeholder="Ex: Gemophy Joaillerie"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Numéro SIRET / Registre</label>
                <input
                  type="text"
                  value={form.siret}
                  onChange={(e) => setForm({...form, siret: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165] font-mono"
                  placeholder="Ex: 123 456 789 00012"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">TVA Intracommunautaire</label>
                <input
                  type="text"
                  value={form.vatNumber}
                  onChange={(e) => setForm({...form, vatNumber: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165] font-mono"
                  placeholder="Ex: FR32 123456789"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-[#171e2c] border border-[#27354d] rounded-xl p-5 space-y-4">
            <h3 className="text-[#e0b760] font-sans font-bold flex items-center gap-2 mb-2 text-xs uppercase tracking-wider">
              <MapPin className="h-4 w-4" />
              Siège Social & Contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Adresse *</label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => setForm({...form, address: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165]"
                  placeholder="Ex: 12 Rue de la Paix"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Code Postal *</label>
                <input
                  type="text"
                  required
                  value={form.postalCode}
                  onChange={(e) => setForm({...form, postalCode: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165] font-mono"
                  placeholder="Ex: 75002"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Ville *</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm({...form, city: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165]"
                  placeholder="Ex: Paris"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Pays *</label>
                <input
                  type="text"
                  required
                  value={form.country}
                  onChange={(e) => setForm({...form, country: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165]"
                  placeholder="Ex: France"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#212a3d]">
              <div>
                <label className="flex items-center gap-1.5 text-gray-400 text-[10px] font-mono uppercase mb-1">
                  <Phone className="h-3 w-3" /> Téléphone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165] font-mono"
                  placeholder="Ex: +33 1 23 45 67 89"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-gray-400 text-[10px] font-mono uppercase mb-1">
                  <Mail className="h-3 w-3" /> E-mail
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165] font-sans"
                  placeholder="Ex: contact@entreprise.com"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-gray-400 text-[10px] font-mono uppercase mb-1">
                  <Globe className="h-3 w-3" /> Site Internet
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({...form, website: e.target.value})}
                  className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165] text-xs"
                  placeholder="Ex: www.entreprise.com"
                />
              </div>
            </div>
          </div>

          {/* Database Backup Area */}
          <div className="bg-[#171e2c] border border-[#27354d] rounded-xl p-5 space-y-4">
            <h3 className="text-blue-400 font-sans font-bold flex items-center gap-2 mb-2 text-xs uppercase tracking-wider">
              <Database className="h-4 w-4" />
              Sauvegarde de la Base de Données
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Vos données sont stockées dans une base de données locale. Vous pouvez la télécharger à tout moment pour la garder en sécurité sur votre ordinateur.
            </p>
            <div className="flex justify-start">
               <a 
                 href="/api/backup-db"
                 download
                 className="px-4 py-2 bg-[#1e2638] hover:bg-[#27354d] text-white border border-[#3e4a60] rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
               >
                 <Database className="h-4 w-4" />
                 Télécharger la base (gemophy.db)
               </a>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className={`px-6 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isSaved 
                  ? 'bg-green-500 text-white shadow-green-500/20'
                  : 'bg-[#bda165] text-black shadow-[#bda165]/20 hover:bg-[#a98f56]'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Paramètres Enregistrés
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer les Paramètres
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Barème d'estimation par paliers métier */}
      {invoicingStatus && (
      <div className="bg-[#121620] border border-[#212a3d] rounded-2xl p-6 sm:p-8 shadow-xl" id="invoicing-setup-section">
        <h3 className="text-base font-bold text-white mb-1">Mise en service de la facturation</h3>
        {invoicingStatus.live ? (
          <p className="text-xs text-emerald-400 leading-relaxed">
            Facturation réelle démarrée le {new Date(invoicingStatus.liveSince ?? '').toLocaleDateString('fr-FR')}.
            Les factures émises sont définitives : une erreur se corrige par un avoir.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              L'application est en <span className="text-amber-400 font-semibold">mode test</span> : vous pouvez purger toutes les données d'essai
              ({invoicingStatus.testDataCount} éléments actuellement : factures et avoirs, achats, lots, pierres, bijoux, mouvements de stock
              et éléments de test de la Corbeille). Vos clients et fournisseurs, vos paramètres et le stock importé d'Access sont conservés.
              Quand vos coordonnées sont à jour et que vous êtes prêt à facturer pour de vrai, démarrez la facturation réelle : la purge ne sera alors plus possible.
            </p>
            {pendingAction === null && (
              <div className="flex flex-wrap gap-2">
                <button
                  id="btn-purge-test-invoices"
                  type="button"
                  disabled={invoicingStatus.testDataCount === 0}
                  onClick={() => setPendingAction('purge')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Purger les données de test
                </button>
                <button
                  id="btn-start-live-invoicing"
                  type="button"
                  onClick={() => setPendingAction('live')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                >
                  Démarrer la facturation réelle
                </button>
              </div>
            )}
            {pendingAction === 'purge' && (
              <div id="purge-confirm" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-2">
                <p className="text-xs text-red-300 leading-relaxed">
                  Supprimer définitivement les {invoicingStatus.testDataCount} éléments de test (factures et avoirs, achats, lots, pierres, bijoux, mouvements de stock,
                  éléments de test de la Corbeille) ? Cette action est irréversible. Vos clients et fournisseurs, vos paramètres et le stock importé d'Access sont conservés,
                  et la numérotation des factures repart de zéro.
                </p>
                <div className="flex gap-2">
                  <button
                    id="btn-confirm-purge"
                    type="button"
                    onClick={async () => { await onPurgeTestInvoices?.(); setPendingAction(null); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 cursor-pointer"
                  >
                    Oui, tout purger
                  </button>
                  <button type="button" onClick={() => setPendingAction(null)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-300 hover:text-white cursor-pointer">
                    Annuler
                  </button>
                </div>
              </div>
            )}
            {pendingAction === 'live' && (
              <div id="live-confirm" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                <p className="text-xs text-emerald-300 leading-relaxed">
                  Démarrer la facturation réelle ? C'est irréversible : les factures ne pourront plus être purgées.
                  Vérifiez d'abord votre SIRET, votre TVA et vos coordonnées ci-dessus.
                </p>
                <div className="flex gap-2">
                  <button
                    id="btn-confirm-live"
                    type="button"
                    onClick={async () => { await onStartLiveInvoicing?.(); setPendingAction(null); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer"
                  >
                    Oui, démarrer
                  </button>
                  <button type="button" onClick={() => setPendingAction(null)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-300 hover:text-white cursor-pointer">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      <AiSettingsSection />

      <div className="bg-[#121620] border border-[#212a3d] rounded-2xl p-6 sm:p-8 shadow-xl" id="price-guide-section">
        <div className="flex items-center gap-3 mb-6 border-b border-[#212a3d] pb-6">
          <div className="p-3 bg-[#bda165]/10 text-[#bda165] rounded-xl">
            <Gem className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-sans text-white">Barème d'estimation</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-lg">
              Définissez vos paliers de qualité par variété (fourchette €/carat). Dans la fiche d'enregistrement,
              vous choisirez le palier et l'application calculera la fourchette de valeur selon le poids.
              Ces valeurs sont les vôtres : elles reflètent votre connaissance du marché.
            </p>
          </div>
        </div>

        {/* Formulaire ajout / édition de palier */}
        <div className="bg-[#171e2c] border border-[#27354d] rounded-xl p-5 space-y-4 mb-6">
          <h3 className="text-[#e0b760] font-sans font-bold flex items-center gap-2 text-xs uppercase tracking-wider">
            {tierEditId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {tierEditId ? 'Modifier le palier' : 'Nouveau palier'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Variété *</label>
              <input
                id="tier-gemtype-input"
                type="text"
                list="variety-suggestions"
                value={tierGemType}
                onChange={(e) => { setTierGemType(e.target.value); setTierError(''); }}
                placeholder="ex: Saphir"
                className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165]"
              />
              <datalist id="variety-suggestions">
                {COMMON_VARIETIES.map(v => <option key={v} value={v} />)}
              </datalist>
            </div>
            <div className="col-span-2">
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Nom du palier *</label>
              <input
                id="tier-name-input"
                type="text"
                value={tierName}
                onChange={(e) => { setTierName(e.target.value); setTierError(''); }}
                placeholder="ex: Ceylan non chauffé - qualité fine"
                className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg focus:outline-none focus:border-[#bda165]"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Min €/ct *</label>
              <input
                id="tier-min-input"
                type="number"
                step="0.01"
                value={tierMin}
                onChange={(e) => { setTierMin(e.target.value); setTierError(''); }}
                placeholder="800"
                className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg font-mono focus:outline-none focus:border-[#bda165]"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Max €/ct *</label>
              <input
                id="tier-max-input"
                type="number"
                step="0.01"
                value={tierMax}
                onChange={(e) => { setTierMax(e.target.value); setTierError(''); }}
                placeholder="2500"
                className="w-full px-3 py-2 bg-[#121620] border border-[#212a3d] text-white rounded-lg font-mono focus:outline-none focus:border-[#bda165]"
              />
            </div>
            <div className="col-span-2 md:col-span-1 flex gap-2">
              <button
                id="btn-save-tier"
                type="button"
                onClick={handleSaveTier}
                className="flex-1 px-3 py-2 bg-[#bda165] hover:bg-[#cca96e] text-black font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
              >
                {tierEditId ? <CheckCircle className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {tierEditId ? 'Valider' : 'Ajouter'}
              </button>
              {tierEditId && (
                <button
                  type="button"
                  onClick={resetTierForm}
                  title="Annuler la modification"
                  className="px-2 py-2 bg-[#1f283b] hover:bg-[#2b3952] text-gray-400 rounded-lg"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">Notes (optionnel)</label>
            <input
              type="text"
              value={tierNotes}
              onChange={(e) => setTierNotes(e.target.value)}
              placeholder="ex: Base : prix marchands Bangkok 2026, pierres 1-3 ct certifiées"
              className="w-full px-3 py-2 text-xs bg-[#121620] border border-[#212a3d] text-gray-300 rounded-lg focus:outline-none focus:border-[#bda165]"
            />
          </div>
          {tierError && (
            <p className="text-red-400 text-[11px]" id="tier-error">{tierError}</p>
          )}
        </div>

        {/* Liste des paliers groupés par variété */}
        {priceGuide.length === 0 ? (
          <p className="text-xs text-gray-500 italic text-center py-6">
            Aucun palier défini pour le moment. Ajoutez vos premières fourchettes de prix ci-dessus —
            elles seront proposées dans la fiche d'enregistrement des pierres.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedGuide).map(([gemType, entries]) => (
              <div key={gemType}>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#b4985c] mb-2 flex items-center gap-1.5">
                  <Gem className="h-3 w-3" /> {gemType}
                </h4>
                <div className="space-y-1.5">
                  {entries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 bg-[#171e2c] border border-[#27354d] rounded-lg px-3.5 py-2.5">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">{entry.tierName}</span>
                        {entry.notes && <span className="text-[10px] text-gray-500 italic block truncate">{entry.notes}</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold text-[#e0b760]">
                          {entry.minPricePerCarat.toLocaleString('fr-FR')} – {entry.maxPricePerCarat.toLocaleString('fr-FR')} €/ct
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditTier(entry)}
                          title="Modifier"
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#27354d] rounded"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePriceGuideEntry?.(entry.id)}
                          title="Supprimer"
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
