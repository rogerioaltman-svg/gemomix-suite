/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Purchase, PurchaseArticle, Lot, Gemstone } from '../types';
import { Printer, X } from 'lucide-react';

// Étiquettes pour imprimante d'étiquettes : une pour la chemise principale (le groupe), une par sous-chemise (sous-lot).
// Le QR code ne contient que la référence (texte) : il se lit avec n'importe quel lecteur, sans dépendre de l'application.

const SIZES = [
  { id: '62x29', label: '62 × 29 mm', w: 62, h: 29 },
  { id: '50x30', label: '50 × 30 mm', w: 50, h: 30 },
  { id: '76x51', label: '76 × 51 mm', w: 76, h: 51 },
  { id: '100x50', label: '100 × 50 mm', w: 100, h: 50 }
] as const;

interface LabelSheetProps {
  purchase?: Purchase;
  articles?: PurchaseArticle[]; // les lignes du groupe (ou la seule ligne, sans groupe)
  lots?: Lot[]; // les sous-lots de ces lignes
  stone?: Gemstone; // mode pierre unique : une seule étiquette, sans chemise ni sous-lots
  onClose: () => void;
}

function Qr({ text, size }: { text: string; size: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { margin: 0, width: 256, errorCorrectionLevel: 'M' }).then(u => { if (alive) setSrc(u); }).catch(() => { /* pas de QR : le texte reste lisible */ });
    return () => { alive = false; };
  }, [text]);
  return src ? <img src={src} alt={`QR ${text}`} style={{ width: `${size}mm`, height: `${size}mm` }} /> : <div style={{ width: `${size}mm`, height: `${size}mm` }} />;
}

