/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import PageHeader, { btnPrimary, btnSecondary } from './PageHeader';
import { Gemstone, CompanySettings } from '../types';
import { Award, Printer, Shield, Eye, Gem, ArrowRight, HelpCircle } from 'lucide-react';

interface CertificateLabProps {
  gemstones: Gemstone[];
  companySettings?: CompanySettings | null;
  initialSelectedRef?: string; // Reçoit l'état depuis App.tsx
  onClearInitialRef?: () => void; // Nettoie l'état après sélection
}

export default function CertificateLab({ gemstones, companySettings, initialSelectedRef, onClearInitialRef }: CertificateLabProps) {
  const [selectedRef, setSelectedRef] = useState<string>('');

  // Synchronise le composant si une référence est injectée à la volée
  useEffect(() => {
    if (initialSelectedRef) {
      setSelectedRef(initialSelectedRef);
      if (onClearInitialRef) onClearInitialRef();
    } else if (!selectedRef && gemstones.length > 0) {
      setSelectedRef(gemstones[0].reference || '');
    }
  }, [initialSelectedRef, gemstones, selectedRef, onClearInitialRef]);

  const activeGem = gemstones.find(g => g.reference === selectedRef) || gemstones[0];

  const handlePrint = () => {
    window.print();
  };

  if (!activeGem) {
    return (
      <div className="space-y-6" id="certificate-tab">
        <PageHeader
          title="Fiche pierre"
          description="Fiche descriptive de la pierre, à imprimer et à joindre à la vente. Ce n'est pas un rapport de laboratoire."
        />
        <div className="bg-[#121620] border border-[#212a3d] p-8 text-center text-gray-400 rounded-xl">
          <HelpCircle className="h-12 w-12 mx-auto text-gray-600 mb-3" />
          <p>Veuillez d'abord enregistrer ou lister des pierres pour pouvoir imprimer une fiche descriptive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="certificate-tab">
      <PageHeader
        className="no-print"
        title="Fiche pierre"
        description="Fiche descriptive de la pierre, à imprimer et à joindre à la vente. Ce n'est pas un rapport de laboratoire."
        actions={
          <>
            <select 
            id="certify-stone-select"
            value={selectedRef}
            onChange={(e) => setSelectedRef(e.target.value)}
            className="px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] text-yellow-400 font-mono rounded select-none cursor-pointer"
          >
            {gemstones.map(g => (
              <option key={g.id} value={g.reference}>{g.reference} - {g.type} ({g.weight} ct)</option>
            ))}
          </select>
            <button 
            id="btn-print-doc"
            onClick={handlePrint}
            className={btnPrimary}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimer</span>
          </button>
          </>
        }
      />

      <div className="flex justify-center bg-[#090b10] py-6 rounded-xl overflow-x-auto no-print">
        <div 
          id="printable-report-card"
          className="print-report w-[780px] bg-white text-gray-900 border-[14px] border-double border-[#b4985c] p-10 font-serif relative shrink-0 shadow-2xl"
        >
          <div className="absolute inset-0 bg-repeat opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0V0zm20 20h20v20H20V20z' fill='%23b4985c' fill-opacity='.15' fill-rule='evenodd'%3E%3C/path%3E%3C/svg%3E")` }}></div>

          <div className="text-center pb-4 border-b-2 border-[#b4985c] relative">
            <span className="absolute top-0 right-0 font-mono text-[10px] text-gray-400">Réf : {activeGem.reference}</span>
            <h1 className="text-3xl font-extrabold tracking-widest text-[#0a251c] font-serif uppercase">
              {companySettings?.name || "GemoPhy Paris"}
            </h1>
            <h2 className="text-[10px] tracking-[4px] text-[#8a733e] font-sans uppercase mt-1">Négoce de pierres précieuses</h2>
            <p className="text-[9px] text-gray-500 font-sans mt-0.5">Document commercial établi par le vendeur — ne constitue pas un rapport de laboratoire gemmologique</p>
          </div>

          <div className="text-center my-6">
            <h3 className="text-lg font-bold italic tracking-wider text-emerald-950">FICHE DESCRIPTIVE DE PIERRE PRÉCIEUSE</h3>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-3 font-sans">
              <h4 className="text-[11px] font-bold text-[#8a733e] uppercase tracking-wide border-b border-gray-200 pb-1 flex items-center gap-1">
                <Gem className="h-3 w-3 text-emerald-700" />
                <span>Description de la Gemme</span>
              </h4>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Variété Minérale :</span>
                <span className="font-bold text-gray-900">{activeGem.type}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Poids de la Gemme :</span>
                <span className="font-bold text-gray-900">{activeGem.weight.toFixed(2)} cts (Carats)</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Forme de Taille :</span>
                <span className="font-bold text-gray-900">{activeGem.cut}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Degré de Couleur :</span>
                <span className="font-bold text-gray-900">{activeGem.color}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Pureté (Loupe 10x) :</span>
                <span className="font-bold text-gray-900">{activeGem.clarity}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Dimensions :</span>
                <span className="font-mono text-xs">{activeGem.dimensions.length} × {activeGem.dimensions.width} × {activeGem.dimensions.depth} mm</span>
              </div>
            </div>

            <div className="space-y-3 font-sans">
              <h4 className="text-[11px] font-bold text-[#8a733e] uppercase tracking-wide border-b border-gray-200 pb-1 flex items-center gap-1">
                <Shield className="h-3 w-3 text-emerald-700" />
                <span>Caractéristiques physiques</span>
              </h4>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Indice de Réfraction :</span>
                <span className="font-mono text-gray-900">{activeGem.refractiveIndex}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Gravité Spécifique (SG) :</span>
                <span className="font-mono text-gray-900">{activeGem.specificGravity.toFixed(2)} g/cm³</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Traitement :</span>
                <span className="font-bold text-amber-800 text-xs">{activeGem.treatment}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Origine Géographique :</span>
                <span className="font-bold text-gray-900">{activeGem.origin}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Certificat de laboratoire :</span>
                <span className="font-mono text-gray-900 font-bold">{activeGem.certificate.authority} - {activeGem.certificate.number}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-dotted border-gray-100">
                <span className="text-gray-500">Prix indicatif :</span>
                <span className="font-semibold text-emerald-950 font-mono text-xs">{activeGem.sellingPrice.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4 font-sans text-xs">
            <h4 className="text-[11px] font-bold text-[#8a733e] uppercase tracking-wide border-b border-gray-200 pb-1">
              Description
            </h4>
            <p className="font-serif italic text-xs leading-relaxed text-gray-700 bg-gray-50 p-4 border border-gray-100 rounded">
              "{activeGem.description}"
            </p>
          </div>

          {activeGem.inclusions && activeGem.inclusions.length > 0 && (
            <div className="mt-4 font-sans text-xs">
              <span className="block font-semibold text-[#8a733e] text-[10px] uppercase tracking-wider mb-1">Inclusions :</span>
              <div className="flex flex-wrap gap-1.5">
                {activeGem.inclusions.map((inc, index) => (
                  <span key={index} className="bg-[#b4985c]/10 text-emerald-900 border border-[#b4985c]/20 hover:bg-[#b4985c]/15 px-2 py-0.5 rounded text-[10px] font-mono">
                    • {inc}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-end font-sans text-[10px] text-gray-500">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-gray-200 border-2 border-gray-300 rounded flex items-center justify-center text-[7px] text-center mb-1 text-gray-600 font-mono">
                [ {companySettings?.name || "GemoPhy"} ]
              </div>
              <span>Cachet</span>
            </div>
            <div className="text-center">
              <p>Fiche établie à {companySettings?.city || "Paris"} le : {new Date().toLocaleDateString('fr-FR')}</p>
              
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="w-36 border-t border-gray-400 mt-10 pt-1 text-center font-bold text-[#8a733e]">
                Le vendeur
              </div>
              <span className="text-[9px] italic text-gray-400">{companySettings?.name || "Dr. Aurélien GemoPhy"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}