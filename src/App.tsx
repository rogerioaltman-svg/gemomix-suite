/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Gemstone, Purchase, Lot, Supplier, Client, SalesInvoice, CompanySettings, PriceGuideEntry, TrashItem, TrashEntityType, Bijou, InvoicingStatus } from './types';
import { SEED_GEMSTONES, SEED_PURCHASES, SEED_LOTS } from './data';
import Dashboard from './components/Dashboard';
import InventoryManager from './components/InventoryManager';
import IdentificationLab from './components/IdentificationLab';
import CertificateLab from './components/CertificateLab';
import GemologyAiAssistant from './components/GemologyAiAssistant';
import PurchaseManager from './components/PurchaseManager';
import ContactManager from './components/ContactManager';
import SalesManager from './components/SalesManager';
import TrashManager from './components/TrashManager';
import BijouManager from './components/BijouManager';
import Sidebar from './components/Sidebar';
import StockList from './components/StockList';
import { normalizeGemstone } from "./utils/normalizeGemstone";

import {
  Diamond,
  Layers,
  Search,
  Award,
  Cpu,
  FileCheck,
  AlertCircle,
  ShoppingBag,
  Sun,
  Moon,
  Users,
  Receipt,
  Settings,
  Trash2,
  Sparkles
} from 'lucide-react';

import SettingsManager from './components/SettingsManager';

