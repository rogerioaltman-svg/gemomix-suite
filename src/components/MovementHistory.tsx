/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { StockMovement, StockMovementType } from '../types';
import { ShoppingBag, Receipt, Scissors, SlidersHorizontal, History } from 'lucide-react';

interface MovementHistoryProps {
  entityType: 'gemstone' | 'lot';
  entityId: string;
  compact?: boolean;
}

const TYPE_CONFIG: Record<StockMovementType, { label: string; icon: React.ReactNode; color: string }> = {
  ACHAT: { label: 'Achat', icon: <ShoppingBag className="h-3 w-3" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  VENTE: { label: 'Vente', icon: <Receipt className="h-3 w-3" />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  RETAILLE: { label: 'Retaille', icon: <Scissors className="h-3 w-3" />, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  AJUSTEMENT: { label: 'Ajustement', icon: <SlidersHorizontal className="h-3 w-3" />, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' }
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function MovementHistory({ entityType, entityId, compact = false }: MovementHistoryProps) {
  const [movements, setMovements] = useState<StockMovement[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/movements/${entityType}/${entityId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled && Array.isArray(data)) setMovements(data); })
      .catch(() => { if (!cancelled) setMovements([]); });
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  if (movements === null) {
    return <p className="text-[10px] text-gray-600 italic">Chargement de l'historique…</p>;
  }

  if (movements.length === 0) {
    return <p className="text-[10px] text-gray-600 italic">Aucun mouvement enregistré pour le moment.</p>;
  }

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {movements.map(m => {
        const cfg = TYPE_CONFIG[m.type];
        return (
          <div key={m.id} className={`flex items-start gap-2 border rounded-lg px-2.5 py-2 ${cfg.color}`}>
            <span className="mt-0.5">{cfg.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase font-mono">{cfg.label}</span>
                <span className="text-[9px] text-gray-500 font-mono">{formatDate(m.createdAt)}</span>
              </div>
              {m.notes && <p className="text-[10px] text-gray-300 mt-0.5">{m.notes}</p>}
              <div className="flex gap-3 mt-1 text-[9px] font-mono text-gray-400">
                {m.weight !== undefined && <span>Poids : <b>{m.weight > 0 ? '+' : ''}{m.weight.toFixed(2)} ct</b></span>}
                {m.amount !== undefined && <span>Montant : <b>{m.amount.toLocaleString('fr-FR')} €</b></span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
