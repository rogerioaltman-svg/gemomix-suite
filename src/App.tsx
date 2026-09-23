/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Gemstone, Purchase, Lot, Supplier, Client, SalesInvoice, CompanySettings, PriceGuideEntry, TrashItem, TrashEntityType, Bijou } from './types';
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
    try {
      await fetch(`/api/trash/${type}/${id}/restore`, { method: 'POST' });
    } catch (e) {
      console.error("Failed to restore trash item:", e);
    }
    await loadAllData();
  };

  // --- Company Settings CRUD handlers ---
  const handleSaveCompanySettings = async (settings: CompanySettings) => {
    try {
      const res = await fetch('/api/company-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setCompanySettings(settings);
      }
    } catch {
      setCompanySettings(settings);
    }
  };

  // --- Price Guide (barème) CRUD handlers ---
  const handleSavePriceGuideEntry = async (entry: PriceGuideEntry) => {
    try {
      const res = await fetch('/api/price-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        const list = await fetch('/api/price-guide').then(r => r.json());
        setPriceGuide(list);
      }
    } catch {
      const exists = priceGuide.some(e => e.id === entry.id);
      const updated = exists
        ? priceGuide.map(e => e.id === entry.id ? entry : e)
        : [...priceGuide, entry];
      setPriceGuide(updated);
    }
  };

  const handleDeletePriceGuideEntry = async (id: string) => {
    try {
      await fetch(`/api/price-guide/${id}`, { method: 'DELETE' });
      const list = await fetch('/api/price-guide').then(r => r.json());
      setPriceGuide(list);
    } catch {
      setPriceGuide(priceGuide.filter(e => e.id !== id));
    }
  };

  // --- Module 12 : Bijoux composés CRUD handlers ---
  const handleSaveBijou = async (bijou: Bijou) => {
    try {
      const res = await fetch('/api/bijoux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bijou)
      });
      if (res.ok) {
        const list = await fetch('/api/bijoux').then(r => r.json());
        setBijoux(list);
      }
    } catch {
      const exists = bijoux.some(b => b.id === bijou.id);
      setBijoux(exists ? bijoux.map(b => b.id === bijou.id ? bijou : b) : [bijou, ...bijoux]);
    }
  };

  const handleDeleteBijou = (id: string) => {
    setConfirmDialog({
      title: "Supprimer le bijou",
      message: "Ce bijou sera retiré. Vous pourrez le restaurer depuis la Corbeille à tout moment.",
      onConfirm: async () => {
        try {
          await fetch(`/api/bijoux/${id}`, { method: 'DELETE' });
          const list = await fetch('/api/bijoux').then(r => r.json());
          setBijoux(list);
        } catch {
          setBijoux(bijoux.filter(b => b.id !== id));
        }
        setConfirmDialog(null);
      }
    });
  };

  // Décomposition : action distincte de la suppression, libère les pierres
  // serties (repassent 'Disponible') — recharge bijoux ET pierres.
  const handleDecomposeBijou = async (id: string) => {
    try {
      await fetch(`/api/bijoux/${id}/decompose`, { method: 'POST' });
    } catch (e) {
      console.error("Failed to decompose bijou:", e);
    }
    await loadAllData();
  };

  // --- Supplier CRUD handlers ---
  const handleSaveSupplier = async (savedSup: Supplier) => {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedSup)
      });
      if (res.ok) {
        const list = await fetch('/api/suppliers').then(r => r.json());
        setSuppliers(list);
      }
    } catch {
      const exists = suppliers.some(s => s.id === savedSup.id);
      const updated = exists 
        ? suppliers.map(s => s.id === savedSup.id ? savedSup : s)
        : [...suppliers, savedSup];
      setSuppliers(updated);
    }
  };

  const handleDeleteSupplier = (id: string) => {
    setConfirmDialog({
      title: "Purger ce fournisseur",
      message: "Ce fournisseur sera retiré de l'annuaire. Vous pourrez le restaurer depuis la Corbeille à tout moment.",
      onConfirm: async () => {
        try {
          await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
          const list = await fetch('/api/suppliers').then(r => r.json());
          setSuppliers(list);
        } catch {
          const updated = suppliers.filter(s => s.id !== id);
          setSuppliers(updated);
        }
        setConfirmDialog(null);
      }
    });
  };

  // --- Client CRUD handlers ---
  const handleSaveClient = async (savedCli: Client) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedCli)
      });
      if (res.ok) {
        const list = await fetch('/api/clients').then(r => r.json());
        setClients(list);
      }
    } catch {
      const exists = clients.some(c => c.id === savedCli.id);
      const updated = exists 
        ? clients.map(c => c.id === savedCli.id ? savedCli : c)
        : [...clients, savedCli];
      setClients(updated);
    }
  };

  const handleDeleteClient = (id: string) => {
    setConfirmDialog({
      title: "Purger ce client",
      message: "Ce client sera retiré de l'annuaire. Vous pourrez le restaurer depuis la Corbeille à tout moment.",
      onConfirm: async () => {
        try {
          await fetch(`/api/clients/${id}`, { method: 'DELETE' });
          const list = await fetch('/api/clients').then(r => r.json());
          setClients(list);
        } catch {
          const updated = clients.filter(c => c.id !== id);
          setClients(updated);
        }
        setConfirmDialog(null);
      }
    });
  };

  // --- Sales Invoice CRUD handlers ---
  const handleSaveInvoice = async (savedInv: SalesInvoice) => {
    try {
      const res = await fetch('/api/sales-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedInv)
      });
      if (res.ok) {
        const [invList, gemList] = await Promise.all([
          fetch('/api/sales-invoices').then(r => r.json()),
          fetch('/api/gemstones').then(r => r.json())
        ]);
        setInvoices(invList);
        setGemstones(Array.isArray(gemList) ? gemList.map(normalizeGemstone) : []);
      }
    } catch {
      const exists = invoices.some(i => i.id === savedInv.id);
      const updated = exists 
        ? invoices.map(i => i.id === savedInv.id ? savedInv : i)
        : [...invoices, savedInv];
      setInvoices(updated);

      if (savedInv.status === 'Payée' || savedInv.status === 'En attente') {
        const updatedGems = gemstones.map(g => {
          const foundInItems = savedInv.items.some(item => item.gemstoneId === g.id);
          if (foundInItems) {
            return { ...g, status: 'Vendu' as const };
          }
          return g;
        });
        setGemstones(updatedGems);
      }
    }
  };

  const handleDeleteInvoice = (id: string) => {
    setConfirmDialog({
      title: "Purger cette facture",
      message: "Cette facture sera retirée du registre. Vous pourrez la restaurer depuis la Corbeille à tout moment.",
      onConfirm: async () => {
        try {
          await fetch(`/api/sales-invoices/${id}`, { method: 'DELETE' });
          const list = await fetch('/api/sales-invoices').then(r => r.json());
          setInvoices(list);
        } catch {
          const updated = invoices.filter(i => i.id !== id);
          setInvoices(updated);
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

  // Add / Edit stone handler
  const handleSaveGemstone = async (savedGem: Gemstone) => {
    const normalized = normalizeGemstone(savedGem);
    const exists = gemstones.some(g => g.id === normalized.id);
    const updatedList = exists 
      ? gemstones.map(g => g.id === normalized.id ? normalized : g)
      : [normalized, ...gemstones];
    
    try {
      await fetch('/api/gemstones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
    } catch (e) {
      console.error("Failed to persist remote gemstone:", e);
    }
    
    setGemstones(updatedList);
    setSelectedGem(null);
    setSelectedTab('dashboard');
  };

  // Inline update for specific nested operations (e.g. recuttings)
  const handleUpdateGemstoneInline = async (updatedGem: Gemstone) => {
    const normalized = normalizeGemstone(updatedGem);
    const updatedList = gemstones.map(g => g.id === normalized.id ? normalized : g);
    
    try {
      await fetch('/api/gemstones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
    } catch (e) {
      console.error("Failed to persist inline gemstone update:", e);
    }
    
    setGemstones(updatedList);
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
        const updatedList = gemstones.filter(g => g.id !== id);
        try {
          await fetch(`/api/gemstones/${id}`, { method: 'DELETE' });
        } catch (e) {
          console.error("Failed to delete remote gemstone:", e);
        }
        setGemstones(updatedList);
        if (selectedGem?.id === id) {
          setSelectedGem(null);
          setSelectedTab('dashboard');
        }
        setConfirmDialog(null);
      }
    });
  };

  // Purchases management handlers
  const handleSavePurchase = async (savedPur: Purchase) => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedPur)
      });
      if (res.ok) {
        // Recharge achats ET pierres : les articles "entrée directe en stock"
        // créent des fiches pierres côté serveur
        const [pList, gList] = await Promise.all([
          fetch('/api/purchases').then(r => r.json()),
          fetch('/api/gemstones').then(r => r.json())
        ]);
        setPurchases(pList);
        setGemstones(Array.isArray(gList) ? gList.map(normalizeGemstone) : []);
        return;
      }
    } catch (e) {
      console.error("Failed to save remote purchase:", e);
    }
    // Fallback local si le backend est injoignable
    const exists = purchases.some(p => p.id === savedPur.id);
    setPurchases(exists
      ? purchases.map(p => p.id === savedPur.id ? savedPur : p)
      : [savedPur, ...purchases]);
  };

  const handleDeletePurchase = (id: string) => {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;
    setConfirmDialog({
      title: "Supprimer l'achat",
      message: `L'achat "${purchase.reference}" de ${purchase.supplier} et ses lots de tri associés seront retirés. Vous pourrez tout restaurer depuis la Corbeille.`,
      onConfirm: async () => {
        const updatedList = purchases.filter(p => p.id !== id);
        const filteredLots = lots.filter(l => l.purchaseId !== id);
        try {
          await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
        } catch (e) {
          console.error("Failed to delete remote purchase:", e);
        }
        setPurchases(updatedList);
        setLots(filteredLots);
        setConfirmDialog(null);
      }
    });
  };

  // Lots de tri handlers
  const handleSaveLot = async (savedLot: Lot) => {
    const exists = lots.some(l => l.id === savedLot.id);
    const updatedList = exists
      ? lots.map(l => l.id === savedLot.id ? savedLot : l)
      : [savedLot, ...lots];

    try {
      await fetch('/api/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedLot)
      });
    } catch (e) {
      console.error("Failed to save remote lot:", e);
    }
    setLots(updatedList);
  };

  const handleDeleteLot = (id: string) => {
    const lot = lots.find(l => l.id === id);
    if (!lot) return;
    setConfirmDialog({
      title: "Supprimer le lot de tri",
      message: `Le lot de tri "${lot.reference}" sera retiré. Vous pourrez le restaurer depuis la Corbeille à tout moment.`,
      onConfirm: async () => {
        const updatedList = lots.filter(l => l.id !== id);
        try {
          await fetch(`/api/lots/${id}`, { method: 'DELETE' });
        } catch (e) {
          console.error("Failed to delete remote lot:", e);
        }
        setLots(updatedList);
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
                onClick={() => { setSelectedTab('inventory'); setSelectedGem(null); }}
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
          onSelectTab={setSelectedTab}
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
            onSelectGem={(gem) => { setSelectedGem(gem); setSelectedTab('inventory'); }}
            onNavigateToTab={setSelectedTab}
            onDeleteGem={handleDeleteGemstone}
            onDeleteLot={handleDeleteLot}
          />
        )}

        {selectedTab === 'inventory' && (
          <InventoryManager
            gemstones={gemstones}
            selectedGem={selectedGem}
            onSaveGem={handleSaveGemstone}
            onClearSelection={() => setSelectedGem(null)}
            priceGuide={priceGuide}
            purchases={purchases}
            onDeleteGem={handleDeleteGemstone}
            onUpdateGemInline={handleUpdateGemstoneInline}
            onGenerateCertificate={(ref) => {
              setSelectedCertGemRef(ref);
              setSelectedTab('certificate');
            }}
          />
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