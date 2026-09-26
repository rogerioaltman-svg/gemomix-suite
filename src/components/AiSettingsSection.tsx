import React, { useEffect, useState } from 'react';
import { AiProvider, AiSettingsPublic } from '../types';

// Réglages de la lecture automatique des factures d'achat : service, modèle, clé d'API.
// La clé se saisit ici, est enregistrée sur ce poste, et n'est jamais renvoyée au navigateur.
export default function AiSettingsSection() {
  const [settings, setSettings] = useState<AiSettingsPublic | null>(null);
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [models, setModels] = useState<string[] | null>(null);

  const apply = (s: AiSettingsPublic) => { setSettings(s); setProvider(s.provider); setModel(s.model); };
  const load = async () => {
    try { const r = await fetch('/api/ai-settings'); if (r.ok) apply(await r.json()); } catch { /* section masquée si le serveur ne répond pas */ }
  };
  useEffect(() => { load(); }, []);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const onProvider = (p: AiProvider) => {
    setProvider(p);
    setApiKey('');
    setMessage(null);
    setConfirmClear(false);
    setModels(null);
    setModel(p === settings?.provider ? settings.model : settings?.providers.find(x => x.id === p)?.defaultModel ?? '');
  };

  const save = async () => {
    setBusy(true); setMessage(null);
    try {
      const { ok, data } = await post('/api/ai-settings', { provider, model, ...(apiKey.trim() ? { apiKey } : {}) });
      if (ok) { apply(data); setApiKey(''); setMessage({ ok: true, text: 'Réglages enregistrés.' }); }
      else setMessage({ ok: false, text: data.error || 'Enregistrement refusé.' });
    } catch { setMessage({ ok: false, text: 'Le serveur est injoignable.' }); }
    setBusy(false);
  };

  const test = async () => {
    setBusy(true); setMessage(null);
    try {
      const { ok, data } = await post('/api/ai-settings/test', { provider, model, ...(apiKey.trim() ? { apiKey } : {}) });
      setMessage({ ok, text: ok ? data.message : (data.error || 'Test impossible.') });
    } catch { setMessage({ ok: false, text: 'Le serveur est injoignable.' }); }
    setBusy(false);
  };

  // Modèles réellement disponibles pour cette clé (évite de deviner un nom de modèle)
  const loadModels = async () => {
    setBusy(true); setMessage(null);
    try {
      const { ok, data } = await post('/api/ai-settings/models', { provider, ...(apiKey.trim() ? { apiKey } : {}) });
      if (ok) { setModels(data.models); if (data.models.length === 0) setMessage({ ok: false, text: 'Aucun modèle utilisable trouvé pour cette clé.' }); }
      else setMessage({ ok: false, text: data.error || 'Liste indisponible.' });
    } catch { setMessage({ ok: false, text: 'Le serveur est injoignable.' }); }
    setBusy(false);
  };

  const clearKey = async () => {
    setBusy(true); setMessage(null); setConfirmClear(false);
    try {
      const { ok, data } = await post('/api/ai-settings', { provider, model, clearKey: true });
      if (ok) { apply(data); setMessage({ ok: true, text: 'Clé supprimée de ce poste.' }); }
      else setMessage({ ok: false, text: data.error || 'Suppression refusée.' });
    } catch { setMessage({ ok: false, text: 'Le serveur est injoignable.' }); }
    setBusy(false);
  };

  if (!settings) return null;
  const isSaved = provider === settings.provider;
  const label = settings.providers.find(p => p.id === provider)?.label ?? provider;
  const input = 'w-full px-3 py-2 text-xs bg-[#171e2c] border border-[#27354d] rounded-lg text-white focus:outline-none focus:border-[#b4985c]';

  return (
    <div className="bg-[#121620] border border-[#212a3d] rounded-2xl p-6 sm:p-8 shadow-xl" id="ai-settings-section">
      <h3 className="text-base font-bold text-white mb-1">Lecture automatique des factures d'achat</h3>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        Le bouton « Lire la facture » d'un achat envoie le document joint à un service d'intelligence artificielle, qui en extrait le
        fournisseur, le numéro, la date et les lignes pour pré-remplir la saisie. <strong className="text-gray-300">Rien n'est enregistré sans votre validation.</strong>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <div className="space-y-1">
          <label className="block text-gray-400 text-[10px] font-mono uppercase">Service</label>
          <select id="ai-provider-select" value={provider} onChange={(e) => onProvider(e.target.value as AiProvider)} className={input}>
            {settings.providers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-gray-400 text-[10px] font-mono uppercase">Modèle</label>
          <div className="flex gap-2">
            <input id="ai-model-input" type="text" value={model} onChange={(e) => setModel(e.target.value)} className={`${input} font-mono`} />
            <button id="btn-ai-models" type="button" disabled={busy} onClick={loadModels} title="Interroge le service pour lister les modèles disponibles avec votre clé"
              className="shrink-0 px-3 py-2 text-xs rounded-lg border border-[#2c3a55] bg-[#1a2336] hover:bg-[#202c44] text-gray-200 disabled:opacity-50 cursor-pointer">Modèles disponibles</button>
          </div>
          {models && models.length > 0 && (
            <select id="ai-models-select" value="" onChange={(e) => { if (e.target.value) { setModel(e.target.value); setModels(null); } }} className={input}>
              <option value="">Choisir parmi les {models.length} modèles disponibles…</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-gray-400 text-[10px] font-mono uppercase">Clé d'API {label}</label>
          <input
            id="ai-key-input"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isSaved && settings.configured ? '•••••••• (clé enregistrée : saisissez-en une nouvelle pour la remplacer)' : 'Collez ici la clé fournie par le service'}
            className={`${input} font-mono`}
          />
          <p id="ai-key-status" className={`text-[11px] ${isSaved && settings.configured ? 'text-emerald-400' : 'text-gray-500'}`}>
            {!isSaved ? 'Enregistrez pour vérifier l\'état de la clé de ce service.'
              : settings.keySource === 'app' ? 'Une clé est enregistrée sur ce poste.'
              : settings.keySource === 'env' ? 'Clé lue depuis une variable d\'environnement (mode développement).'
              : 'Aucune clé : la lecture automatique est désactivée.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button id="btn-ai-save" type="button" disabled={busy} onClick={save} className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#8a733e] to-[#bda165] text-black disabled:opacity-50 cursor-pointer">Enregistrer</button>
        <button id="btn-ai-test" type="button" disabled={busy} onClick={test} className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#2c3a55] bg-[#1a2336] hover:bg-[#202c44] text-gray-200 disabled:opacity-50 cursor-pointer">Tester la connexion</button>
        {isSaved && settings.keySource === 'app' && (confirmClear ? (
          <span className="flex items-center gap-2 text-xs text-red-300">
            Supprimer la clé de ce poste ?
            <button id="btn-ai-clear-confirm" type="button" onClick={clearKey} className="px-2.5 py-1 rounded border border-red-500/40 bg-red-500/15 text-red-200 cursor-pointer">Oui</button>
            <button type="button" onClick={() => setConfirmClear(false)} className="px-2.5 py-1 rounded border border-gray-700 text-gray-300 cursor-pointer">Non</button>
          </span>
        ) : (
          <button id="btn-ai-clear" type="button" disabled={busy} onClick={() => setConfirmClear(true)} className="px-4 py-2 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer">Supprimer la clé</button>
        ))}
      </div>
      {message && (
        <p id="ai-message" role="status" className={`mt-3 text-xs ${message.ok ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</p>
      )}

      <div className="mt-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-gray-300 leading-relaxed">
        <p><strong className="text-gray-100">Confidentialité.</strong> À chaque lecture, le document est envoyé au service choisi ({label}) : cela n'arrive que lorsque vous cliquez sur « Lire la facture ». Consultez les conditions du service concernant l'usage des documents envoyés. La clé reste sur ce poste et n'est jamais renvoyée à l'écran. Attention : elle figure dans le fichier de la base, donc dans ses sauvegardes : ne les partagez pas.</p>
      </div>
    </div>
  );
}
