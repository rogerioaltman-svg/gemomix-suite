/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Bijou, Gemstone } from '../types';
import { Sparkles, Plus, Trash2, Hammer, X, Check, Diamond, AlertTriangle } from 'lucide-react';

interface BijouManagerProps {
  bijoux: Bijou[];
  gemstones: Gemstone[];
  onSaveBijou: (b: Bijou) => Promise<void> | void;
  onDeleteBijou: (id: string) => Promise<void> | void;
  onDecomposeBijou: (id: string) => Promise<void> | void;
}

const STATUS_COLORS: Record<Bijou['status'], string> = {
  Disponible: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Réservé: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Vendu: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Confié: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Décomposé: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
};

const emptyForm = {
  reference: '',
  description: '',
  metal: '',
  metalWeight: '0',
  costPrice: '0',
  sellingPrice: '0',
  status: 'Disponible' as Bijou['status'],
  notes: ''
};

export default function BijouManager({ bijoux, gemstones, onSaveBijou, onDeleteBijou, onDecomposeBijou }: BijouManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBijou, setEditingBijou] = useState<Bijou | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedGemIds, setSelectedGemIds] = useState<string[]>([]);
  const [gemSearch, setGemSearch] = useState('');
  const [decomposeTarget, setDecomposeTarget] = useState<Bijou | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bijou | null>(null);

  // Une pierre est disponible pour un (nouveau) bijou tant qu'elle n'est pas
  // déjà sertie dans un autre bijou non décomposé, et qu'elle n'est pas vendue.
  const mountedElsewhere = useMemo(() => {
    const set = new Set<string>();
    bijoux.forEach(b => {
      if (b.status === 'Décomposé') return;
      if (editingBijou && b.id === editingBijou.id) return;
      b.gemstoneIds.forEach(id => set.add(id));
    });
    return set;
  }, [bijoux, editingBijou]);

  const availableGems = useMemo(() => {
    return gemstones.filter(g =>
      g.status !== 'Vendu' &&
      !mountedElsewhere.has(g.id) &&
      (gemSearch.trim() === '' ||
        g.reference.toLowerCase().includes(gemSearch.toLowerCase()) ||
        g.type.toLowerCase().includes(gemSearch.toLowerCase()))
    );
  }, [gemstones, mountedElsewhere, gemSearch]);

  const gemById = useMemo(() => {
    const map = new Map<string, Gemstone>();
    gemstones.forEach(g => map.set(g.id, g));
    return map;
  }, [gemstones]);

  const handleOpenNew = () => {
    setEditingBijou(null);
    setForm(emptyForm);
    setSelectedGemIds([]);
    setGemSearch('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Bijou) => {
    setEditingBijou(b);
    setForm({
      reference: b.reference,
      description: b.description || '',
      metal: b.metal || '',
      metalWeight: String(b.metalWeight ?? 0),
      costPrice: String(b.costPrice ?? 0),
      sellingPrice: String(b.sellingPrice ?? 0),
      status: b.status,
      notes: b.notes || ''
    });
    setSelectedGemIds(b.gemstoneIds || []);
    setGemSearch('');
    setIsModalOpen(true);
  };

  const toggleGem = (id: string) => {
    setSelectedGemIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reference.trim()) return;
    const bijou: Bijou = {
      id: editingBijou?.id || `bij-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      reference: form.reference.trim(),
      description: form.description.trim(),
      metal: form.metal.trim(),
      metalWeight: parseFloat(form.metalWeight) || 0,
      gemstoneIds: selectedGemIds,
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      status: form.status,
      dateAdded: editingBijou?.dateAdded || new Date().toISOString(),
      notes: form.notes.trim() || undefined
    };
    await onSaveBijou(bijou);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-[#121620] border border-[#212a3d] rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-6 border-b border-[#212a3d] pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#bda165]/10 text-[#bda165] rounded-xl">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-sans text-white">Bijoux composés</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-lg">
                Montures composées d'une ou plusieurs pierres de l'inventaire. La décomposition
                libère individuellement chaque pierre sertie, qui redevient disponible en stock.
              </p>
            </div>
          </div>
          <button
            id="bijou-new-button"
            onClick={handleOpenNew}
            className="px-4 py-2.5 bg-[#bda165] hover:bg-[#cdb47a] text-black text-xs font-bold rounded-lg flex items-center gap-2 shrink-0 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nouveau bijou
          </button>
        </div>

        {bijoux.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="h-10 w-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500 italic">Aucun bijou composé pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bijoux.map(b => (
              <div key={b.id} className="bg-[#171e2c] border border-[#27354d] rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{b.reference}</h3>
                    <p className="text-xs text-gray-400">{b.description}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                </div>

                <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span>{b.metal || '—'} · {b.metalWeight} g</span>
                  <span>Achat {b.costPrice} € · Vente {b.sellingPrice} €</span>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#b4985c] mb-1.5 flex items-center gap-1">
                    <Diamond className="h-3 w-3" /> Pierres serties ({b.gemstoneIds.length})
                  </p>
                  {b.gemstoneIds.length === 0 ? (
                    <p className="text-[11px] text-gray-600 italic">Aucune pierre rattachée.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {b.gemstoneIds.map(gid => {
                        const g = gemById.get(gid);
                        return (
                          <span key={gid} className="text-[10px] bg-[#0f1420] border border-[#27354d] text-gray-300 px-2 py-1 rounded-md">
                            {g ? `${g.reference} · ${g.type} (${g.weight} ct)` : gid}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#212a3d]">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    disabled={b.status === 'Décomposé'}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-[#0f1420] hover:bg-[#1a2333] text-gray-300 border border-[#27354d] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => setDecomposeTarget(b)}
                    disabled={b.status === 'Décomposé' || b.gemstoneIds.length === 0}
                    className="px-3 py-1.5 text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 border border-amber-500/20 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Hammer className="h-3.5 w-3.5" /> Décomposer
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="ml-auto px-3 py-1.5 text-[11px] font-semibold bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="bg-[#121622] border border-[#232f48] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-sans">{editingBijou ? 'Modifier le bijou' : 'Nouveau bijou'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] text-gray-400 block mb-1">Référence</label>
                <input
                  id="bijou-ref-input"
                  required
                  value={form.reference}
                  onChange={e => setForm({ ...form, reference: e.target.value })}
                  className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-gray-400 block mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="ex: Bague solitaire monture platine"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Métal</label>
                <input
                  value={form.metal}
                  onChange={e => setForm({ ...form, metal: e.target.value })}
                  className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
                  placeholder="Or, Argent, Platine..."
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Poids métal (g)</label>
                <input
                  type="number" step="0.01"
                  value={form.metalWeight}
                  onChange={e => setForm({ ...form, metalWeight: e.target.value })}
                  className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Prix d'achat (€)</label>
                <input
                  type="number" step="0.01"
                  value={form.costPrice}
                  onChange={e => setForm({ ...form, costPrice: e.target.value })}
                  className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Prix de vente (€)</label>
                <input
                  type="number" step="0.01"
                  value={form.sellingPrice}
                  onChange={e => setForm({ ...form, sellingPrice: e.target.value })}
                  className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] text-gray-400 block mb-1">Statut</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as Bijou['status'] })}
                  className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option>Disponible</option>
                  <option>Réservé</option>
                  <option>Vendu</option>
                  <option>Confié</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block mb-1.5">
                Pierres à sertir ({selectedGemIds.length} sélectionnée{selectedGemIds.length > 1 ? 's' : ''})
              </label>
              <input
                value={gemSearch}
                onChange={e => setGemSearch(e.target.value)}
                placeholder="Rechercher par référence ou type..."
                className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white mb-2"
              />
              <div className="max-h-48 overflow-y-auto border border-[#27354d] rounded-lg divide-y divide-[#212a3d]">
                {availableGems.length === 0 ? (
                  <p className="text-[11px] text-gray-600 italic p-3">Aucune pierre disponible pour rattachement.</p>
                ) : (
                  availableGems.map(g => {
                    const checked = selectedGemIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 cursor-pointer hover:bg-[#171e2c]">
                        <input type="checkbox" checked={checked} onChange={() => toggleGem(g.id)} className="accent-[#bda165]" />
                        <span>{g.reference} · {g.type} · {g.weight} ct</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full bg-[#0f1420] border border-[#27354d] rounded-lg px-3 py-2 text-sm text-white resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-[#1b2333] hover:bg-[#202a3c] text-xs font-semibold text-gray-400 hover:text-white rounded-lg border border-gray-800 transition">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-[#bda165] hover:bg-[#cdb47a] text-xs font-bold text-black rounded-lg flex items-center gap-1.5 transition">
                <Check className="h-3.5 w-3.5" /> Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {decomposeTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121622] border border-[#232f48] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                <Hammer className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">Décomposer le bijou</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Les {decomposeTarget.gemstoneIds.length} pierre(s) sertie(s) dans "{decomposeTarget.reference}"
                  seront libérées et repasseront au statut Disponible dans l'inventaire. Cette action est
                  définitive et journalisée dans l'historique des mouvements.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button onClick={() => setDecomposeTarget(null)} className="px-4 py-2 bg-[#1b2333] hover:bg-[#202a3c] text-xs font-semibold text-gray-400 hover:text-white rounded-lg border border-gray-800 transition">
                Annuler
              </button>
              <button
                onClick={async () => { await onDecomposeBijou(decomposeTarget.id); setDecomposeTarget(null); }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black rounded-lg transition"
              >
                Décomposer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#121622] border border-[#232f48] rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 text-red-500 rounded-lg shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">Supprimer le bijou</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Le bijou "{deleteTarget.reference}" sera retiré. Vous pourrez le restaurer depuis la
                  Corbeille à tout moment.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 bg-[#1b2333] hover:bg-[#202a3c] text-xs font-semibold text-gray-400 hover:text-white rounded-lg border border-gray-800 transition">
                Annuler
              </button>
              <button
                onClick={async () => { await onDeleteBijou(deleteTarget.id); setDeleteTarget(null); }}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-xs font-bold text-white rounded-lg transition"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