export default function LabelSheet({ purchase, articles = [], lots = [], stone, onClose }: LabelSheetProps) {
  const [sizeId, setSizeId] = useState<string>(() => {
    try { return localStorage.getItem('labels.size') || '62x29'; } catch { return '62x29'; }
  });
  const size = SIZES.find(s => s.id === sizeId) ?? SIZES[0];
  const chooseSize = (id: string) => { setSizeId(id); try { localStorage.setItem('labels.size', id); } catch { /* préférence non mémorisée */ } };

  const group = articles[0]?.group;
  const parentRef = purchase ? (group ? `${purchase.reference}/${group}` : `${purchase.reference}`) : '';
  const totalWeight = articles.reduce((s, a) => s + (a.weight || 0), 0);
  const totalQty = articles.reduce((s, a) => s + (a.quantity || 0), 0);
  const totalPrice = articles.reduce((s, a) => s + (a.totalPrice || 0), 0);
  const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [what, setWhat] = useState<'all' | 'main' | 'subs'>('all');
  const qrMm = Math.min(size.h - 6, size.w * 0.38);
  const subLots = [...lots].sort((a, b) => a.reference.localeCompare(b.reference, undefined, { numeric: true }));

  return (
    <div id="label-overlay" className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-auto p-4" onClick={onClose}>
      <style>{`
        @media print {
          @page { size: ${size.w}mm ${size.h}mm; margin: 0; }
          body * { visibility: hidden !important; }
          #label-print-area, #label-print-area * { visibility: visible !important; }
          #label-print-area { position: absolute; left: 0; top: 0; }
          .gm-label { break-after: page; border: none !important; margin: 0 !important; }
        }
      `}</style>
      <div className="bg-[#121620] border border-[#212a3d] rounded-xl p-4 w-full max-w-3xl space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
          <strong className="text-sm text-white">{stone ? `Étiquette — pierre ${stone.reference}` : `Étiquettes — chemise ${parentRef}`}</strong>
          <div className="flex flex-wrap items-center gap-2">
            {!stone && <select id="label-what" value={what} onChange={e => setWhat(e.target.value as any)} className="px-2 py-1 bg-[#171e2c] border border-[#27354d] rounded">
              <option value="all">Chemise + sous-chemises</option>
              <option value="main">Chemise principale seule</option>
              <option value="subs">Sous-chemises seules</option>
            </select>}
            <select id="label-size" value={sizeId} onChange={e => chooseSize(e.target.value)} className="px-2 py-1 bg-[#171e2c] border border-[#27354d] rounded">
              {SIZES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button type="button" id="btn-print-labels" onClick={() => window.print()} className="px-3 py-1.5 bg-[#bda165] text-black font-bold rounded flex items-center gap-1"><Printer className="h-3.5 w-3.5" /> Imprimer</button>
            <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-white" aria-label="Fermer"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <p className="text-[11px] text-gray-500">Choisissez votre imprimante d'étiquettes dans la fenêtre d'impression : le format ci-dessus est appliqué au papier.</p>

        <div id="label-print-area" className="flex flex-wrap gap-3 bg-gray-300 p-3 rounded">
          {stone && (
            <div className="gm-label bg-white text-black flex items-center gap-[2mm] p-[2mm] border border-gray-500" style={{ width: `${size.w}mm`, height: `${size.h}mm`, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
              <Qr text={stone.reference} size={qrMm} />
              <div style={{ fontSize: '2.6mm', lineHeight: 1.25, minWidth: 0 }}>
                <div style={{ fontSize: '4mm', fontWeight: 700 }}>{stone.reference}</div>
                <div>{stone.type}{stone.cut ? ` · ${stone.cut}` : ''}</div>
                <div><b>{stone.weight.toFixed(2)} ct</b>{[stone.color, stone.clarity].filter(Boolean).length ? ` · ${[stone.color, stone.clarity].filter(Boolean).join(' ')}` : ''}</div>
                {stone.certificate?.authority && stone.certificate.authority !== 'Aucun' && stone.certificate.authority !== 'Sans' && <div>{stone.certificate.authority} {stone.certificate.number}</div>}
                {purchase && <div>Achat {purchase.reference}{purchase.supplierReference ? ` · Fact. ${purchase.supplierReference}` : ''}</div>}
              </div>
            </div>
          )}
          {!stone && what !== 'subs' && purchase && (
            <div className="gm-label bg-white text-black flex items-center gap-[2mm] p-[2mm] border border-gray-500" style={{ width: `${size.w}mm`, height: `${size.h}mm`, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
              <Qr text={parentRef} size={qrMm} />
              <div style={{ fontSize: '2.6mm', lineHeight: 1.25, minWidth: 0 }}>
                <div style={{ fontSize: '4mm', fontWeight: 700 }}>{parentRef}</div>
                <div>Achat {purchase.reference}{group ? ` · Groupe ${group}` : ''}</div>
                {purchase.supplierReference && <div>Fact. {purchase.supplierReference}</div>}
                <div><b>{totalWeight.toFixed(2)} ct</b>{totalQty ? ` · ${totalQty} pcs` : ''}</div>
                <div>{eur(totalPrice)} €</div>
              </div>
            </div>
          )}
          {!stone && what !== 'main' && subLots.map(l => (
            <div key={l.id} className="gm-label bg-white text-black flex items-center gap-[2mm] p-[2mm] border border-gray-500" style={{ width: `${size.w}mm`, height: `${size.h}mm`, boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
              <Qr text={l.reference} size={qrMm} />
              <div style={{ fontSize: '2.6mm', lineHeight: 1.25, minWidth: 0 }}>
                <div style={{ fontSize: '4mm', fontWeight: 700 }}>{l.reference}</div>
                <div><b>{l.weight.toFixed(2)} ct</b>{l.quantity ? ` · ${l.quantity} pcs` : ''}</div>
                <div>Chemise : {parentRef}</div>
                {purchase && <div>Achat {purchase.reference}{purchase.supplierReference ? ` · Fact. ${purchase.supplierReference}` : ''}</div>}
              </div>
            </div>
          ))}
          {!stone && what !== 'main' && subLots.length === 0 && <p className="text-xs text-gray-700">Aucun sous-lot trié pour l'instant.</p>}
        </div>
      </div>
    </div>
  );
}
