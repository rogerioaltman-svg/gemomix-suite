/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client } from '../types';
import { Users, X } from 'lucide-react';

interface ClientFormModalProps {
  client: Client | null; // null = création
  // Retourne false si l'enregistrement a échoué : la fenêtre reste alors ouverte
  onSave: (client: Client) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

// Fenêtre unique de saisie d'un client, partagée par « Tiers & CSV » et la Facturation
export default function ClientFormModal({ client, onSave, onClose }: ClientFormModalProps) {
  const [form, setForm] = useState({
    name: client?.name || '',
    contactName: client?.contactName || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    postalCode: client?.postalCode || '',
    country: client?.country || 'France',
    vatNumber: client?.vatNumber || '',
    notes: client?.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;

    const data: Client = {
      id: client ? client.id : `CLI-${Date.now()}`,
      name: form.name.trim(),
      contactName: form.contactName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      postalCode: form.postalCode || undefined,
      country: form.country || 'France',
      vatNumber: form.vatNumber || undefined,
      notes: form.notes || undefined,
      dateAdded: client ? client.dateAdded : new Date().toISOString()
    };

    setSaving(true);
    const ok = await onSave(data);
    setSaving(false);
    if (ok === false) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121620] border border-[#232f46] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 bg-[#171d2b] border-b border-[#212a3d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              {client ? 'Modifier le client' : 'Nouveau client'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">RAISON SOCIALE / NOM COMPLET *</label>
            <input
              id="client-name-input"
              type="text"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none focus:border-[#bda165]"
              placeholder="ex: Atelier Joaillier Paris SAS"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">CONTACT PRINCIPAL</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                placeholder="Prénom & Nom"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">NUMÉRO DE TVA</label>
              <input
                type="text"
                value={form.vatNumber}
                onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-[#e0b760] font-mono rounded-lg focus:outline-none"
                placeholder="FRxxxxxxxxxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">EMAIL DE CONTACT</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                placeholder="contact@client.com"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">TÉLÉPHONE DIRECT</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                placeholder="+33 6 ..."
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">ADRESSE DE LEURS LOCAUX</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
              placeholder="Numéro, rue, appartement..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">CODE POSTAL</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                placeholder="75001"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">VILLE</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                placeholder="Paris"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">PAYS</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none"
                placeholder="France"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-[10px] font-mono uppercase mb-1">OBSERVATIONS</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 bg-[#171e2c] border border-[#27354d] text-white rounded-lg focus:outline-none h-16 resize-none"
              placeholder="Préférence de taille, calibrage spécifique récurrent..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#161c28] hover:bg-gray-800 text-gray-300 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              id="client-save-button"
              type="submit"
              disabled={saving}
              className="px-5 py-2 font-semibold bg-gradient-to-r from-[#8a733e] to-[#bda165] text-black rounded-lg cursor-pointer disabled:opacity-60"
            >
              Sauvegarder Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
