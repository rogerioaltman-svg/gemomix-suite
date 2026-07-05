/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { MINERALS_DATABASE } from '../data';
import { Search, Flame, Sliders, Hash, Layers, HelpCircle, AlertTriangle } from 'lucide-react';

export default function IdentificationLab() {
  const [targetRI, setTargetRI] = useState<string>('1.76');
  const [targetSG, setTargetSG] = useState<string>('4.00');
  const [tolerance, setTolerance] = useState<number>(0.02);

  // Compute matching candidate minerals
  const matchingMinerals = useMemo(() => {
    const riNum = parseFloat(targetRI) || 0;
    const sgNum = parseFloat(targetSG) || 0;

    if (riNum === 0 && sgNum === 0) return [];

    return MINERALS_DATABASE.map(min => {
      // Calculate RI scores
      let riScore = 0;
      if (riNum > 0) {
        // Is the target within range?
        const minVal = min.refractiveIndexMin - tolerance;
        const maxVal = min.refractiveIndexMax + tolerance;
        if (riNum >= minVal && riNum <= maxVal) {
          riScore = 1;
        } else {
          // Calculate closeness percentage
          const dist = Math.min(Math.abs(riNum - min.refractiveIndexMin), Math.abs(riNum - min.refractiveIndexMax));
          riScore = Math.max(0, 1 - (dist / 0.1)); // drops to 0 after 0.1 distance
        }
      } else {
        riScore = 1; // if skipped, assume perfect score
      }

      // Calculate SG scores
      let sgScore = 0;
      if (sgNum > 0) {
        const minVal = min.specificGravityMin - (tolerance * 2); // Density fluctuates slightly more
        const maxVal = min.specificGravityMax + (tolerance * 2);
        if (sgNum >= minVal && sgNum <= maxVal) {
          sgScore = 1;
        } else {
          const dist = Math.min(Math.abs(sgNum - min.specificGravityMin), Math.abs(sgNum - min.specificGravityMax));
          sgScore = Math.max(0, 1 - (dist / 0.4)); // drops to 0 after 0.4 distance
        }
      } else {
        sgScore = 1; // if skipped, assume perfect score
      }

      const totalPercentage = Math.round(((riScore + sgScore) / 2) * 100);

      return {
        ...min,
        confidence: totalPercentage
      };
    })
    .filter(m => m.confidence > 50)
    .sort((a, b) => b.confidence - a.confidence);

  }, [targetRI, targetSG, tolerance]);

  return (
    <div className="bg-[#121620] border border-[#212a3d] rounded-xl overflow-hidden shadow-2xl" id="identification-tab">
      <div className="p-5 border-b border-[#212a3d] bg-[#171d2b]">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🔍 Laboratoire de Caractérisation & Identification</span>
        </h2>
        <p className="text-xs text-gray-400">Déterminez l'espèce minérale d'une gemme brute ou taillée d'après ses propriétés optiques et physiques.</p>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: interactive analyzers */}
        <div className="space-y-4 lg:col-span-1 bg-[#111520] p-4 rounded-xl border border-[#212a3d]">
          <h3 className="text-xs font-bold font-mono text-[#b4985c] uppercase border-b border-gray-800 pb-1.5 flex items-center gap-1.5">
            <Sliders className="h-4 w-4" />
            <span>Saisie des Mesures Physiques</span>
          </h3>

          {/* RI Input */}
          <div className="space-y-1">
            <label className="block text-gray-300 text-xs font-mono uppercase tracking-wider">
              1. Indice de Réfraction (IR / RI)
            </label>
            <div className="flex gap-2">
              <input 
                id="target-ri"
                type="number" 
                step="0.001"
                min="1.300"
                max="2.800"
                value={targetRI}
                onChange={(e) => setTargetRI(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-[#171e2c] border border-[#27354d] rounded-lg text-white font-mono text-center focus:outline-none focus:border-[#b4985c]"
                placeholder="ex: 1.76"
              />
            </div>
            <p className="text-[10px] text-gray-500">Mesuré au réfractomètre (ex: 1.54 pour le Quartz, 1.76 pour le Saphir, 2.417 pour le Diamant)</p>
          </div>

          <div className="hr-separator border-b border-gray-800 my-2" />

          {/* SG Input */}
          <div className="space-y-1">
            <label className="block text-gray-300 text-xs font-mono uppercase tracking-wider">
              2. Densité Spécifique (SG)
            </label>
            <div className="flex gap-2">
              <input 
                id="target-sg"
                type="number" 
                step="0.01"
                min="1.0"
                max="6.0"
                value={targetSG}
                onChange={(e) => setTargetSG(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-[#171e2c] border border-[#27354d] rounded-lg text-white font-mono text-center focus:outline-none focus:border-[#b4985c]"
                placeholder="ex: 4.00"
              />
            </div>
            <p className="text-[10px] text-gray-500">Mesurée par balance hydrostatique (ex: 2.71 pour le Béryl, 4.01 pour l'Oxyde d'Alumine)</p>
          </div>

          <div className="hr-separator border-b border-gray-800 my-2" />

          {/* Tolerancy selector */}
          <div className="space-y-1">
            <label className="block text-gray-300 text-xs font-mono uppercase tracking-wider">
              Marge de Tolérance optique
            </label>
            <select 
              id="tolerance"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-gray-300 rounded-lg focus:outline-none"
            >
              <option value="0.01">Stricte (± 0.01) - Idéal pour réfractomètre calibré</option>
              <option value="0.025">Moyenne (± 0.025) - Conseillé en pratique</option>
              <option value="0.05">Large (± 0.05) - Brutes ou instruments de terrain</option>
            </select>
          </div>

          {/* Diagnostic reminders info */}
          <div className="bg-yellow-500/5 rounded-lg border border-yellow-500/10 p-3 text-xs text-amber-500 flex gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="leading-relaxed">
              <b>Mémo de discrimination :</b> Pour discriminer un simulant synthétique (ex: Zircone cubique) d'un Diamant, un test de conductivité thermique ou thermique-réfringence reste requis.
            </span>
          </div>
        </div>

        {/* Right pane: matched results lists */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold font-mono text-gray-400 uppercase border-b border-gray-800 pb-1.5 flex items-center justify-between">
            <span>Resultats du Moteur d'Identification</span>
            <span className="text-[10px] text-gray-500 font-normal">Trié par taux de confiance descendante</span>
          </h3>

          {matchingMinerals.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#141924] rounded-xl border border-dashed border-[#242f44]">
              <HelpCircle className="h-12 w-12 text-gray-600 mb-3" />
              <p className="text-sm font-mono text-gray-500 text-center">
                Saisissez des propriétés physiques valides. <br /> Par exemple, entrez IR = 1.76 et Densité = 4.0 pour identifier le Saphir / Rubis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchingMinerals.map((item, index) => (
                <div 
                  key={index}
                  className="bg-[#141924] border border-[#232f46] rounded-xl p-4 hover:border-amber-500/40 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{item.name}</h4>
                      <p className="text-gray-500 font-mono text-[10px] mt-0.5">{item.chemicalFormula}</p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-500/10">
                      {item.confidence}% Conf.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div>
                      <span className="text-gray-500 block">Indice de réfraction :</span>
                      <span className="font-mono text-gray-300 font-semibold">{item.refractiveIndexMin} - {item.refractiveIndexMax}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Densité (SG) :</span>
                      <span className="font-mono text-gray-300 font-semibold">{item.specificGravityMin} - {item.specificGravityMax} g/cm³</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Dureté de Mohs :</span>
                      <span className="text-amber-400 font-mono font-bold">{item.hardness} Mohs</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Système Cristallin :</span>
                      <span className="text-gray-300 font-mono">{item.crystalSystem}</span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-gray-800 pt-3">
                    <span className="text-[10px] text-[#ffd37a] uppercase font-mono tracking-wider font-bold">Inclusions de diagnostic (Diagnostic)</span>
                    <ul className="mt-1 list-disc list-inside text-[11px] text-gray-400 space-y-0.5">
                      {item.diagnosticInclusions.map((inc, i) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-gray-400 text-[11px] mt-3 leading-relaxed bg-[#0f121a] p-2 rounded italic border border-gray-800">
                    "{item.description}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
