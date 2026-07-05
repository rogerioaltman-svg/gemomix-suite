/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Gemstone, RecuttingRecord } from '../types';
import { Scissors, Plus, History, Check, DollarSign, Sparkles, Scale, Percent, Sliders, Trash2 } from 'lucide-react';

interface RecuttingSectionProps {
  gemstone: Gemstone;
  onUpdateGemstone: (updatedGem: Gemstone) => void;
}

export default function RecuttingSection({ gemstone, onUpdateGemstone }: RecuttingSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New recutting state
  const [lapidaryName, setLapidaryName] = useState('');
  const [laborCost, setLaborCost] = useState<number | string>(0);
  const [finalWeight, setFinalWeight] = useState<number | string>(gemstone.weight);
  
  // Dimensions
  const [dimLength, setDimLength] = useState<number | string>(gemstone.dimensions.length);
  const [dimWidth, setDimWidth] = useState<number | string>(gemstone.dimensions.width);
  const [dimDepth, setDimDepth] = useState<number | string>(gemstone.dimensions.depth);
  
  const [finalCut, setFinalCut] = useState(gemstone.cut);
  const [finalClarity, setFinalClarity] = useState(gemstone.clarity);
  const [observations, setObservations] = useState('');
  
  // Real-time loss calculations
  const numericFinalWeight = Number(finalWeight);
  const lossWeight = Math.max(0, gemstone.weight - numericFinalWeight);
  const lossPercentage = gemstone.weight > 0 ? (lossWeight / gemstone.weight) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lapidaryName.trim()) return;

    const newRecord: RecuttingRecord = {
      id: "REC-" + Date.now().toString(36).toUpperCase(),
      date: new Date().toISOString().split('T')[0],
      lapidaryName: lapidaryName,
      initialWeight: gemstone.weight,
      finalWeight: numericFinalWeight,
      lossWeight: Number(lossWeight.toFixed(3)),
      lossPercentage: Number(lossPercentage.toFixed(1)),
      initialDimensions: { ...gemstone.dimensions },
      finalDimensions: {
        length: Number(dimLength),
        width: Number(dimWidth),
        depth: Number(dimDepth)
      },
      initialCut: gemstone.cut,
      finalCut: finalCut,
      initialClarity: gemstone.clarity,
      finalClarity: finalClarity,
      laborCost: Number(laborCost),
      observations: observations.trim() || 'Retaillé avec succès.'
    };

    // Update safety of recuttings list
    const updatedRecuttings = [...(gemstone.recuttings || []), newRecord];

    // Compute updated gemstone properties reflecting the recutting outcome
    const updatedGem: Gemstone = {
      ...gemstone,
      weight: finalWeight,
      dimensions: {
        length: dimLength,
        width: dimWidth,
        depth: dimDepth
      },
      cut: finalCut,
      clarity: finalClarity,
      // Amortize lapidary cost into the asset's total cost price
      costPrice: gemstone.costPrice + laborCost,
      // Increase selling price proportionally to improvement if needed or keep existing
      sellingPrice: gemstone.sellingPrice + (laborCost * 1.5), // estimated joaillerie resale value jump
      description: `${gemstone.description}\n[Retaille ${newRecord.date} par ${lapidaryName} : ${newRecord.initialWeight}ct → ${newRecord.finalWeight}ct (loss ${newRecord.lossPercentage}%). Note: ${newRecord.observations}]`,
      recuttings: updatedRecuttings
    };

    onUpdateGemstone(updatedGem);
    
    // Reset state & hide form
    setShowAddForm(false);
    setLapidaryName('');
    setLaborCost(0);
    setObservations('');
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDeleteRecord = (idToDelete: string) => {
    const recuttings = gemstone.recuttings || [];
    const recToDelete = recuttings.find(r => r.id === idToDelete);
    if (!recToDelete) return;

    const updatedRecuttings = recuttings.filter(r => r.id !== idToDelete);
    
    const updatedGem: Gemstone = { ...gemstone };
    
    // Revert added financial cost
    updatedGem.costPrice = Math.max(0, gemstone.costPrice - recToDelete.laborCost);
    updatedGem.sellingPrice = Math.max(0, gemstone.sellingPrice - (recToDelete.laborCost * 1.5));
    
    // Rollback visual physical characteristics
    if (updatedRecuttings.length > 0) {
      // Revert to the last remaining recutting's final state
      const lastRec = updatedRecuttings[updatedRecuttings.length - 1];
      updatedGem.weight = lastRec.finalWeight;
      updatedGem.dimensions = { ...lastRec.finalDimensions };
      updatedGem.cut = lastRec.finalCut;
      updatedGem.clarity = lastRec.finalClarity;
    } else {
      // No recuttings left: revert stone back to the exact initial state of the deleted recutting
      updatedGem.weight = recToDelete.initialWeight;
      updatedGem.dimensions = { ...recToDelete.initialDimensions };
      updatedGem.cut = recToDelete.initialCut;
      updatedGem.clarity = recToDelete.initialClarity;
    }
    
    updatedGem.recuttings = updatedRecuttings;
    onUpdateGemstone(updatedGem);
    setPendingDeleteId(null);
  };

  return (
    <div className="space-y-4 border-t border-gray-800 pt-5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold font-mono text-gray-400 uppercase flex items-center gap-1.5">
          <Scissors className="h-4 w-4 text-orange-400" />
          <span>Suivi des Retailles & Optimisations</span>
        </h4>
        
        {!showAddForm && (
          <button
            type="button"
            onClick={() => {
              setFinalWeight(gemstone.weight);
              setDimLength(gemstone.dimensions.length);
              setDimWidth(gemstone.dimensions.width);
              setDimDepth(gemstone.dimensions.depth);
              setFinalCut(gemstone.cut);
              setFinalClarity(gemstone.clarity);
              setShowAddForm(true);
            }}
            className="px-2.5 py-1 text-[10px] font-bold font-mono rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Retailler cette pierre</span>
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-[#0b0e16] rounded-xl border border-orange-500/15 p-4 space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-gray-800">
            <span className="text-[10px] font-bold font-mono text-orange-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Entrée d'un ordre de retaille
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[10px] font-mono text-gray-500 hover:text-gray-300"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Lapidary selection */}
            <div>
              <label className="block text-gray-500 font-mono text-[9px] uppercase mb-1">Lapidaire de l'opération *</label>
              <input
                type="text"
                required
                placeholder="Ex: Atelier Gemmolo Paris"
                value={lapidaryName}
                onChange={(e) => setLapidaryName(e.target.value)}
                className="w-full bg-[#141a29]/80 border border-[#232f46] focus:border-[#bda165] focus:ring-1 focus:ring-[#bda165] rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            {/* Lapidary fees */}
            <div>
              <label className="block text-gray-500 font-mono text-[9px] uppercase mb-1">Frais de Lapidairerie (€)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="250"
                  value={laborCost || ''}
                  onChange={(e) => setLaborCost(e.target.value)}
                  className="w-full bg-[#141a29]/80 border border-[#232f46] focus:border-[#bda165] focus:ring-1 focus:ring-[#bda165] rounded-lg pl-6 pr-2.5 py-1.5 text-xs text-white family-mono font-mono"
                />
                <DollarSign className="absolute left-2.5 top-2.5 h-3 w-3 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Real-time Loss Assessment Panel */}
          <div className="bg-[#121824] p-3 rounded-lg border border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-500 font-mono text-[9px] uppercase mb-1">Poids Initial</label>
              <span className="text-white font-semibold font-mono text-sm">{gemstone.weight.toFixed(2)} ct</span>
            </div>
            
            <div>
              <label className="block text-amber-400 font-mono text-[9px] uppercase mb-1">Nouveau Poids après retaille (ct) *</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0.01"
                  max={gemstone.weight}
                  step="0.001"
                  value={finalWeight || ''}
                  onChange={(e) => setFinalWeight(e.target.value)}
                  className="w-full bg-[#1a253a]/50 border border-amber-500/30 focus:border-amber-400 rounded-lg px-2.5 py-1 text-xs text-yellow-400 font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-gray-500 font-mono text-[9px] uppercase block">Perte de matière estimée</span>
              <span className="text-red-400 font-mono font-bold text-xs flex items-center gap-1.5 mt-0.5">
                <Scale className="h-3 w-3" />
                -{lossWeight.toFixed(2)} ct ({lossPercentage.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* New target shape and clarity characteristics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-gray-500 font-mono text-[9px] uppercase mb-1">Nouveau Type de Taille</label>
              <select
                value={finalCut}
                onChange={(e) => setFinalCut(e.target.value)}
                className="w-full bg-[#141a29]/80 border border-[#232f46] rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="Brillant">Brillant</option>
                <option value="Coussin">Coussin</option>
                <option value="Émeraude">Émeraude</option>
                <option value="Ovale">Ovale</option>
                <option value="Poire">Poire</option>
                <option value="Princesse">Princesse</option>
                <option value="Radiant">Radiant</option>
                <option value="Marquise">Marquise</option>
                <option value="Cabochon">Cabochon</option>
                <option value="Brut">Brut</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-500 font-mono text-[9px] uppercase mb-1">Nouvelle Pureté (Grade)</label>
              <select
                value={finalClarity}
                onChange={(e) => setFinalClarity(e.target.value)}
                className="w-full bg-[#141a29]/80 border border-[#232f46] rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="FL">FL (Flawless)</option>
                <option value="IF">IF (Internally Flawless)</option>
                <option value="VVS1">VVS1</option>
                <option value="VVS2">VVS2</option>
                <option value="VS1">VS1</option>
                <option value="VS2">VS2</option>
                <option value="SI1">SI1</option>
                <option value="SI2">SI2</option>
                <option value="I1">I1</option>
                <option value="AAA">AAA (Couleur)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-500 font-mono text-[9px] uppercase mb-1">Nouvelles Dimensions (L x l x E) mm</label>
              <div className="grid grid-cols-3 gap-1">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="L"
                  value={dimLength || ''}
                  onChange={(e) => setDimLength(e.target.value)}
                  className="bg-[#141a29]/80 border border-[#232f46] rounded-lg p-1 text-xs text-white font-mono text-center"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="l"
                  value={dimWidth || ''}
                  onChange={(e) => setDimWidth(e.target.value)}
                  className="bg-[#141a29]/80 border border-[#232f46] rounded-lg p-1 text-xs text-white font-mono text-center"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="E"
                  value={dimDepth || ''}
                  onChange={(e) => setDimDepth(e.target.value)}
                  className="bg-[#141a29]/80 border border-[#232f46] rounded-lg p-1 text-xs text-white font-mono text-center"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-500 font-mono text-[9px] uppercase mb-1">Observations / Rapport Qualité Lapidaire</label>
            <textarea
              rows={2}
              placeholder="Ex: Élimination de la fissure latérale près de la colette. Re-polissage de la table à 57%. Clarté améliorée de SI1 à VS2."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full bg-[#141a29]/80 border border-[#232f46] focus:border-[#bda165] focus:ring-1 focus:ring-[#bda165] rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 rounded-lg"
            >
              Fermer
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-extrabold rounded-lg flex items-center gap-1 shadow-md shadow-orange-500/10"
            >
              <Check className="h-4 w-4" />
              <span>Valider la retaille</span>
            </button>
          </div>
        </form>
      )}

      {/* History log component */}
      <div className="space-y-2">
        <span className="text-gray-500 font-mono text-[9px] uppercase block tracking-wider">
          Registre d'interventions ({gemstone.recuttings?.length || 0})
        </span>

        {!gemstone.recuttings || gemstone.recuttings.length === 0 ? (
          <div className="bg-[#10141f] rounded-xl border border-gray-800/30 p-3 text-center text-gray-500 text-[11px] italic">
            Aucun historique de retaille / repolissage consigné pour cette pierre.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {gemstone.recuttings.map((rec) => (
              <div 
                key={rec.id}
                className="bg-[#111624] border border-[#222d42] hover:border-orange-500/30 rounded-xl p-3 space-y-2 text-[11px] relative transition-colors group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-orange-400 font-mono block text-xs">
                      {rec.id} · {rec.date}
                    </span>
                    <span className="text-gray-400 block">
                      Lapidaire : <b className="text-gray-200">{rec.lapidaryName}</b>
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <div className="text-right">
                      <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-mono font-bold text-[9px] inline-block">
                        -{rec.lossWeight.toFixed(2)} ct (-{rec.lossPercentage.toFixed(1)}%)
                      </span>
                      <span className="block text-[10px] text-gray-400 mt-1">
                        Coût : <b className="font-mono text-white">{rec.laborCost} €</b>
                      </span>
                    </div>
                    
                    {pendingDeleteId === rec.id ? (
                      <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-[10px] animate-fadeIn shrink-0">
                        <span className="text-red-400 font-bold">Confirmer ?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="px-1.5 py-0.5 bg-red-600 text-white rounded font-bold hover:bg-red-500 transition-colors"
                        >
                          Oui
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded hover:text-white transition-colors"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(rec.id)}
                        title="Supprimer cette opération et restaurer les valeurs"
                        className="p-1 px-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 bg-black/40 rounded p-2 gap-2 text-[10px] font-mono border border-gray-800/40">
                  <div>
                    <span className="text-gray-500 uppercase block text-[8px]">Propriétés Avant</span>
                    <span className="text-gray-300 block">{rec.initialWeight.toFixed(2)} ct · {rec.initialCut} · {rec.initialClarity}</span>
                    <span className="text-gray-300 block">
                      {rec.initialDimensions.length}x{rec.initialDimensions.width}x{rec.initialDimensions.depth} mm
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-400 uppercase block text-[8px]">Propriétés Après</span>
                    <span className="text-white font-bold block">{rec.finalWeight.toFixed(2)} ct · {rec.finalCut} · {rec.finalClarity}</span>
                    <span className="text-white block font-bold">
                      {rec.finalDimensions.length}x{rec.finalDimensions.width}x{rec.finalDimensions.depth} mm
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-gray-900/10 rounded border-l-2 border-orange-500/35">
                  <p className="text-gray-300 italic text-[10px] leading-relaxed">
                    "{rec.observations}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
