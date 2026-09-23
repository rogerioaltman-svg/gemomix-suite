/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Gemstone, Lot, Purchase } from '../types';
import {
  Diamond,
  Coins,
  Weight,
  Search,
  SlidersHorizontal,
  Plus,
  ChevronRight,
  Trash2,
  Layers,
  Inbox,
  ShoppingBag
} from 'lucide-react';

interface StockListProps {
  gemstones: Gemstone[];
  lots?: Lot[];
  purchases?: Purchase[];
  onSelectGem: (gem: Gemstone) => void;
  onNewGem: () => void;
  onNavigateToTab: (tab: string) => void;
  onDeleteGem: (id: string) => void;
  onDeleteLot: (id: string) => void;
}

export default function StockList({
  gemstones = [],
  lots = [],
  purchases = [],
  onSelectGem,
  onNewGem,
  onNavigateToTab,
  onDeleteGem,
  onDeleteLot
}: StockListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Tous');
  const [selectedStatus, setSelectedStatus] = useState('Tous');
  const [stockFilterMode, setStockFilterMode] = useState<'all' | 'stone' | 'lot'>('all');

  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minWeight, setMinWeight] = useState<string>('');
  const [maxWeight, setMaxWeight] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [colorFilter, setColorFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');

  // Unified variety list cross-checked against all types of stock
  const uniqueTypes = useMemo(() => {
    const types = new Set([
      ...gemstones.map(g => g.type),
      ...lots.map(l => l.gemstoneType),
      ...purchases.flatMap(p => p.articles ? p.articles.map(a => a.gemstoneType) : [])
    ]);
    return ['Tous', ...Array.from(types)];
  }, [gemstones, lots, purchases]);

  // Compile a unified stock datastructure
  const unifiedItems = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'stone' | 'lot' | 'purchase_article';
      reference: string;
      variety: string;
      weight: number;
      details: string;
      criteriaColor: string;
      criteriaClarity: string;
      treatment: string;
      origin: string;
      certOrDest: string;
      cost: number;
      value: number;
      status: string;
      date: string;
      raw: Gemstone | Lot | any;
    }> = [];

    // Add unique standalone certified gemstones
    gemstones.forEach(g => {
      list.push({
        id: g.id,
        type: 'stone',
        reference: g.reference,
        variety: g.type,
        weight: g.weight,
        details: g.cut,
        criteriaColor: g.color,
        criteriaClarity: g.clarity,
        treatment: g.treatment,
        origin: g.origin,
        certOrDest: g.certificate.authority !== 'Sans' ? `${g.certificate.authority} (${g.certificate.number})` : 'Interne (Aucun cert.)',
        cost: g.costPrice,
        value: g.sellingPrice,
        status: g.status,
        date: g.dateAdded,
        raw: g
      });
    });

    // Add physical lots
    lots.forEach(l => {
      const parentPurchase = purchases.find(p => p.id === l.purchaseId);
      const article = parentPurchase?.articles.find(a => a.id === l.purchaseArticleId);
      const costPrice = article ? l.weight * article.caratPrice : 0;
      const sellingPrice = costPrice * 1.5; // Commercial markup estimate

      // Deduce geographic origin from raw purchase notes/supplier
      const deducedOrigin = (() => {
        const combinedNotes = `${parentPurchase?.supplier || ''} ${parentPurchase?.notes || ''} ${article?.notes || ''} ${l.notes || ''}`.toLowerCase();
        if (combinedNotes.includes('madagascar')) return 'Madagascar';
        if (combinedNotes.includes('sri lanka') || combinedNotes.includes('ceylan') || combinedNotes.includes('sri-lanka')) return 'Sri Lanka';
        if (combinedNotes.includes('birmanie') || combinedNotes.includes('mogok') || combinedNotes.includes('myanmar')) return 'Birmanie';
        if (combinedNotes.includes('colomb')) return 'Colombie';
        if (combinedNotes.includes('thaïlande') || combinedNotes.includes('thailand') || combinedNotes.includes('chanthaburi')) return 'Thaïlande';
        if (combinedNotes.includes('tanzan')) return 'Tanzanie';
        return parentPurchase?.supplier ? parentPurchase.supplier : 'Facture internationale';
      })();

      list.push({
        id: l.id,
        type: 'lot',
        reference: l.reference,
        variety: l.gemstoneType,
        weight: l.weight,
        details: `${l.cutType || 'Brut'}${l.quantity ? ` (${l.quantity} pcs)` : ''}`,
        criteriaColor: l.averageColor || 'N/A',
        criteriaClarity: l.averageClarity || 'N/A',
        treatment: 'Colis de Brut trié',
        origin: deducedOrigin,
        certOrDest: l.destination || 'Lot de tri',
        cost: costPrice,
        value: sellingPrice,
        status: 'Disponible', // default status for sorted materials
        date: l.dateCreated,
        raw: l
      });
    });

    // Add untriaged purchase articles (les pierres uniques en entrée directe
    // sont représentées par leur fiche d'inventaire, pas comme colis bruts)
    purchases.forEach(p => {
      if (p.articles && Array.isArray(p.articles)) {
        p.articles.forEach(art => {
          if (art.entryMode === 'stock') return;
          const subLots = lots.filter(l => l.purchaseArticleId === art.id);
          const sortedWeight = subLots.reduce((sum, l) => sum + l.weight, 0);
          const remainingWeight = Math.max(0, art.weight - sortedWeight);
          
          if (remainingWeight > 0.01) {
            const costPrice = remainingWeight * art.caratPrice;
            const sellingPrice = costPrice * 1.5;
            
            list.push({
              id: art.id,
              type: 'purchase_article',
              reference: `${p.reference}-${art.id.split('-').pop()?.substring(0, 4)}`,
              variety: art.gemstoneType,
              weight: remainingWeight,
              details: `Colis brut en attente de tri (${art.name})`,
              criteriaColor: 'Brut non trié',
              criteriaClarity: 'Inconnue',
              treatment: 'Non traité',
              origin: p.supplier,
              certOrDest: `Colis global d'achat (${p.reference})`,
              cost: costPrice,
              value: sellingPrice,
              status: 'Disponible',
              date: p.date,
              raw: art
            });
          }
        });
      }
    });

    // Sort by date added desc
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [gemstones, lots, purchases]);

  // Filter combined stock items
  const filteredItems = useMemo(() => {
    return unifiedItems.filter(item => {
      // 1. Switchboard filter
      if (stockFilterMode === 'stone' && item.type !== 'stone') return false;
      if (stockFilterMode === 'lot' && item.type !== 'lot' && item.type !== 'purchase_article') return false;

      // 2. Search query filter
      const matchSearch = 
        !searchTerm ||
        item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variety.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.certOrDest.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.treatment.toLowerCase().includes(searchTerm.toLowerCase());

      // 3. Variety selection filter
      const matchType = selectedType === 'Tous' || item.variety === selectedType;

      // 4. Status filter
      const matchStatus = selectedStatus === 'Tous' || item.status === selectedStatus;

      // 5. Advanced Filters
      const matchMinWeight = !minWeight || item.weight >= parseFloat(minWeight);
      const matchMaxWeight = !maxWeight || item.weight <= parseFloat(maxWeight);
      const matchMinPrice = !minPrice || item.value >= parseFloat(minPrice);
      const matchMaxPrice = !maxPrice || item.value <= parseFloat(maxPrice);
      const matchColor = !colorFilter || item.criteriaColor.toLowerCase().includes(colorFilter.toLowerCase()) || item.criteriaClarity.toLowerCase().includes(colorFilter.toLowerCase());
      const matchOrigin = !originFilter || item.origin.toLowerCase().includes(originFilter.toLowerCase());

      return matchSearch && matchType && matchStatus && matchMinWeight && matchMaxWeight && matchMinPrice && matchMaxPrice && matchColor && matchOrigin;
    });
  }, [unifiedItems, stockFilterMode, searchTerm, selectedType, selectedStatus, minWeight, maxWeight, minPrice, maxPrice, colorFilter, originFilter]);

  const rawPurchaseCount = unifiedItems.filter(i => i.type === 'purchase_article').length;

  return (
    <div className="space-y-6" id="inventory-list-tab">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white font-sans">Inventaire</h1>
          <p className="text-xs text-gray-400 mt-0.5">Pierres uniques, lots de tri et colis bruts d'achat. Cliquez sur une pierre pour ouvrir sa fiche.</p>
        </div>
        <button
          id="btn-new-gem"
          onClick={onNewGem}
          className="px-4 py-2 text-xs bg-[#bda165] hover:bg-[#cca96e] text-black font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-200"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Enregistrer une pierre</span>
        </button>
      </div>

      <div className="bg-[#121620] border border-[#212a3d] rounded-xl overflow-hidden shadow-2xl">
        
        {/* Main Stock Filters Switchboard */}
        <div className="bg-[#151a27] p-4 border-b border-[#212a3d] flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-1.5 bg-black/30 p-1 rounded-lg border border-gray-800">
            <button 
              id="fmode-all"
              onClick={() => setStockFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all flex items-center gap-1.5 ${stockFilterMode === 'all' ? 'bg-[#bda165] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <span>🔍 Tout le stock ({gemstones.length + lots.length + rawPurchaseCount})</span>
            </button>
            <button 
              id="fmode-stone"
              onClick={() => setStockFilterMode('stone')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all flex items-center gap-1.5 ${stockFilterMode === 'stone' ? 'bg-[#bda165] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <Diamond className="h-3.5 w-3.5" />
              <span>Pierres Uniques ({gemstones.length})</span>
            </button>
            <button 
              id="fmode-lot"
              onClick={() => setStockFilterMode('lot')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-all flex items-center gap-1.5 ${stockFilterMode === 'lot' ? 'bg-[#bda165] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Lots & Vrac ({lots.length + rawPurchaseCount})</span>
            </button>
          </div>

          <div className="text-[11px] text-gray-500 font-mono">
            Mode : <b>{stockFilterMode === 'all' ? 'Consolidation Générale' : stockFilterMode === 'stone' ? 'Pierres Certifiées unitaire' : 'Lots de tri & Colis bruts rattachés'}</b>
          </div>
        </div>

        {/* Filter Toolbar (Search & Category filter) */}
        <div className="p-5 border-b border-[#212a3d] flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
              <span>Inventaire centralisé</span>
              <span className="text-xs bg-[#1f283b] text-yellow-400 font-mono px-2 py-0.5 rounded-full">{filteredItems.length} ligne(s)</span>
            </h2>
            <p className="text-gray-400 text-xs mt-1">Pierres uniques, lots de tri et colis bruts d'achat</p>
          </div>

          <div className="w-full md:w-auto flex flex-wrap gap-2 items-center">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                <Search className="h-4 w-4" />
              </span>
              <input 
                id="stock-search"
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Recherche basique..." 
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c] placeholder-gray-500"
              />
            </div>
            
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 text-xs border rounded-lg transition-colors flex items-center gap-1.5 ${showAdvancedFilters ? 'bg-[#2b3952] border-[#4a5f87] text-white' : 'bg-[#171e2c] border-[#27354d] text-gray-300 hover:text-white'}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filtres Avancés</span>
            </button>

            {/* Variety filter */}
            <div className="relative">
              <select 
                id="filter-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 rounded-lg focus:outline-none focus:border-[#b4985c]"
              >
                <option value="Tous">Toutes variétés</option>
                {uniqueTypes.filter(t => t !== 'Tous').map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="relative">
              <select 
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 rounded-lg focus:outline-none focus:border-[#b4985c]"
              >
                <option value="Tous">Tous statuts</option>
                <option value="Disponible">Disponible</option>
                <option value="Réservé">Réservé</option>
                <option value="Vendu">Vendu</option>
                <option value="Confié">Confié</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="p-5 bg-[#151a27] border-b border-[#212a3d] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
             {/* Poids Min/Max */}
             <div>
                <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 flex items-center gap-1">
                  <Weight className="h-3 w-3" /> Poids (Carats)
                </label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" placeholder="Min" value={minWeight} onChange={e => setMinWeight(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-[#111520] border border-[#27354d] rounded text-white focus:outline-none focus:border-[#b4985c]" />
                  <input type="number" step="0.01" placeholder="Max" value={maxWeight} onChange={e => setMaxWeight(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-[#111520] border border-[#27354d] rounded text-white focus:outline-none focus:border-[#b4985c]" />
                </div>
             </div>
             
             {/* Valeur Min/Max */}
             <div>
                <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 flex items-center gap-1">
                  <Coins className="h-3 w-3" /> Valeur Estimée (€)
                </label>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-[#111520] border border-[#27354d] rounded text-white focus:outline-none focus:border-[#b4985c]" />
                  <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-[#111520] border border-[#27354d] rounded text-white focus:outline-none focus:border-[#b4985c]" />
                </div>
             </div>

             {/* Couleur / Pureté */}
             <div>
                <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 flex items-center gap-1">
                  <Diamond className="h-3 w-3" /> Couleur / Pureté
                </label>
                <input type="text" placeholder="Ex: IF, Royal Blue..." value={colorFilter} onChange={e => setColorFilter(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-[#111520] border border-[#27354d] rounded text-white focus:outline-none focus:border-[#b4985c]" />
             </div>

             {/* Origine */}
             <div>
                <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1.5 flex items-center gap-1">
                   Origine Spécifique
                </label>
                <input type="text" placeholder="Ex: Mogok, Ceylan..." value={originFilter} onChange={e => setOriginFilter(e.target.value)} className="w-full px-2 py-1.5 text-xs bg-[#111520] border border-[#27354d] rounded text-white focus:outline-none focus:border-[#b4985c]" />
             </div>
             
             {/* Clear Filters Button (Full Width Col-span) */}
             <div className="md:col-span-2 lg:col-span-4 flex justify-end">
               <button 
                 onClick={() => {
                   setMinWeight(''); setMaxWeight(''); setMinPrice(''); setMaxPrice(''); setColorFilter(''); setOriginFilter('');
                 }} 
                 className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1"
               >
                 <Trash2 className="h-3 w-3" /> Effacer les filtres avancés
               </button>
             </div>
          </div>
        )}

        {/* Unified Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#171d2b] border-b border-[#212a3d] text-gray-400 text-[11px] font-mono tracking-wider uppercase">
                <th className="py-3 px-4 whitespace-nowrap">Type</th>
                <th className="py-3 px-4 whitespace-nowrap">Référence</th>
                <th className="py-3 px-4 whitespace-nowrap">Variété</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Poids (ct)</th>
                <th className="py-3 px-4 whitespace-nowrap">Taille</th>
                <th className="py-3 px-4 whitespace-nowrap">Couleur / Pureté</th>
                <th className="py-3 px-4 whitespace-nowrap">Origine</th>
                <th className="py-3 px-4 whitespace-nowrap">Certificat / Rangement</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Achat</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Revente</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Statut</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2739] text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-500 font-mono">
                    <Inbox className="h-8 w-8 mx-auto text-gray-700 mb-2" />
                    Aucune ressource (pierre unique ou lot de tri) ne correspond à ces critères.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className={`hover:bg-[#18202f]/60 transition-colors group ${item.type === 'stone' ? 'cursor-pointer' : ''}`}
                    title={item.type === 'stone' ? "Ouvrir la fiche d'expertise" : undefined}
                    onClick={() => {
                      if (item.type === 'stone') {
                        onSelectGem(item.raw as Gemstone);
                      }
                    }}
                  >
                    {/* Item type badge */}
                    <td className="py-3.5 px-4 font-mono">
                      {item.type === 'stone' ? (
                        <span className="px-1.5 py-0.5 bg-[#bda165]/10 text-[#eedfa7] border border-[#bda165]/30 rounded text-[9px] font-bold tracking-wider">
                          PIECE
                        </span>
                      ) : item.type === 'purchase_article' ? (
                        <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 rounded text-[9px] font-bold tracking-wider">
                          BRUT/PARCELLE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded text-[9px] font-bold tracking-wider">
                          VRAC/LOT
                        </span>
                      )}
                    </td>

                    {/* Reference & Creation Date */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-semibold text-white flex items-center gap-1">
                        {item.type === 'stone' ? (
                          <Diamond className="h-3 w-3 text-[#bda165] shrink-0" />
                        ) : item.type === 'purchase_article' ? (
                          <ShoppingBag className="h-3 w-3 text-cyan-400 shrink-0" />
                        ) : (
                          <Inbox className="h-3 w-3 text-emerald-400 shrink-0" />
                        )}
                        <span>{item.reference}</span>
                      </div>
                      <span className="text-gray-500 text-[10px] block mt-0.5">{item.date}</span>
                    </td>

                    {/* Variety display */}
                    <td className="py-3.5 px-4 font-bold text-gray-100 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${varietyColorDot(item.variety)}`}></span>
                        <span>{item.variety}</span>
                      </div>
                    </td>

                    {/* Weight (ct) */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-white text-[13px]">
                      {item.weight.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">ct</span>
                    </td>

                    {/* Aspect details (Cut or shape description) */}
                    <td className="py-3.5 px-4 text-gray-300">
                      {item.details}
                    </td>

                    {/* Aspect Criteria / 4Cs */}
                    <td className="py-3.5 px-4 leading-relaxed">
                      <div className="text-gray-300 font-mono text-[11px]">{item.criteriaColor}</div>
                      <div className="text-gray-500 text-[10px] mt-0.5">{item.criteriaClarity !== 'N/A' && `Clarté : ${item.criteriaClarity}`}</div>
                    </td>

                    {/* Geographic Origin */}
                    <td className="py-3.5 px-4">
                      <div className="text-gray-200 font-semibold">{item.origin}</div>
                      <span className="text-amber-500 text-[10px] font-mono">{item.treatment}</span>
                    </td>

                    {/* Certificate of Authority / Safe storage destination */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      {item.type === 'stone' ? (
                        <span className="text-yellow-400 font-bold">{item.certOrDest}</span>
                      ) : item.type === 'purchase_article' ? (
                        <span className="text-cyan-400 font-medium italic">💼 {item.certOrDest}</span>
                      ) : (
                        <span className="text-emerald-400 font-medium italic">📁 {item.certOrDest}</span>
                      )}
                    </td>

                    {/* Buying cost */}
                    <td className="py-3.5 px-4 text-right font-mono text-gray-400">
                      {item.cost > 0 ? `${Math.round(item.cost).toLocaleString('fr-FR')} €` : '-'}
                    </td>

                    {/* Estimated resale value */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#e0b760]">
                      {item.value > 0 ? (
                        <div>{Math.round(item.value).toLocaleString('fr-FR')} €</div>
                      ) : (
                        <span className="text-gray-500 italic font-sans font-normal text-[10px]">Non estimée</span>
                      )}
                      {(item.type === 'lot' || item.type === 'purchase_article') && item.value > 0 && (
                        <span className="text-[9px] text-[#eedfa7]/60 font-sans block font-normal">(Est. Marge brute)</span>
                      )}
                    </td>

                    {/* Status badges */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium font-sans ${statusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions tools */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-center items-center">
                        {item.type === 'stone' ? (
                          <>
                            <button 
                              title="Fiche Technique"
                              onClick={() => {
                                onSelectGem(item.raw as Gemstone);
                              }}
                              className="text-gray-400 hover:text-[#e0b760] transition-colors p-1"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            <button 
                              title="Supprimer la pierre"
                              onClick={() => onDeleteGem(item.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : item.type === 'purchase_article' ? (
                          <button 
                            title="Trier ce colis brut d'achat"
                            onClick={() => onNavigateToTab('purchases')}
                            className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black hover:border-cyan-500 rounded text-[10px] font-mono font-bold text-cyan-400 transition-all flex items-center gap-1"
                          >
                            <span>Trier</span>
                            <Layers className="h-3 w-3" />
                          </button>
                        ) : (
                          <>
                            <button 
                              title="Gérer le Triage"
                              onClick={() => onNavigateToTab('purchases')}
                              className="text-gray-400 hover:text-emerald-400 transition-colors p-1 flex items-center"
                            >
                              <Layers className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              title="Supprimer le lot de tri"
                              onClick={() => onDeleteLot(item.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helpers
function varietyColorDot(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('diam')) return 'bg-gray-200';
  if (t.includes('saph')) return 'bg-blue-500';
  if (t.includes('ru')) return 'bg-red-500';
  if (t.includes('éme') || t.includes('eme')) return 'bg-emerald-500';
  if (t.includes('tanz')) return 'bg-indigo-500';
  if (t.includes('spin')) return 'bg-pink-500';
  return 'bg-amber-500';
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Disponible':
      return 'bg-green-500/15 text-green-400 border border-green-500/20';
    case 'Réservé':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
    case 'Vendu':
      return 'bg-gray-500/15 text-gray-400 border border-gray-500/20';
    case 'Confié':
      return 'bg-sky-500/15 text-sky-400 border border-sky-500/20';
    default:
      return 'bg-green-500/15 text-green-400 border border-green-500/20';
  }
}
