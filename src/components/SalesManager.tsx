import React, { useState, useEffect } from 'react';
import { Client, Gemstone, SalesInvoice, InvoiceItem, CompanySettings } from '../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Printer, 
  Diamond, 
  Check, 
  ArrowLeft, 
  Calendar, 
  Euro,
  Briefcase,
  ChevronRight,
  Percent,
  User,
  Coins,
  AlertCircle,
  Pen,
  UserPlus,
  X
} from 'lucide-react';

interface SalesManagerProps {
  invoices: SalesInvoice[];
  clients: Client[];
  gemstones: Gemstone[];
  companySettings?: CompanySettings | null;
  onSaveInvoice: (inv: SalesInvoice) => Promise<void> | void;
  onDeleteInvoice: (id: string) => Promise<void> | void;
  onRefreshGemstones: () => Promise<void> | void; // to reload status changes
  onSaveClient: (c: Client) => Promise<void> | void;
}

export default function SalesManager({
  invoices,
  clients,
  gemstones,
  companySettings,
  onSaveInvoice,
  onDeleteInvoice,
  onRefreshGemstones,
  onSaveClient
}: SalesManagerProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'view' | 'edit'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  // Création rapide d'un client sans quitter la facturation (évite l'aller-retour
  // vers l'onglet Tiers & CSV pour un cas d'usage fréquent : nouveau client venu
  // acheter directement)
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientEmail, setQuickClientEmail] = useState('');
  const [quickClientPhone, setQuickClientPhone] = useState('');

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim()) return;
    const newClient: Client = {
      id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: quickClientName.trim(),
      email: quickClientEmail.trim() || undefined,
      phone: quickClientPhone.trim() || undefined,
      dateAdded: new Date().toISOString()
    };
    await onSaveClient(newClient);
    setInvoiceForm(prev => ({ ...prev, clientId: newClient.id }));
    setQuickClientName('');
    setQuickClientEmail('');
    setQuickClientPhone('');
    setIsQuickClientModalOpen(false);
  };

  // Identité du vendeur pour l'impression : uniquement ce qui est renseigné dans les
  // Paramètres, jamais de valeur de remplacement inventée sur un document légal
  const sellerAddress = [
    companySettings?.address,
    [companySettings?.postalCode, companySettings?.city].filter(Boolean).join(' '),
    companySettings?.country
  ].filter(Boolean).join(', ');
  const sellerContact = [
    companySettings?.phone ? `Tél : ${companySettings.phone}` : '',
    companySettings?.email
  ].filter(Boolean).join(' · ');
  const sellerLegalIds = [
    companySettings?.siret ? `SIRET : ${companySettings.siret}` : '',
    companySettings?.vatNumber ? `TVA : ${companySettings.vatNumber}` : ''
  ].filter(Boolean).join(' · ');
  const sellerFooterLine = [companySettings?.name, sellerLegalIds].filter(Boolean).join(' · ');

  // Available (Disponible) gemstones for invoicing
  const availableGemstones = gemstones.filter(g => g.status === 'Disponible');

  // New Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState<{
    invoiceNumber: string;
    clientId: string;
    date: string;
    dueDate: string;
    status: 'Brouillon' | 'Payée' | 'En attente' | 'Annulée';
    paymentMethod: 'Virement' | 'Carte' | 'Espèces' | 'Autre';
    discount: number;
    notes: string;
    items: InvoiceItem[];
  }>({
    invoiceNumber: '',
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'En attente',
    paymentMethod: 'Virement',
    discount: 0,
    notes: 'Conditions de règlement : paiement net sous 30 jours par virement bancaire.',
    items: []
  });

  // New Line item temporary state
  const [lineItemTemp, setLineItemTemp] = useState<{
    gemstoneId: string;
    description: string;
    weight: string;
    quantity: number;
    unitPrice: string;
    vatRate: number;
  }>({
    gemstoneId: '',
    description: '',
    weight: '',
    quantity: 1,
    unitPrice: '',
    vatRate: 20
  });

  // Suggest/auto-generate invoice number
  useEffect(() => {
    if (viewMode === 'create') {
      const year = new Date().getFullYear();
      const count = invoices.length + 1;
      const suggestedNum = `FAC-${year}-${count.toString().padStart(3, '0')}`;
      
      setInvoiceForm({
        invoiceNumber: suggestedNum,
        clientId: clients[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'En attente',
        paymentMethod: 'Virement',
        discount: 0,
        notes: '',
        items: []
      });
    }
  }, [viewMode, invoices, clients]);

  // When a gemstone is selected in the line item builder
  const handleGemstoneSelectionChange = (gemId: string) => {
    if (!gemId) {
      setLineItemTemp(prev => ({
        ...prev,
        gemstoneId: '',
        description: '',
        weight: '',
        unitPrice: ''
      }));
      return;
    }

    const gem = availableGemstones.find(g => g.id === gemId);
    if (gem) {
      setLineItemTemp(prev => ({
        ...prev,
        gemstoneId: gem.id,
        description: `${gem.type} (${gem.cut}) - Réf: ${gem.reference} - ${gem.color} / ${gem.clarity}`,
        weight: gem.weight.toString(),
        unitPrice: gem.sellingPrice ? gem.sellingPrice.toString() : ''
      }));
    }
  };

  // Add line item to form listing
  const handleAddLineItem = () => {
    if (!lineItemTemp.description || !lineItemTemp.unitPrice) return;

    const price = parseFloat(lineItemTemp.unitPrice) || 0;
    const qty = lineItemTemp.quantity || 1;
    const weightVal = parseFloat(lineItemTemp.weight) || undefined;

    const newItem: InvoiceItem = {
      id: `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      gemstoneId: lineItemTemp.gemstoneId || undefined,
      description: lineItemTemp.description,
      weight: weightVal,
      quantity: qty,
      unitPrice: price,
      vatRate: lineItemTemp.vatRate,
      totalAmount: price * qty
    };

    setInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset temporary inputs
    setLineItemTemp({
      gemstoneId: '',
      description: '',
      weight: '',
      quantity: 1,
      unitPrice: '',
      vatRate: 20
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Math totals
  const formatCurrency = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const calculateFormTotals = () => {
    const rawTotalExclTax = invoiceForm.items.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalExclTax = Math.max(0, rawTotalExclTax - invoiceForm.discount);
    
    // Calculates aggregated VAT based on item rate
    const vatAmount = invoiceForm.items.reduce((sum, item) => {
      // ratio discount modifier if rawTotal > 0
      const discountRatio = rawTotalExclTax > 0 ? (1 - invoiceForm.discount / rawTotalExclTax) : 1;
      const itemExcl = item.totalAmount * Math.max(0, discountRatio);
      return sum + (itemExcl * (item.vatRate / 100));
    }, 0);

    const totalInclTax = totalExclTax + vatAmount;

    return {
      rawTotalExclTax,
      totalExclTax,
      vatAmount,
      totalInclTax
    };
  };

  const totals = calculateFormTotals();

  // Save the invoice draft
  const handleSaveInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.invoiceNumber || !invoiceForm.clientId || invoiceForm.items.length === 0) return;

    const selectedClient = clients.find(c => c.id === invoiceForm.clientId);
    const clientName = selectedClient ? selectedClient.name : 'Client Supprimé/Inconnu';

    const draftInvoice: SalesInvoice = {
      id: viewMode === 'edit' && selectedInvoice ? selectedInvoice.id : `INV-${Date.now()}`,
      invoiceNumber: invoiceForm.invoiceNumber,
      clientId: invoiceForm.clientId,
      clientName: clientName,
      date: invoiceForm.date,
      dueDate: invoiceForm.dueDate,
      items: invoiceForm.items,
      discount: Number(invoiceForm.discount) || 0,
      totalExclTax: totals.totalExclTax,
      vatAmount: totals.vatAmount,
      totalInclTax: totals.totalInclTax,
      status: invoiceForm.status,
      paymentMethod: invoiceForm.paymentMethod,
      notes: invoiceForm.notes
    };

    await onSaveInvoice(draftInvoice);
    await onRefreshGemstones(); // reload gemstone statuses
    setViewMode('list');
  };

  // View an invoice
  const handleSelectInvoice = (inv: SalesInvoice) => {
    setSelectedInvoice(inv);
    setViewMode('view');
  };

  // Edit an invoice
  const handleSelectInvoiceForEdit = (inv: SalesInvoice) => {
    setSelectedInvoice(inv);
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId,
      date: inv.date,
      dueDate: inv.dueDate,
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      discount: inv.discount,
      notes: inv.notes || '',
      items: inv.items
    });
    setViewMode('edit');
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter(inv => {
    const q = searchTerm.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      inv.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION (hidden during print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#101421] border border-[#1f283d] rounded-2xl p-5 shadow-sm no-print">
        <div>
          <div className="flex items-center gap-2 text-[#e0b760] font-mono text-[10px] tracking-widest uppercase">
            <FileText className="h-4 w-4" />
            <span>Facturation Commerciale & Sortie de Stock</span>
          </div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white mt-1">
            Facturation de Vente
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Émettez vos factures de vente et déduisez automatiquement les pierres vendues du stock d'inventaire.
          </p>
        </div>

        {viewMode === 'list' ? (
          <button
            onClick={() => setViewMode('create')}
            id="btn-open-create-invoice"
            className="w-full md:w-auto px-4 py-2 text-xs font-semibold bg-gradient-to-r from-[#8a733e] to-[#bda165] hover:opacity-90 text-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Créer une Facture</span>
          </button>
        ) : (
          <button
            onClick={() => { setViewMode('list'); setSelectedInvoice(null); }}
            className="w-full md:w-auto px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 hover:text-white rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour à la liste</span>
          </button>
        )}
      </div>

      {/* VIEW 1: LISTING */}
      {viewMode === 'list' && (
        <div className="space-y-4 no-print">
          
          {/* Filtering bar */}
          <div className="flex items-center justify-between gap-4 bg-[#101421]/60 border border-[#1d2739]/80 rounded-xl p-3 min-w-0">
            <div className="text-xs font-semibold text-gray-300 px-2 font-mono">
              JOURNAL DES VENTES COMPTABLE
            </div>

            <div className="relative w-full max-w-xs shrink-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher une facture ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#0a0d15] border border-[#1f293d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#bda165]"
              />
            </div>
          </div>

          {/* Table list */}
          <div className="bg-[#101421]/60 border border-[#1a2336] rounded-xl overflow-hidden shadow-xl text-xs">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-semibold text-sm">Aucune facture émise</p>
                <p className="text-gray-500 text-xs mt-1">Créez votre première facture en cliquant sur "Créer une Facture".</p>

              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0b0e17] border-b border-[#1c273a] text-gray-400 font-mono text-[9px] uppercase tracking-wider">
                      <th className="py-3 px-4">Numéro</th>
                      <th className="py-3 px-4">Date Émission</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Mode Pct.</th>
                      <th className="py-3 px-4">Montant HT</th>
                      <th className="py-3 px-4">TTC Final</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182235]">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#151d2e]/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <button 
                            onClick={() => handleSelectInvoice(inv)}
                            className="text-left text-[#bda165] hover:underline cursor-pointer"
                          >
                            {inv.invoiceNumber}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400">
                          {inv.date}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-200">
                          {inv.clientName}
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[10px]">
                          {inv.paymentMethod}
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 font-mono">
                          {formatCurrency(inv.totalExclTax)} €
                        </td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold font-mono text-sm">
                          {formatCurrency(inv.totalInclTax)} €
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                            inv.status === 'Payée' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' :
                            inv.status === 'En attente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/15' :
                            inv.status === 'Annulée' ? 'bg-red-500/10 text-red-500 border-red-500/15' :
                            'bg-gray-500/10 text-gray-300 border-gray-500/15'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleSelectInvoice(inv)}
                              title="Consulter / Imprimer"
                              className="p-1 px-1.5 bg-[#171e2c] border border-gray-800 rounded text-[#e0b760] hover:bg-amber-400/5 hover:border-amber-400/35 transition-all cursor-pointer animate-none"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleSelectInvoiceForEdit(inv)}
                              title="Éditer"
                              className="p-1 px-1.5 bg-[#171e2c] border border-gray-800 rounded text-blue-400 hover:bg-blue-400/5 hover:border-blue-400/35 transition-all cursor-pointer"
                            >
                              <Pen className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteInvoice(inv.id)}
                              title="Supprimer"
                              className="p-1 px-1.5 bg-[#1c1218] border border-red-500/10 rounded text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CREATE/EDIT INVOICE */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <form onSubmit={handleSaveInvoiceSubmit} className="space-y-6 text-xs no-print">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Primary Details Box */}
            <div className="lg:col-span-2 space-y-4 bg-[#101421]/60 border border-[#1a2336] rounded-xl p-5 shadow-xl">
              <div className="text-xs font-bold text-white border-b border-gray-800 pb-2 mb-3 font-sans flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#e0b760]" />
                <span>Renseignements de l'en-tête de facturation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">NUMÉRO DE FACTURE *</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})}
                    className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-[#e0b760] font-mono font-bold rounded-lg focus:outline-none"
                    placeholder="FAC-2026-001"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">CLIENT BÉNÉFICIAIRE *</label>
                  <div className="flex items-center gap-2">
                    <select
                      required
                      value={invoiceForm.clientId}
                      onChange={(e) => setInvoiceForm({...invoiceForm, clientId: e.target.value})}
                      className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                    >
                      <option value="">-- Sélectionner un client --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      id="quick-new-client-button"
                      onClick={() => setIsQuickClientModalOpen(true)}
                      title="Nouveau client"
                      className="shrink-0 px-3 py-2 bg-[#171e2c] hover:bg-[#1f283d] border border-[#27354d] text-[#bda165] rounded-lg transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">DATE DE FACTURATIOM</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm({...invoiceForm, date: e.target.value})}
                    className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">ÉCHÉANCE DE PAIEMENT</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                    className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">MÉTHODE DE PAIEMENT</label>
                  <select
                    value={invoiceForm.paymentMethod}
                    onChange={(e) => setInvoiceForm({...invoiceForm, paymentMethod: e.target.value as any})}
                    className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                  >
                    <option value="Virement">Virement direct</option>
                    <option value="Card">Carte bancaire</option>
                    <option value="Espèces">Espèces (Guichet)</option>
                    <option value="Autre">Autre modalité / Chèque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">STATUT COMPTABLE INITIAL</label>
                  <select
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm({...invoiceForm, status: e.target.value as any})}
                    className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                  >
                    <option value="En attente">En attente (Non payé)</option>
                    <option value="Payée">Payée (Trésorerie encaissée)</option>
                    <option value="Brouillon">Brouillon (Devis en cours)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Gemstone & Item line-builder */}
              <div className="border-t border-gray-800 pt-4 space-y-3">
                <div className="flex justify-between items-center bg-[#171d2b] p-3 rounded-lg border border-[#212a3d]">
                  <div className="text-xs font-bold text-[#e0b760] font-sans flex items-center gap-1.5">
                    <Coins className="h-4 w-4" />
                    <span>Calculateur de ligne d'articles et de pierres</span>
                  </div>
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 font-mono px-2 py-0.5 rounded border border-sky-500/25">
                    {availableGemstones.length} pierres disponibles en stock
                  </span>
                </div>

                {/* Subform to pick gemstone or enter manual item */}
                <div className="bg-[#0b0e17] p-3.5 rounded-lg border border-gray-800 space-y-3">
                  
                  {/* Pick available gemstone dropdown */}
                  <div>
                    <label className="block text-gray-500 text-[9px] font-mono uppercase mb-1">LIER ET CONSOMMER UNE PIERRE DE L'INVENTAIRE :</label>
                    <select
                      value={lineItemTemp.gemstoneId}
                      onChange={(e) => handleGemstoneSelectionChange(e.target.value)}
                      className="w-full px-2 py-1.5 bg-[#171e2c] border border-gray-800 rounded font-bold text-[#bda165] focus:outline-none"
                    >
                      <option value="">-- Aucune pierre liée (saisir l'article manuellement ci-dessous) --</option>
                      {availableGemstones.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.reference} · {g.type} · {g.weight} cts · {g.origin} · {g.sellingPrice ? `${g.sellingPrice} €` : 'Prix libre'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-gray-500 text-[9px] font-mono uppercase mb-1">DESCRIPTION DÉTAILLÉE DE L'ARTICLE *</label>
                      <input
                        type="text"
                        value={lineItemTemp.description}
                        onChange={(e) => setLineItemTemp({...lineItemTemp, description: e.target.value})}
                        placeholder="ex: Rubis Birman certifié ovale"
                        className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-gray-800 rounded text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-500 text-[9px] font-mono uppercase mb-1">POIDS (CTS)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={lineItemTemp.weight}
                        onChange={(e) => setLineItemTemp({...lineItemTemp, weight: e.target.value})}
                        placeholder="2.5"
                        className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-gray-800 rounded text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-500 text-[9px] font-mono uppercase mb-1">QUANTITÉ</label>
                      <input
                        type="number"
                        min="1"
                        value={lineItemTemp.quantity}
                        onChange={(e) => setLineItemTemp({...lineItemTemp, quantity: parseInt(e.target.value) || 1})}
                        className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-gray-800 rounded text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-gray-500 text-[9px] font-mono uppercase mb-1">PRIX UNITAIRE HT (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={lineItemTemp.unitPrice}
                        onChange={(e) => setLineItemTemp({...lineItemTemp, unitPrice: e.target.value})}
                        placeholder="3500.00"
                        className="w-full px-2.5 py-1.5 bg-[#171e2c] border border-gray-800 rounded text-[#e0b760] font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-500 text-[9px] font-mono uppercase mb-1">TAUX TVA INTÉGRÉ (%)</label>
                      <select
                        value={lineItemTemp.vatRate}
                        onChange={(e) => setLineItemTemp({...lineItemTemp, vatRate: parseInt(e.target.value) || 20})}
                        className="w-full px-2 py-1.5 bg-[#171e2c] border border-gray-800 rounded text-gray-300 font-mono"
                      >
                        <option value="20">20% (Standard France/UE)</option>
                        <option value="0">0% (Exportation / Article 262-I CGI)</option>
                        <option value="5.5">5.5% (Taux réduit)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddLineItem}
                        disabled={!lineItemTemp.description || !lineItemTemp.unitPrice}
                        className={`w-full py-1.5 text-xs font-semibold rounded shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${lineItemTemp.description && lineItemTemp.unitPrice ? 'bg-[#1e2739] hover:bg-[#28354c] text-[#e0b760] border border-yellow-500/20' : 'bg-gray-800/40 text-gray-600 border border-transparent cursor-not-allowed'}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Ajouter cet article</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Items in form table listing */}
                <div className="border border-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px] text-gray-300">
                    <thead className="bg-[#0b0e17]">
                      <tr className="border-b border-gray-800 text-gray-500 font-mono text-[8px] uppercase">
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Poids (Ct)</th>
                        <th className="py-2 px-3 text-center">Quantité</th>
                        <th className="py-2 px-3 text-right">PU HT</th>
                        <th className="py-2 px-3 text-right">TVA</th>
                        <th className="py-2 px-3 text-right">Total HT</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                      {invoiceForm.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-gray-600 font-mono">
                            Aucun article répertorié dans ce manuscrit commercial.
                          </td>
                        </tr>
                      ) : (
                        invoiceForm.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-900/40">
                            <td className="py-2 px-3 font-semibold text-white">
                              {item.description}
                              {item.gemstoneId && (
                                <span className="bg-[#bda165]/10 text-[#bda165] font-mono text-[8px] px-1.5 py-0.5 rounded ml-2 border border-[#bda165]/25">
                                  Lien Stock
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-gray-400">
                              {item.weight ? `${item.weight} cts` : '—'}
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              {item.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {formatCurrency(item.unitPrice)} €
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-400">
                              {item.vatRate}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-white font-semibold">
                              {formatCurrency(item.totalAmount)} €
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(index)}
                                className="text-red-400 hover:text-red-300 p-0.5"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

            {/* Calculations and notes panel */}
            <div className="space-y-4">
              
              {/* Financial Box */}
              <div className="bg-[#101421]/60 border border-[#1a2336] rounded-xl p-5 shadow-xl space-y-4 text-xs font-sans">
                <div className="text-xs font-bold text-white border-b border-gray-800 pb-2 font-sans flex items-center gap-1.5">
                  <Coins className="h-4.5 w-4.5 text-[#e0b760]" />
                  <span>Synthèse Financière</span>
                </div>

                <div className="space-y-3 font-mono">
                  {/* Totals Excl */}
                  <div className="flex justify-between text-gray-400">
                    <span>Total Brut HT :</span>
                    <span className="text-white font-semibold">{formatCurrency(totals.rawTotalExclTax)} €</span>
                  </div>

                  {/* flat discount entry */}
                  <div className="space-y-1 bg-gray-900/30 p-2.5 rounded border border-gray-800">
                    <label className="block text-[10px] text-gray-500 font-sans font-bold">REMISE EXCEPTIONNELLE (€ HT)</label>
                    <div className="relative">
                      <Euro className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="number"
                        min="0"
                        value={invoiceForm.discount || ''}
                        onChange={(e) => setInvoiceForm({...invoiceForm, discount: parseFloat(e.target.value) || 0})}
                        className="w-full pl-7 pr-2 py-1 bg-[#121620] border border-gray-800 text-amber-500 rounded text-xs focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-gray-300">
                    <span>Remise commerciale :</span>
                    <span className="text-red-400 font-semibold">-{formatCurrency(invoiceForm.discount)} €</span>
                  </div>

                  <div className="flex justify-between text-gray-300 border-t border-gray-800 pt-2 networks-label">
                    <span>Total Net HT :</span>
                    <span className="text-white font-bold">{formatCurrency(totals.totalExclTax)} €</span>
                  </div>

                  {/* vat agg */}
                  <div className="flex justify-between text-gray-400 text-[11px]">
                    <span>Montant total TVA estimé :</span>
                    <span>{formatCurrency(totals.vatAmount)} €</span>
                  </div>

                  {/* net total incl */}
                  <div className="flex justify-between items-center bg-[#bda165]/10 border border-[#bda165]/15 p-3 rounded-lg text-[#e0b760] font-sans">
                    <span className="text-xs font-bold">NET À PAYER TTC :</span>
                    <div className="text-right font-mono">
                      <span className="text-lg font-bold block">{formatCurrency(totals.totalInclTax)} €</span>
                      <span className="text-[8px] text-gray-400 block tracking-normal uppercase">Toutes taxes comprises</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoicing notes */}
              <div className="bg-[#101421]/60 border border-[#1a2336] rounded-xl p-5 shadow-xl space-y-3">
                <label className="block text-gray-400 text-[10px] font-mono uppercase">CONDITIONS DE RÈGLEMENT & NOTES</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                  className="w-full px-3 py-2 bg-[#171e2c] text-xs border border-[#27354d] text-gray-300 rounded-lg focus:outline-none h-24 resize-none"
                  placeholder="Conditions de paiement, RIB requis, etc."
                />
              </div>

              {/* Submitions */}
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={invoiceForm.items.length === 0}
                  className={`w-full py-2.5 font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer ${invoiceForm.items.length > 0 ? 'bg-gradient-to-r from-[#8a733e] to-[#bda165] hover:opacity-90 text-black shadow-lg shadow-yellow-500/5' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                  <Check className="h-4 w-4" />
                  <span>Enregistrer & Finaliser la facture</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="w-full py-2 bg-transparent text-gray-400 hover:text-white border border-[#232f45] hover:bg-gray-900/30 rounded-lg text-center font-medium cursor-pointer"
                >
                  Abandonner la saisie
                </button>
              </div>

            </div>

          </div>

        </form>
      )}

      {/* VIEW 3: INVOICE VIS COMPLIANT PRINT/PREVIEW */}
      {viewMode === 'view' && selectedInvoice && (
        <div className="space-y-6">
          
          {/* Action header panel (hidden during print) */}
          <div className="flex justify-between items-center bg-[#101421]/60 border border-gray-800 p-4 rounded-xl no-print">
            <button
              onClick={() => { setViewMode('list'); setSelectedInvoice(null); }}
              className="px-3.5 py-1.5 text-xs bg-[#171e2c] border border-gray-800 text-gray-300 hover:text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour au journal</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectInvoiceForEdit(selectedInvoice)}
                className="px-3.5 py-1.5 text-xs bg-[#171e2c] border border-[blue]/20 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/40 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Pen className="h-4 w-4" />
                <span>Éditer la facture</span>
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-xs font-semibold bg-[#bda165] text-black hover:bg-[#a98f56] rounded-lg flex items-center gap-2 cursor-pointer shadow"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimer (ou PDF)</span>
              </button>
            </div>
          </div>

          {/* Compliant VAT Printable Invoice Structure */}
          <div className="bg-white text-gray-900 border border-gray-300 rounded-2xl p-8 sm:p-12 shadow-2xl relative max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 font-sans">
            
            {/* Watermark branding header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-300 pb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">

                  <h1 className="text-2xl font-black tracking-wider uppercase font-sans">
                    {companySettings?.name || "Société non renseignée"}
                  </h1>
                </div>
                <div className="text-xs text-stone-500 font-sans space-y-0.5">
                  {sellerAddress && <p>{sellerAddress}</p>}
                  {sellerContact && <p>{sellerContact}</p>}
                  {sellerLegalIds && <p>{sellerLegalIds}</p>}
                  {!companySettings?.name && (
                    <p className="text-amber-600 no-print">Renseignez votre société dans Paramètres pour compléter cet en-tête.</p>
                  )}
                </div>
              </div>

              <div className="text-right sm:text-right w-full sm:w-auto">
                <span className="inline-block bg-gray-100 text-gray-900 border border-gray-300 font-mono text-[9px] px-3 py-1 font-bold rounded mb-4 uppercase tracking-wider print:bg-transparent print:border-black">
                  FACTURE
                </span>
                <div className="text-stone-500 text-xs font-sans">
                  <p>Numéro Facture : <span className="font-mono font-bold text-stone-900 text-sm block">{selectedInvoice.invoiceNumber}</span></p>
                  <p className="mt-1">Date d'édition : <span className="font-bold text-stone-900">{selectedInvoice.date}</span></p>
                  <p>Date d'échéance : <span className="font-bold text-stone-900">{selectedInvoice.dueDate}</span></p>
                </div>
              </div>
            </div>

            {/* Billed To block */}
            <div className="py-8 text-xs font-sans border-b border-stone-200">
              <div className="bg-stone-50 p-4 border border-stone-200 rounded-xl relative w-full sm:w-1/2">
                <span className="block font-mono text-[9px] uppercase tracking-wider text-[#8a733e] font-extrabold mb-1.5">FACTURÉ À</span>
                {clients.find(c => c.id === selectedInvoice.clientId) ? (
                  (() => {
                    const c = clients.find(c => c.id === selectedInvoice.clientId)!;
                    return (
                      <div className="text-stone-900 space-y-1">
                        <p className="font-bold text-stone-900 text-sm">{c.name}</p>
                        {c.contactName && <p className="text-stone-600">À l'attention de : {c.contactName}</p>}
                        {c.address && <p className="text-stone-600">{c.address}</p>}
                        <p className="text-stone-600">{[c.postalCode, c.city, c.country].filter(Boolean).join(', ')}</p>
                        {c.phone && <p className="text-stone-500">Tél: {c.phone}</p>}
                        {c.vatNumber && <p className="text-stone-500 font-mono text-[10px] mt-1.5 border-t border-stone-200 pt-1">Haut. TVA : {c.vatNumber}</p>}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-stone-900">
                    <p className="font-bold text-sm text-amber-600">{selectedInvoice.clientName}</p>
                    <p className="text-stone-500 mt-1">Les coordonnées du client ont été modifiées ou purgées de l'annuaire.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Invoiced items grid list */}
            <div className="py-8">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-800 bg-stone-100 text-stone-700 font-bold font-sans">
                    <th className="py-2.5 px-3">Description du service ou de l'unité lapidaire</th>
                    <th className="py-2.5 px-3">Poids (Ct)</th>
                    <th className="py-2.5 px-3 text-center">Quantité</th>
                    <th className="py-2.5 px-3 text-right">PU HT</th>
                    <th className="py-2.5 px-3 text-right">TVA</th>
                    <th className="py-2.5 px-3 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {selectedInvoice.items.map((item, index) => (
                    <tr key={index} className="text-stone-800">
                      <td className="py-3 px-3">
                        <span className="font-bold block text-stone-900">{item.description}</span>
                        {item.gemstoneId && <span className="text-[9px] font-mono text-[#8a733e] block">Consommation de l'inventaire clinique - ID-Ref: {item.gemstoneId}</span>}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium">{item.weight ? `${item.weight} ct` : '—'}</td>
                      <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(item.unitPrice)} €</td>
                      <td className="py-3 px-3 text-right font-mono text-stone-500">{item.vatRate}%</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-950">{formatCurrency(item.totalAmount)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pricing calculations details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 text-xs pt-8 border-t border-stone-200">
              <div className="space-y-4">
                <div>
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-stone-500 font-bold">MODE DE PAIEMENT</span>
                  <span className="font-bold text-stone-900 capitalize block mt-1">{selectedInvoice.paymentMethod}</span>
                </div>
                
                {selectedInvoice.notes && (
                  <div>
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-stone-500 font-bold">OBSERVATIONS & MENTIONS LÉGALES</span>
                    <p className="text-stone-500 mt-1 leading-relaxed leading-tight text-[11px] whitespace-pre-wrap">{selectedInvoice.notes ?? ""}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end">
                <div className="w-full max-w-sm space-y-2.5 font-mono">
                  
                  <div className="flex justify-between text-stone-500 text-[11px]">
                    <span>Total Brut HT :</span>
                    <span>{formatCurrency(selectedInvoice.totalExclTax + selectedInvoice.discount)} €</span>
                  </div>

                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-stone-500 text-[11px]">
                      <span>Remise accordée :</span>
                      <span className="text-red-600 font-bold">-{formatCurrency(selectedInvoice.discount)} €</span>
                    </div>
                  )}

                  <div className="flex justify-between text-stone-900 font-bold border-t border-stone-200 pt-2 text-xs">
                    <span>Net Hors Taxe (HT) :</span>
                    <span>{formatCurrency(selectedInvoice.totalExclTax)} €</span>
                  </div>

                  <div className="flex justify-between text-stone-500 text-[11px]">
                    <span>TVA collectée :</span>
                    <span>{formatCurrency(selectedInvoice.vatAmount)} €</span>
                  </div>

                  <div className="flex justify-between items-center bg-gray-100 print:bg-transparent print:border-black text-gray-900 p-3.5 rounded-lg border border-gray-300 text-sans">
                    <span className="text-xs font-bold leading-none font-sans">NET À PAYER TTC :</span>
                    <span className="text-lg font-black font-mono leading-none">{formatCurrency(selectedInvoice.totalInclTax)} €</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Pied de page : mentions légales de paiement et identité du vendeur */}
            <div className="mt-16 pt-6 border-t border-stone-200 space-y-1.5 text-[9px] text-stone-500 leading-relaxed font-sans">
              <p>
                Pénalités de retard : trois fois le taux d'intérêt légal, exigibles sans rappel. Indemnité forfaitaire
                pour frais de recouvrement en cas de retard de paiement : 40 €. Escompte pour paiement anticipé : néant.
              </p>
              {sellerFooterLine && (
                <p className="font-mono uppercase tracking-wider text-stone-400">{sellerFooterLine}</p>
              )}
            </div>

          </div>
        </div>
      )}

      {isQuickClientModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleQuickCreateClient}
            className="bg-[#121622] border border-[#232f48] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#bda165]" /> Nouveau client
              </h3>
              <button type="button" onClick={() => setIsQuickClientModalOpen(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-[11px] text-gray-500 -mt-2">
              Création rapide. Les autres coordonnées (adresse, SIRET...) restent modifiables ensuite depuis "Tiers & CSV".
            </p>
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Nom / Raison sociale *</label>
              <input
                id="quick-client-name-input"
                required
                autoFocus
                value={quickClientName}
                onChange={e => setQuickClientName(e.target.value)}
                className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Email</label>
              <input
                type="email"
                value={quickClientEmail}
                onChange={e => setQuickClientEmail(e.target.value)}
                className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Téléphone</label>
              <input
                value={quickClientPhone}
                onChange={e => setQuickClientPhone(e.target.value)}
                className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => setIsQuickClientModalOpen(false)} className="px-4 py-2 bg-[#1b2333] hover:bg-[#202a3c] text-xs font-semibold text-gray-400 hover:text-white rounded-lg border border-gray-800 transition">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-[#bda165] hover:bg-[#cdb47a] text-xs font-bold text-black rounded-lg flex items-center gap-1.5 transition">
                <Check className="h-3.5 w-3.5" /> Créer et sélectionner
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
