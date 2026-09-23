/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TrashItem, TrashEntityType } from '../types';
import { Trash2, RotateCcw, Diamond, ShoppingBag, Layers, Truck, Users, Receipt, Gem, Inbox, Sparkles } from 'lucide-react';

interface TrashManagerProps {
  items: TrashItem[];
  onRestore: (type: TrashEntityType, id: string) => void;
}

const TYPE_LABELS: Record<TrashEntityType, string> = {
  gemstone: 'Pierres',
  purchase: 'Achats',
  lot: 'Lots de tri',
  supplier: 'Fournisseurs',
  client: 'Clients',
  salesInvoice: 'Factures de vente',
  priceGuideEntry: "Paliers du barème d'estimation",
  bijou: 'Bijoux'
};

const TYPE_ICONS: Record<TrashEntityType, React.ReactNode> = {
  gemstone: <Diamond className="h-4 w-4" />,
  purchase: <ShoppingBag className="h-4 w-4" />,
  lot: <Layers className="h-4 w-4" />,
  supplier: <Truck className="h-4 w-4" />,
  client: <Users className="h-4 w-4" />,
  salesInvoice: <Receipt className="h-4 w-4" />,
  priceGuideEntry: <Gem className="h-4 w-4" />,
  bijou: <Sparkles className="h-4 w-4" />
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

export default function TrashManager({ items, onRestore }: TrashManagerProps) {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const grouped = items.reduce<Record<string, TrashItem[]>>((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});

  const handleRestore = async (item: TrashItem) => {
    setRestoringId(item.id);
    await onRestore(item.type, item.id);
    setRestoringId(null);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn mt-6">
      <div className="bg-[#121620] border border-[#212a3d] rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6 border-b border-[#212a3d] pb-6">
          <div className="p-3 bg-[#bda165]/10 text-[#bda165] rounded-xl">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-sans text-white">Corbeille</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-lg">
              Rien n'est jamais supprimé définitivement dans GemoMix Suite. Tout élément retiré
              (pierre, achat, lot, fournisseur, client, facture, palier du barème) reste consultable
              et restaurable ici, sans limite de durée.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-10 w-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 italic">La corbeille est vide pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(Object.keys(grouped) as TrashEntityType[]).map(type => (
              <div key={type}>
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#b4985c] mb-2 flex items-center gap-1.5">
                  {TYPE_ICONS[type]} {TYPE_LABELS[type]} ({grouped[type].length})
                </h3>
                <div className="space-y-1.5">
                  {grouped[type].map(item => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center justify-between gap-3 bg-[#171e2c] border border-[#27354d] rounded-lg px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white block truncate">{item.label}</span>
                        <span className="text-[10px] text-gray-500 block truncate">
                          {item.detail && <>{item.detail} · </>}
                          Archivé le {formatDate(item.deletedAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestore(item)}
                        disabled={restoringId === item.id}
                        className="shrink-0 px-3 py-1.5 text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {restoringId === item.id ? 'Restauration…' : 'Restaurer'}
                      </button>
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