export default function App() {
  const [gemstones, setGemstones] = useState<Gemstone[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [priceGuide, setPriceGuide] = useState<PriceGuideEntry[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [bijoux, setBijoux] = useState<Bijou[]>([]);
  
  const [selectedTab, setSelectedTab] = useState<string>('dashboard');
  const [selectedGem, setSelectedGem] = useState<Gemstone | null>(null);
  // Onglet Inventaire : 'list' = liste du stock, 'form' = fiche pierre (création/édition)
  const [inventoryMode, setInventoryMode] = useState<'list' | 'form'>('list');

  // Le Tableau de bord ouvre directement la saisie d'un achat (consommé par PurchaseManager)
  const [autoOpenPurchase, setAutoOpenPurchase] = useState(false);

  const openGemForm = (gem: Gemstone | null) => {
    setSelectedGem(gem);
    setInventoryMode('form');
    setSelectedTab('inventory');
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'inventory') {
      setSelectedGem(null);
      setInventoryMode('list');
    }
    setSelectedTab(tab);
  };
  const [selectedCertGemRef, setSelectedCertGemRef] = useState<string>(''); // Remplplace l'ancien helper DOM défaillant
  
  // Custom light/dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('gemophy_theme');
    return stored ? stored === 'dark' : true;
  });

  // Persist theme selection
  useEffect(() => {
    localStorage.setItem('gemophy_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Sidebar (menu latéral desktop) : état replié/déplié persistant
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('gemophy_sidebar_collapsed') === 'true';
  });
  useEffect(() => {
    localStorage.setItem('gemophy_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Erreur d'enregistrement remontée par le serveur (affichée en bandeau).
  // Sans cela, un refus du serveur (ex : photo trop lourde) passait inaperçu et
  // l'écran présentait comme enregistré ce qui ne l'était pas.
  const [apiError, setApiError] = useState<string | null>(null);

  const callApi = async (url: string, method: 'POST' | 'DELETE', body?: unknown): Promise<boolean> => {
    try {
      const res = await fetch(url, {
        method,
        ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
      });
      if (res.ok) {
        setApiError(null);
        return true;
      }
      let detail = '';
      try { detail = (await res.json())?.error || ''; } catch { /* corps non JSON */ }
      if (res.status === 413) detail = 'Le fichier ou la photo est trop volumineux.';
      setApiError(`Enregistrement refusé par le serveur${detail ? ` : ${detail}` : ` (erreur ${res.status})`}`);
      return false;
    } catch {
      setApiError("Le serveur est injoignable : les modifications n'ont pas été enregistrées.");
      return false;
    }
  };

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Recharge l'intégralité des données depuis l'API. Réutilisée au démarrage et
  // après une restauration depuis la Corbeille (Module 11), qui peut ré-impacter
  // plusieurs ressources à la fois (ex: restaurer un achat restaure ses lots).
  const loadAllData = async () => {
    try {
      const [gemsRes, purchasesRes, lotsRes, suppliersRes, clientsRes, invoicesRes, companyRes, priceGuideRes, trashRes, bijouxRes] = await Promise.all([
        fetch('/api/gemstones').then(r => r.ok ? r.json() : []),
        fetch('/api/purchases').then(r => r.ok ? r.json() : []),
        fetch('/api/lots').then(r => r.ok ? r.json() : []),
        fetch('/api/suppliers').then(r => r.ok ? r.json() : []),
        fetch('/api/clients').then(r => r.ok ? r.json() : []),
        fetch('/api/sales-invoices').then(r => r.ok ? r.json() : []),
        fetch('/api/company-settings').then(r => r.ok ? r.json() : null),
        fetch('/api/price-guide').then(r => r.ok ? r.json() : []),
        fetch('/api/trash').then(r => r.ok ? r.json() : []),
        fetch('/api/bijoux').then(r => r.ok ? r.json() : [])
      ]);

      if (Array.isArray(gemsRes)) setGemstones(gemsRes.map(normalizeGemstone));
      if (Array.isArray(purchasesRes)) setPurchases(purchasesRes);
      if (Array.isArray(lotsRes)) setLots(lotsRes);
      if (Array.isArray(suppliersRes)) setSuppliers(suppliersRes);
      if (Array.isArray(clientsRes)) setClients(clientsRes);
      if (Array.isArray(invoicesRes)) setInvoices(invoicesRes);
      if (companyRes) setCompanySettings(companyRes);
      if (Array.isArray(priceGuideRes)) setPriceGuide(priceGuideRes);
      if (Array.isArray(trashRes)) setTrash(trashRes);
      if (Array.isArray(bijouxRes)) setBijoux(bijouxRes);
    } catch (err) {
      console.error("Backend failed:", err);
      setGemstones(SEED_GEMSTONES.map(normalizeGemstone));
      setPurchases(SEED_PURCHASES);
      setLots(SEED_LOTS);
    }
  };

  // Load from SQLite database (via API) on startup
  useEffect(() => {
    loadAllData();
  }, []);

  // Module 11 : restauration d'un élément archivé depuis la Corbeille.
  // On recharge l'ensemble des données par simplicité et sûreté : une
  // restauration peut impacter plusieurs ressources liées (ex: un achat et
  // ses lots), inutile de tenter un rafraîchissement partiel fragile.
  const handleOpenTrash = async () => {
    setSelectedTab('trash');
    const items = await fetch('/api/trash').then(r => r.ok ? r.json() : []);
    if (Array.isArray(items)) setTrash(items);
  };

  const handleRestoreTrashItem = async (type: TrashEntityType, id: string) => {
    await callApi(`/api/trash/${type}/${id}/restore`, 'POST');
    await loadAllData();
  };

  // --- Company Settings CRUD handlers ---
  // --- Mise en service de la facturation (purge des tests, démarrage réel) ---
  const [invoicingStatus, setInvoicingStatus] = useState<InvoicingStatus | null>(null);
  const refreshInvoicingStatus = async () => {
    try {
      const res = await fetch('/api/invoicing-status');
      if (res.ok) setInvoicingStatus(await res.json());
    } catch { /* indisponible : la section reste masquée */ }
  };
  useEffect(() => { refreshInvoicingStatus(); }, []);

  const handlePurgeTestInvoices = async (): Promise<boolean> => {
    if (!(await callApi('/api/invoicing/purge-tests', 'POST', {}))) return false;
    const invList = await fetch('/api/sales-invoices').then(r => r.json());
    setInvoices(invList);
    await refreshInvoicingStatus();
    return true;
  };

  const handleStartLiveInvoicing = async (): Promise<boolean> => {
    if (!(await callApi('/api/invoicing/go-live', 'POST', {}))) return false;
    await refreshInvoicingStatus();
    return true;
  };

  const handleSaveCompanySettings = async (settings: CompanySettings) => {
    if (await callApi('/api/company-settings', 'POST', settings)) {
      setCompanySettings(settings);
    }
  };

  // --- Price Guide (barème) CRUD handlers ---
  const handleSavePriceGuideEntry = async (entry: PriceGuideEntry) => {
    if (await callApi('/api/price-guide', 'POST', entry)) {
      const list = await fetch('/api/price-guide').then(r => r.json());
      setPriceGuide(list);
    }
  };

  const handleDeletePriceGuideEntry = async (id: string) => {
    if (await callApi(`/api/price-guide/${id}`, 'DELETE')) {
      const list = await fetch('/api/price-guide').then(r => r.json());
      setPriceGuide(list);
    }
  };

  // --- Module 12 : Bijoux composés CRUD handlers ---
  const handleSaveBijou = async (bijou: Bijou) => {
    if (await callApi('/api/bijoux', 'POST', bijou)) {
      const list = await fetch('/api/bijoux').then(r => r.json());
      setBijoux(list);
    }
  };

  const handleDeleteBijou = (id: string) => {
    setConfirmDialog({
      title: "Supprimer le bijou",
      message: "Ce bijou sera retiré. Vous pourrez le restaurer depuis la Corbeille à tout moment.",
      onConfirm: async () => {
        if (await callApi(`/api/bijoux/${id}`, 'DELETE')) {
          const list = await fetch('/api/bijoux').then(r => r.json());
          setBijoux(list);
        }
        setConfirmDialog(null);
      }
    });
  };

  // Décomposition : action distincte de la suppression, libère les pierres
  // serties (repassent 'Disponible') — recharge bijoux ET pierres.
  const handleDecomposeBijou = async (id: string) => {
    await callApi(`/api/bijoux/${id}/decompose`, 'POST');
    await loadAllData();
  };

  // --- Supplier CRUD handlers ---
  const handleSaveSupplier = async (savedSup: Supplier): Promise<boolean> => {
    if (!(await callApi('/api/suppliers', 'POST', savedSup))) return false;
    const list = await fetch('/api/suppliers').then(r => r.json());
    setSuppliers(list);
    return true;
  };

  const handleDeleteSupplier = (id: string) => {
    setConfirmDialog({
      title: "Purger ce fournisseur",
      message: "Ce fournisseur sera retiré de l'annuaire. Vous pourrez le restaurer depuis la Corbeille à tout moment.",
      onConfirm: async () => {
        if (await callApi(`/api/suppliers/${id}`, 'DELETE')) {
          const list = await fetch('/api/suppliers').then(r => r.json());
          setSuppliers(list);
        }
        setConfirmDialog(null);
      }
    });
  };

  // --- Client CRUD handlers ---
  const handleSaveClient = async (savedCli: Client): Promise<boolean> => {
    if (!(await callApi('/api/clients', 'POST', savedCli))) return false;
    const list = await fetch('/api/clients').then(r => r.json());
    setClients(list);
    return true;
  };

  const handleDeleteClient = (id: string) => {
    setConfirmDialog({
      title: "Purger ce client",
      message: "Ce client sera retiré de l'annuaire. Vous pourrez le restaurer depuis la Corbeille à tout moment.",
      onConfirm: async () => {
        if (await callApi(`/api/clients/${id}`, 'DELETE')) {
          const list = await fetch('/api/clients').then(r => r.json());
          setClients(list);
        }
        setConfirmDialog(null);
      }
    });
  };

  // --- Sales Invoice CRUD handlers ---
  const handleSaveInvoice = async (savedInv: SalesInvoice): Promise<boolean> => {
    if (await callApi('/api/sales-invoices', 'POST', savedInv)) {
      const [invList, gemList] = await Promise.all([
        fetch('/api/sales-invoices').then(r => r.json()),
        fetch('/api/gemstones').then(r => r.json())
      ]);
      setInvoices(invList);
      setGemstones(Array.isArray(gemList) ? gemList.map(normalizeGemstone) : []);
      return true;
    }
    return false;
  };

  // Avoir total sur une facture émise ; restock : remet les pierres en stock
  const handleCreateCreditNote = async (invoiceId: string, restock: boolean): Promise<boolean> => {
    if (!(await callApi(`/api/sales-invoices/${invoiceId}/credit-note`, 'POST', { restock }))) return false;
    const [invList, gemList] = await Promise.all([
      fetch('/api/sales-invoices').then(r => r.json()),
      fetch('/api/gemstones').then(r => r.json())
    ]);
    setInvoices(invList);
    setGemstones(Array.isArray(gemList) ? gemList.map(normalizeGemstone) : []);
    return true;
  };

  const handleDeleteInvoice = (id: string) => {
    setConfirmDialog({
      title: "Purger cette facture",
      message: "Cette facture sera retirée du registre. Vous pourrez la restaurer depuis la Corbeille à tout moment.",
      onConfirm: async () => {
        if (await callApi(`/api/sales-invoices/${id}`, 'DELETE')) {
          const list = await fetch('/api/sales-invoices').then(r => r.json());
          setInvoices(list);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleRefreshGemstones = async () => {
    try {
      const gemList = await fetch('/api/gemstones').then(r => r.ok ? r.json() : []);
      setGemstones(Array.isArray(gemList) ? gemList.map(normalizeGemstone) : []);
    } catch {
      // no-op
    }
  };

  // Add / Edit stone handler : on ne quitte la fiche que si le serveur a bien enregistré
  const handleSaveGemstone = async (savedGem: Gemstone) => {
    const normalized = normalizeGemstone(savedGem);
    if (!(await callApi('/api/gemstones', 'POST', normalized))) return;

    const exists = gemstones.some(g => g.id === normalized.id);
    setGemstones(exists
      ? gemstones.map(g => g.id === normalized.id ? normalized : g)
      : [normalized, ...gemstones]);
    setSelectedGem(null);
    setInventoryMode('list');
    setSelectedTab('inventory');
  };

  // Inline update for specific nested operations (e.g. recuttings)
  const handleUpdateGemstoneInline = async (updatedGem: Gemstone) => {
    const normalized = normalizeGemstone(updatedGem);
    if (!(await callApi('/api/gemstones', 'POST', normalized))) return;

    setGemstones(gemstones.map(g => g.id === normalized.id ? normalized : g));
    setSelectedGem(normalized);
  };

  // Delete stone handler
  const handleDeleteGemstone = (id: string) => {
    const gem = gemstones.find(g => g.id === id);
    if (!gem) return;
    setConfirmDialog({
      title: "Supprimer la pierre précieuse",
      message: `La pierre ${gem.reference} sera retirée de l'inventaire. Vous pourrez la restaurer depuis la Corbeille à tout moment.`,
      onConfirm: async () => {
        if (await callApi(`/api/gemstones/${id}`, 'DELETE')) {
          setGemstones(gemstones.filter(g => g.id !== id));
          if (selectedGem?.id === id) {
            setSelectedGem(null);
            setInventoryMode('list');
            setSelectedTab('inventory');
          }
        }
        setConfirmDialog(null);
      }
    });
  };

  // Purchases management handlers : retournent true si le serveur a enregistré,
  // pour que le formulaire ne vide pas la saisie en cas d'échec
  const handleSavePurchase = async (savedPur: Purchase): Promise<boolean> => {
    if (!(await callApi('/api/purchases', 'POST', savedPur))) return false;
    // Recharge achats ET pierres : les articles "entrée directe en stock"
    // créent des fiches pierres côté serveur
    const [pList, gList] = await Promise.all([
      fetch('/api/purchases').then(r => r.json()),
      fetch('/api/gemstones').then(r => r.json())
    ]);
    setPurchases(pList);
    setGemstones(Array.isArray(gList) ? gList.map(normalizeGemstone) : []);
    return true;
  };

  const handleDeletePurchase = (id: string) => {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;
    setConfirmDialog({
      title: "Supprimer l'achat",
      message: `L'achat "${purchase.reference}" de ${purchase.supplier} et ses lots de tri associés seront retirés. Vous pourrez tout restaurer depuis la Corbeille.`,
      onConfirm: async () => {
        if (await callApi(`/api/purchases/${id}`, 'DELETE')) {
          setPurchases(purchases.filter(p => p.id !== id));
          setLots(lots.filter(l => l.purchaseId !== id));
        }
        setConfirmDialog(null);
      }
    });
  };

  // Lots de tri handlers
  const handleSaveLot = async (savedLot: Lot): Promise<boolean> => {
    if (!(await callApi('/api/lots', 'POST', savedLot))) return false;
    const exists = lots.some(l => l.id === savedLot.id);
    setLots(exists
      ? lots.map(l => l.id === savedLot.id ? savedLot : l)
      : [savedLot, ...lots]);
    return true;
  };

  const handleDeleteLot = (id: string) => {
    const lot = lots.find(l => l.id === id);
    if (!lot) return;
    setConfirmDialog({
      title: "Supprimer le lot de tri",
      message: `Le lot de tri "${lot.reference}" sera retiré. Vous pourrez le restaurer depuis la Corbeille à tout moment.`,
      onConfirm: async () => {
        if (await callApi(`/api/lots/${id}`, 'DELETE')) {
          setLots(lots.filter(l => l.id !== id));
        }
        setConfirmDialog(null);
      }
    });
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark-theme' : 'light-theme'} bg-[#0a0c12] text-gray-100 flex flex-col font-sans antialiased relative selection:bg-[#bda165]/30`}>
      
      <header className="bg-[#101421] border-b border-[#1f283d] sticky top-0 z-45 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center justify-between w-full md:w-auto shrink-0">
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 bg-gradient-to-tr from-[#8a733e] to-[#bda165] rounded-xl flex items-center justify-center text-black shadow-lg shadow-[#bda165]/10 shrink-0">
                <Diamond className="h-5.5 w-5.5 animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-sans tracking-wide text-white">GemoMix Suite</h1>
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/10">v1.0 Enterprise</span>
                </div>
                <p className="text-[11px] text-gray-400 font-sans">Gestionnaire de Pierres Précieuses</p>
              </div>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <button
                id="tab-trash-mobile"
                onClick={handleOpenTrash}
                className={`w-9 h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${selectedTab === 'trash' ? 'bg-[#bda165] text-black shadow-lg shadow-[#bda165]/20' : 'bg-gray-100 dark:bg-[#171e2c] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#1f283d] border border-gray-200 dark:border-[#27354d]'}`}
                title="Corbeille"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                id="tab-settings-mobile"
                onClick={() => setSelectedTab('settings')}
                className={`w-9 h-9 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${selectedTab === 'settings' ? 'bg-[#bda165] text-black shadow-lg shadow-[#bda165]/20' : 'bg-gray-100 dark:bg-[#171e2c] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#1f283d] border border-gray-200 dark:border-[#27354d]'}`}
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                id="theme-toggle-mobile"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-24 h-9 rounded-lg bg-[#171e2c] hover:bg-[#1f283d] text-yellow-400 border border-[#27354d] hover:border-amber-400/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                <span className="text-xs font-semibold text-gray-300">{isDarkMode ? "Clair" : "Sombre"}</span>
              </button>
            </div>
          </div>

          {/* Nav horizontale : uniquement sur mobile/tablette, remplacée par la sidebar en desktop */}
          <nav className="md:hidden overflow-x-auto scrollbar-none py-1 min-w-0 flex-grow">
            <div className="flex items-center flex-nowrap space-x-1 justify-start px-1 py-0.5 w-max">
              <button
                id="tab-dashboard-mobile"
                onClick={() => setSelectedTab('dashboard')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'dashboard' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">Tableau de Bord</span>
              </button>
              <button
                id="tab-inventory-mobile"
                onClick={() => handleSelectTab('inventory')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'inventory' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">Inventaire</span>
              </button>
              <button
                id="tab-purchases-mobile"
                onClick={() => setSelectedTab('purchases')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'purchases' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                <span className="whitespace-nowrap">Achats & Lots</span>
              </button>
              <button
                id="tab-invoices-mobile"
                onClick={() => setSelectedTab('invoices')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'invoices' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <Receipt className="h-3.5 w-3.5 text-amber-400" />
                <span className="whitespace-nowrap">Facturation</span>
              </button>
              <button
                id="tab-contacts-mobile"
                onClick={() => setSelectedTab('contacts')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'contacts' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <span className="whitespace-nowrap">Tiers & CSV</span>
              </button>
              <button
                id="tab-identifier-mobile"
                onClick={() => setSelectedTab('identifier')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'identifier' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <Search className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">🔬 Identificateur</span>
              </button>
              <button
                id="tab-certificate-mobile"
                onClick={() => setSelectedTab('certificate')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'certificate' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <Award className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">📜 Certificats</span>
              </button>
              <button
                id="tab-ai-mobile"
                onClick={() => setSelectedTab('ai')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'ai' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <Cpu className="h-3.5 w-3.5 text-amber-500" />
                <span className="whitespace-nowrap">🤖 Lab Copilot</span>
              </button>
              <button
                id="tab-bijoux-mobile"
                onClick={() => setSelectedTab('bijoux')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border flex items-center gap-1.5 shrink-0 ${selectedTab === 'bijoux' ? 'bg-[#bda165] text-black border-[#bda165]' : 'bg-transparent text-gray-300 border-transparent hover:bg-[#161d2d] hover:text-white'}`}
              >
                <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                <span className="whitespace-nowrap">Bijoux</span>
              </button>
            </div>
          </nav>

          <div className="hidden md:flex items-center shrink-0 select-none gap-2 ml-auto">
            <button
              id="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-24 h-9 rounded-lg bg-[#171e2c] hover:bg-[#1f283d] text-yellow-400 border border-[#27354d] hover:border-amber-400/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              <span className="text-xs font-semibold text-gray-300">{isDarkMode ? "Clair" : "Sombre"}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-grow flex items-start w-full">
        <Sidebar
          selectedTab={selectedTab}
          onSelectTab={handleSelectTab}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenTrash={handleOpenTrash}
        />

      <main className="flex-grow min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {selectedTab === 'dashboard' && (
          <Dashboard
            gemstones={gemstones}
            lots={lots}
            purchases={purchases}
            onNewPurchase={() => { setAutoOpenPurchase(true); setSelectedTab('purchases'); }}
            onNewGem={() => openGemForm(null)}
          />
        )}

        {selectedTab === 'inventory' && inventoryMode === 'list' && (
          <StockList
            gemstones={gemstones}
            lots={lots}
            purchases={purchases}
            onSelectGem={(gem) => openGemForm(gem)}
            onNewGem={() => openGemForm(null)}
            onNavigateToTab={setSelectedTab}
            onDeleteGem={handleDeleteGemstone}
            onDeleteLot={handleDeleteLot}
          />
        )}

        {selectedTab === 'inventory' && inventoryMode === 'form' && (
          <div>
            <button
              id="btn-back-to-inventory"
              onClick={() => { setSelectedGem(null); setInventoryMode('list'); }}
              className="mb-4 px-3 py-1.5 text-xs font-mono font-bold text-gray-300 hover:text-white bg-[#1b2333] hover:bg-[#202a3c] border border-gray-800 rounded-lg transition-all"
            >
              ← Retour à l'inventaire
            </button>
          <InventoryManager
            gemstones={gemstones}
            selectedGem={selectedGem}
            onSaveGem={handleSaveGemstone}
            onClearSelection={() => setSelectedGem(null)}
            priceGuide={priceGuide}
            purchases={purchases}
            suppliers={suppliers}
            onSaveSupplier={handleSaveSupplier}
            onDeleteGem={handleDeleteGemstone}
            onUpdateGemInline={handleUpdateGemstoneInline}
            onGenerateCertificate={(ref) => {
              setSelectedCertGemRef(ref);
              setSelectedTab('certificate');
            }}
          />
          </div>
        )}

        {selectedTab === 'purchases' && (
          <PurchaseManager
            purchases={purchases}
            lots={lots}
            gemstones={gemstones}
            onSavePurchase={handleSavePurchase}
            onDeletePurchase={handleDeletePurchase}
            onSaveLot={handleSaveLot}
            onDeleteLot={handleDeleteLot}
            suppliers={suppliers}
            onSaveSupplier={handleSaveSupplier}
            onOpenGem={(gem) => openGemForm(gem)}
            autoOpenNewPurchase={autoOpenPurchase}
            onAutoOpenHandled={() => setAutoOpenPurchase(false)}
          />
        )}

        {selectedTab === 'identifier' && <IdentificationLab />}

        {selectedTab === 'certificate' && (
          <CertificateLab 
            gemstones={gemstones} 
            companySettings={companySettings}
            initialSelectedRef={selectedCertGemRef} // Injection propre de la référence sélectionnée
            onClearInitialRef={() => setSelectedCertGemRef('')}
          />
        )}

        {selectedTab === 'ai' && <GemologyAiAssistant />}

        {selectedTab === 'invoices' && (
          <SalesManager 
            invoices={invoices}
            clients={clients}
            gemstones={gemstones}
            companySettings={companySettings}
            onSaveInvoice={handleSaveInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onCreateCreditNote={handleCreateCreditNote}
            onRefreshGemstones={handleRefreshGemstones}
            onSaveClient={handleSaveClient}
          />
        )}

        {selectedTab === 'contacts' && (
          <ContactManager 
            suppliers={suppliers}
            clients={clients}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
          />
        )}

        {selectedTab === 'settings' && (
          <SettingsManager
            settings={companySettings}
            onSaveSettings={handleSaveCompanySettings}
            priceGuide={priceGuide}
            onSavePriceGuideEntry={handleSavePriceGuideEntry}
            onDeletePriceGuideEntry={handleDeletePriceGuideEntry}
            invoicingStatus={invoicingStatus}
            onPurgeTestInvoices={handlePurgeTestInvoices}
            onStartLiveInvoicing={handleStartLiveInvoicing}
          />
        )}

        {selectedTab === 'trash' && (
          <TrashManager
            items={trash}
            onRestore={handleRestoreTrashItem}
          />
        )}

        {selectedTab === 'bijoux' && (
          <BijouManager
            bijoux={bijoux}
            gemstones={gemstones}
            onSaveBijou={handleSaveBijou}
            onDeleteBijou={handleDeleteBijou}
            onDecomposeBijou={handleDecomposeBijou}
          />
        )}
      </main>
      </div>

      {apiError && (
        <div
          id="api-error-banner"
          role="alert"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[110] max-w-xl w-[calc(100%-2rem)] flex items-start gap-3 bg-red-600 text-white text-xs font-semibold rounded-xl shadow-2xl px-4 py-3"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 leading-relaxed">{apiError}</span>
          <button
            id="api-error-dismiss"
            onClick={() => setApiError(null)}
            className="shrink-0 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 font-bold"
          >
            Fermer
          </button>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121622] border border-[#232f48] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-lg shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">{confirmDialog.title}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                id="confirm-modal-cancel"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-[#1b2333] hover:bg-[#202a3c] text-xs font-semibold text-gray-400 hover:text-white rounded-lg border border-gray-800 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="confirm-modal-button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-xs font-bold text-white rounded-lg transition cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          header, footer, nav, button, select, .kpi, #inspect-panel, #ai-assistant, form, table {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-report {
            border: 12px double #b1975b !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            position: static !important;
          }
        }
      `}</style>

    </div>
  );
}