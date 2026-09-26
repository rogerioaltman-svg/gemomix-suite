/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Supplier } from '../types';
import { Briefcase, X } from 'lucide-react';

interface SupplierFormModalProps {
  supplier: Supplier | null; // null = création
  prefill?: Partial<Supplier>; // valeurs proposées à la création (ex. : lues sur une facture)
  // Retourne false si l'enregistrement a échoué : la fenêtre reste alors ouverte
  onSave: (supplier: Supplier) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

// Fenêtre unique de saisie d'un fournisseur, partagée par l'annuaire, les achats et la fiche pierre
export default function SupplierFormModal({ supplier, prefill, onSave, onClose }: SupplierFormModalProps) {
  const init = { ...(prefill ?? {}), ...(supplier ?? {}) } as Partial<Supplier>;
  const [form, setForm] = useState({
    name: init.name || '',
    contactName: init.contactName || '',
    email: init.email || '',
    phone: init.phone || '',
    address: init.address || '',
    postalCode: init.postalCode || '',
    city: init.city || '',
    country: init.country || 'France',
    vatNumber: init.vatNumber || '',
    notes: init.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;

    const data: Supplier = {
      id: supplier ? supplier.id : `SUP-${Date.now()}`,
      name: form.name.trim(),
      contactName: form.contactName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      postalCode: form.postalCode || undefined,
      city: form.city || undefined,
      country: form.country || 'France',
      vatNumber: form.vatNumber || undefined,
      notes: form.notes || undefined,
      dateAdded: supplier ? supplier.dateAdded : new Date().toISOString()
    };

    setSaving(true);
    const ok = await onSave(data);
    setSaving(false);
    if (ok === false) return;
    onClose();
  };

  const input = 'w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none';
  const label = 'block text-gray-400 text-[10px] font-mono uppercase mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121620] border border-[#232f46] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 bg-[#171d2b] border-b border-[#212a3d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Briefcase className="h-5 w-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              {supplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className={label}>NOM DE L'ENTREPRISE / DU NÉGOCIANT *</label>
            <input
              id="supplier-name-input"
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`${input} focus:border-[#bda165]`}
              placeholder="ex: Antwerp Diamond Wholesale"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>CONTACT PRINCIPAL</label>
              <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={input} placeholder="Prénom & Nom" />
            </div>
            <div>
              <label className={label}>N° TVA / CODE FOURNISSEUR</label>
              <input type="text" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} className={`${input} font-mono`} placeholder="Code ou n° de TVA" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>EMAIL</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} placeholder="contact@fournisseur.com" />
            </div>
            <div>
              <label className={label}>TÉLÉPHONE</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} placeholder="+32 ..." />
            </div>
          </div>

          <div>
            <label className={label}>ADRESSE</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={input} placeholder="Numéro, rue..." />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className={label}>CODE POSTAL</label>
              <input type="text" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className={input} placeholder="2018" />
            </div>
            <div className="col-span-1">
              <label className={label}>VILLE</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} placeholder="Anvers" />
            </div>
            <div className="col-span-1">
              <label className={label}>PAYS</label>
              <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={input} placeholder="France" />
            </div>
          </div>

          <div>
            <label className={label}>OBSERVATIONS</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={`${input} h-16 resize-none`}
              placeholder="Qualité des bruts, délais de livraison, notes douanières..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-[#161c28] hover:bg-gray-800 text-gray-300 rounded-lg cursor-pointer">
              Annuler
            </button>
            <button
              id="supplier-save-button"
              type="submit"
              disabled={saving}
              className="px-5 py-2 font-semibold bg-gradient-to-r from-[#8a733e] to-[#bda165] text-black rounded-lg cursor-pointer disabled:opacity-60"
            >
              Sauvegarder fournisseur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
