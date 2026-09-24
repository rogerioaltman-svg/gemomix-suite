/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import PageHeader, { btnPrimary, btnSecondary } from './PageHeader';
import { Gemstone, Lot, Purchase } from '../types';
import { 
  Sparkles, 
  Coins, 
  Weight, 
  Plus, 
  Layers
} from 'lucide-react';

interface DashboardProps {
  gemstones: Gemstone[];
  lots?: Lot[];
  purchases?: Purchase[];
  onNewPurchase: () => void;
  onNewGem: () => void;
}

export default function Dashboard({ 
  gemstones = [], 
  lots = [], 
  purchases = [], 
  onNewPurchase, 
  onNewGem 
}: DashboardProps) {


  // Compute stats across direct entries, sorted lots, and untriaged raw purchases
  const stats = useMemo(() => {
    // 1. Standalone registered stones
    const stoneCount = gemstones.length;
    const stoneCarats = gemstones.reduce((sum, g) => sum + g.weight, 0);
    const stoneCost = gemstones.reduce((sum, g) => sum + g.costPrice, 0);
    const stoneValue = gemstones.reduce((sum, g) => sum + g.sellingPrice, 0);

    // 2. Active sorted lots in vault
    const lotCount = lots.length;
    const lotCarats = lots.reduce((sum, l) => sum + l.weight, 0);
    const lotCost = lots.reduce((sum, l) => {
      const parentPurchase = purchases.find(p => p.id === l.purchaseId);
      const article = parentPurchase?.articles.find(a => a.id === l.purchaseArticleId);
      return sum + (article ? l.weight * article.caratPrice : 0);
    }, 0);
    const lotValue = lotCost * 1.5;

    // 3. Untriaged raw purchase articles remaining
    let rawPurchaseCount = 0;
    let rawPurchaseCarats = 0;
    let rawPurchaseCost = 0;
    
    purchases.forEach(p => {
      if (p.articles && Array.isArray(p.articles)) {
        p.articles.forEach(art => {
          // Les pierres uniques en entrée directe sont déjà comptées dans l'inventaire
          if (art.entryMode === 'stock') return;
          const subLots = lots.filter(l => l.purchaseArticleId === art.id);
          const sortedWeight = subLots.reduce((sum, l) => sum + l.weight, 0);
          const remainingWeight = Math.max(0, art.weight - sortedWeight);
          if (remainingWeight > 0.01) {
            rawPurchaseCount += 1;
            rawPurchaseCarats += remainingWeight;
            rawPurchaseCost += remainingWeight * art.caratPrice;
          }
        });
      }
    });
    const rawPurchaseValue = rawPurchaseCost * 1.5;

    // Consolidated values
    const totalCount = stoneCount + lotCount + rawPurchaseCount;
    const totalCarats = stoneCarats + lotCarats + rawPurchaseCarats;
    const totalCost = stoneCost + lotCost + rawPurchaseCost;
    const totalValue = stoneValue + lotValue + rawPurchaseValue;
    const averagePerCarat = totalCarats > 0 ? totalValue / totalCarats : 0;
    
    // Joint variety statistics
    const varietyCounts: Record<string, number> = {};
    gemstones.forEach(g => {
      varietyCounts[g.type] = (varietyCounts[g.type] || 0) + 1;
    });
    lots.forEach(l => {
      varietyCounts[l.gemstoneType] = (varietyCounts[l.gemstoneType] || 0) + 1;
    });
    purchases.forEach(p => {
      if (p.articles && Array.isArray(p.articles)) {
        p.articles.forEach(art => {
          if (art.entryMode === 'stock') return;
          const subLots = lots.filter(l => l.purchaseArticleId === art.id);
          const sortedWeight = subLots.reduce((sum, l) => sum + l.weight, 0);
          const remainingWeight = Math.max(0, art.weight - sortedWeight);
          if (remainingWeight > 0.01) {
            varietyCounts[art.gemstoneType] = (varietyCounts[art.gemstoneType] || 0) + 1;
          }
        });
      }
    });

    return {
      totalCount,
      totalCarats,
      totalCost,
      totalValue,
      averagePerCarat,
      varietyCounts,
      stoneCount,
      stoneCarats,
      stoneCost,
      stoneValue,
      lotCount,
      lotCarats,
      lotCost,
      lotValue,
      rawPurchaseCount,
      rawPurchaseCarats,
      rawPurchaseCost,
      rawPurchaseValue
    };
  }, [gemstones, lots, purchases]);


  return (
    <div className="space-y-6" id="dashboard-tab">
      <PageHeader
        title="Tableau de bord"
        description="Stock consolidé : vos achats s'affichent en colis bruts, puis se mettent à jour à mesure de votre tri en lots."
        actions={
          <>
            <button id="btn-quick-add" onClick={onNewGem} className={btnSecondary}>
              <Plus className="h-3.5 w-3.5" />
              <span>Enregistrer une pierre</span>
            </button>
            <button id="btn-nav-purchases" onClick={onNewPurchase} className={btnPrimary}>
              <Plus className="h-3.5 w-3.5" />
              <span>Saisir un achat</span>
            </button>
          </>
        }
      />

      
       {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Pieces / Resources */}
        <div className="bg-[#121620] border border-[#212a3d] rounded-xl p-5 relative overflow-hidden group hover:border-[#bda165]/40 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">Ressources en Coffre</p>
              <h3 className="text-3xl font-bold text-white mt-1">
                {stats.totalCount} <span className="text-xs text-gray-500 font-normal">lots/unités</span>
              </h3>
            </div>
            <div className="p-2 bg-[#1b2333] rounded-lg text-emerald-400">
              <Layers className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-[11px] text-gray-400">
            <div className="flex justify-between">
              <span>💎 Pierres d'enregistrement :</span>
              <span className="text-white font-mono">{stats.stoneCount}</span>
            </div>
            <div className="flex justify-between">
              <span>📦 Lots triés :</span>
              <span className="text-emerald-400 font-mono">{stats.lotCount}</span>
            </div>
            <div className="flex justify-between">
              <span>💼 Colis bruts à trier :</span>
              <span className="text-cyan-400 font-mono">{stats.rawPurchaseCount}</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-[2px] w-full bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>

        {/* Total Weight */}
        <div className="bg-[#121620] border border-[#212a3d] rounded-xl p-5 relative overflow-hidden group hover:border-[#bda165]/40 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">Masse Globale</p>
              <h3 className="text-3xl font-bold text-white mt-1">
                {stats.totalCarats.toFixed(1)} <span className="text-xs text-gray-500 font-normal">cts</span>
              </h3>
            </div>
            <div className="p-2 bg-[#1b2333] rounded-lg text-amber-500">
              <Weight className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-[11px] text-gray-400">
            <div className="flex justify-between">
              <span>💎 Pierres taillées :</span>
              <span className="text-white font-mono">{stats.stoneCarats.toFixed(1)} ct</span>
            </div>
            <div className="flex justify-between">
              <span>📦 Lots triés :</span>
              <span className="text-emerald-400 font-mono">{stats.lotCarats.toFixed(1)} ct</span>
            </div>
            <div className="flex justify-between">
              <span>💼 Colis bruts à trier :</span>
              <span className="text-cyan-400 font-mono">{stats.rawPurchaseCarats.toFixed(1)} ct</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-[2px] w-full bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>

        {/* Total Value */}
        <div className="bg-[#121620] border border-[#212a3d] rounded-xl p-5 relative overflow-hidden group hover:border-[#bda165]/40 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">Valeur Estimée active</p>
              <h3 className="text-3xl font-bold text-[#e0b760] mt-1">{stats.totalValue.toLocaleString('fr-FR')} €</h3>
            </div>
            <div className="p-2 bg-[#1b2333] rounded-lg text-[#e0b760]">
              <Coins className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-[11px] text-gray-400">
            <div className="flex justify-between">
              <span>💰 Coût global historique :</span>
              <span className="text-white font-mono">{stats.totalCost.toLocaleString('fr-FR')} €</span>
            </div>
            <div className="flex justify-between text-green-400 font-bold">
              <span>Est. Plus-value :</span>
              <span>+{Math.max(0, stats.totalValue - stats.totalCost).toLocaleString('fr-FR')} €</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#e0b760] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>

        {/* Price Per Carat */}
        <div className="bg-[#121620] border border-[#212a3d] rounded-xl p-5 relative overflow-hidden group hover:border-[#bda165]/40 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">Moyenne du Carat</p>
              <h3 className="text-3xl font-bold text-sky-400 mt-1">
                {stats.averagePerCarat.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </h3>
            </div>
            <div className="p-2 bg-[#1b2333] rounded-lg text-sky-400">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-[11px] text-gray-400">
            <div className="flex justify-between">
              <span>💎 Pierres taillées :</span>
              <span className="text-white font-mono">{(stats.stoneCarats > 0 ? stats.stoneValue / stats.stoneCarats : 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/ct</span>
            </div>
            <div className="flex justify-between">
              <span>📦 Lots & Vrac :</span>
              <span className="text-sky-400 font-mono">{(stats.lotCarats > 0 ? stats.lotValue / stats.lotCarats : 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/ct</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-[2px] w-full bg-sky-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>
      </div>

    </div>
  );
}
