import React, { useState, useRef } from 'react';
import PageHeader, { btnPrimary, btnSecondary } from './PageHeader';
import { Supplier, Client } from '../types';
import ClientFormModal from './ClientFormModal';
import SupplierFormModal from './SupplierFormModal';
import { 
  Users, 
  UserPlus, 
  Briefcase, 
  Building2, 
  FileSpreadsheet, 
  Search, 
  Trash2, 
  Edit3, 
  Download, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  X, 
  Check, 
  AlertTriangle,
  UploadCloud,
  ChevronRight
} from 'lucide-react';

interface ContactManagerProps {
  suppliers: Supplier[];
  clients: Client[];
  onSaveSupplier: (s: Supplier) => Promise<boolean | void> | boolean | void;
  onDeleteSupplier: (id: string) => Promise<void> | void;
  onSaveClient: (c: Client) => Promise<boolean | void> | boolean | void;
  onDeleteClient: (id: string) => Promise<void> | void;
}

export default function ContactManager({
  suppliers,
  clients,
  onSaveSupplier,
  onDeleteSupplier,
  onSaveClient,
  onDeleteClient
}: ContactManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'suppliers'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Editing targets
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // CSV Drag and drop state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({});
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers for Add/Edit Client

  // Open forms helper
  const handleOpenNewClient = () => {
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (c: Client) => {
    setEditingClient(c);
    setIsClientModalOpen(true);
  };

  const handleOpenNewSupplier = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setIsSupplierModalOpen(true);
  };

  // Parsed CSV content processor
  const handleCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      // Extract headers
      const delimiter = text.includes(';') ? ';' : ',';
      const rawHeaders = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
      setCsvHeaders(rawHeaders);

      // Parse first few lines as previews
      const parsedRows = lines.slice(1, 6).map(line => {
        return line.split(delimiter).map(val => val.replace(/^["']|["']$/g, '').trim());
      });
      setCsvPreview(parsedRows);

      // Instantly generate smart auto-mappings based on headers
      const defaultMappings: Record<string, string> = {};
      rawHeaders.forEach((h, index) => {
        const normalized = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
        
        // Nom de l'entreprise ou personne
        if (normalized.includes('nom') || normalized.includes('company') || normalized.includes('societe') || normalized.includes('client') || normalized.includes('fournisseur') || normalized.includes('raison')) {
          defaultMappings['name'] = h;
        }
        // Contact principal humain
        else if (normalized.includes('contact') || normalized.includes('responsable') || normalized.includes('nom_contact') || normalized.includes('prenom')) {
          defaultMappings['contactName'] = h;
        }
        // Email
        else if (normalized.includes('mail') || normalized.includes('courriel')) {
          defaultMappings['email'] = h;
        }
        // Telephone
        else if (normalized.includes('tel') || normalized.includes('phone') || normalized.includes('gsm') || normalized.includes('portable')) {
          defaultMappings['phone'] = h;
        }
        // Adresse
        else if (normalized.includes('adresse') || normalized.includes('address') || normalized.includes('rue')) {
          defaultMappings['address'] = h;
        }
        // Ville
        else if (normalized.includes('ville') || normalized.includes('city')) {
          defaultMappings['city'] = h;
        }
        // Code Postal
        else if (normalized.includes('cp') || normalized.includes('post') || normalized.includes('zip')) {
          defaultMappings['postalCode'] = h;
        }
        // Pays
        else if (normalized.includes('pays') || normalized.includes('country')) {
          defaultMappings['country'] = h;
        }
        // VAT
        else if (normalized.includes('tva') || normalized.includes('vat')) {
          defaultMappings['vatNumber'] = h;
        }
        // Notes
        else if (normalized.includes('note') || normalized.includes('desc') || normalized.includes('info')) {
          defaultMappings['notes'] = h;
        }
      });
      setCsvMapping(defaultMappings);
    };
    reader.readAsText(file);
  };

  // Process and save CSV rows
  const handleExecuteImport = async () => {
    if (!csvFile || !csvMapping['name']) {
      setImportStatus({ type: 'error', message: 'Veuillez associer au moins la colonne "Nom" pour pouvoir importer.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return;

        const delimiter = text.includes(';') ? ';' : ',';
        const rawHeaders = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
        
        let successCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const rowVals = lines[i].split(delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
          if (rowVals.length === 0 || !rowVals[0]) continue;

          // Helper to get value mapped
          const getValByMappingKey = (key: string) => {
            const headerName = csvMapping[key];
            if (!headerName) return undefined;
            const index = rawHeaders.indexOf(headerName);
            return index >= 0 ? rowVals[index] : undefined;
          };

          const nameVal = getValByMappingKey('name');
          if (!nameVal) continue;

          if (activeSubTab === 'clients') {
            const rawClient: Client = {
              id: `CLI-IMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              name: nameVal,
              contactName: getValByMappingKey('contactName'),
              email: getValByMappingKey('email'),
              phone: getValByMappingKey('phone'),
              address: getValByMappingKey('address'),
              city: getValByMappingKey('city'),
              postalCode: getValByMappingKey('postalCode'),
              country: getValByMappingKey('country') || 'France',
              vatNumber: getValByMappingKey('vatNumber'),
              notes: getValByMappingKey('notes') || 'Donnée récupérée de l\'ancien système.',
              dateAdded: new Date().toISOString()
            };
            await onSaveClient(rawClient);
          } else {
            const rawSupplier: Supplier = {
              id: `SUP-IMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              name: nameVal,
              contactName: getValByMappingKey('contactName'),
              email: getValByMappingKey('email'),
              phone: getValByMappingKey('phone'),
              address: getValByMappingKey('address'),
              city: getValByMappingKey('city'),
              country: getValByMappingKey('country') || 'France',
              vatNumber: getValByMappingKey('vatNumber'),
              notes: getValByMappingKey('notes') || 'Donnée récupérée de l\'ancien système.',
              dateAdded: new Date().toISOString()
            };
            await onSaveSupplier(rawSupplier);
          }
          successCount++;
        }

        setImportStatus({ 
          type: 'success', 
          message: `✓ Succès ! ${successCount} ${activeSubTab === 'clients' ? 'clients' : 'fournisseurs'} ont été importés dans votre base de données.` 
        });
        setTimeout(() => {
          setIsCsvModalOpen(false);
          setCsvFile(null);
          setCsvPreview([]);
          setCsvHeaders([]);
          setCsvMapping({});
          setImportStatus(null);
        }, 2200);

      } catch (err) {
        console.error("CSV import parse error:", err);
        setImportStatus({ type: 'error', message: 'Erreur technique lors du traitement du fichier CSV.' });
      }
    };
    reader.readAsText(csvFile);
  };

  // Download Sample Template Handler
  const handleDownloadTemplate = () => {
    let headers = "Nom_Entreprise_ou_Client,Contact_Principal,Email,Telephone,Adresse,Ville,Code_Postal,Pays,Numero_TVA,Observations_Notes\n";
    if (activeSubTab === 'suppliers') {
      headers = "Nom_Fournisseur,Contact_Interne,Email,Telephone,Adresse,Ville,Pays,Numero_TVA,Observations_Notes\n";
    }
    const data = headers + (activeSubTab === 'clients' 
      ? "Atelier Bijouterie Royale,Pierre Dupond,pierre@bijouterieroyale.com,0144556677,10 Rue de la Paix,Paris,75002,France,FR12345678901,Client orfèvre historique d'exception\n"
      : "IndoGems Export Ltd,Sanjay Kumar,sanjay@indogems.in,+9122345678,22 Ruby Bazaar,Jaipur,,Inde,,Spécialiste saphirs bruts et émeraudes\n");
    
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", activeSubTab === 'clients' ? "modele_clients_gemo.csv" : "modele_fournisseurs_gemo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering list
  const filteredClients = clients.filter(c => {
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.contactName && c.contactName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contactName && s.contactName.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      
      <PageHeader
        title="Clients & Fournisseurs"
        description="Annuaire de vos clients et de vos négociants partenaires. Importez vos contacts depuis un fichier CSV."
        actions={
          <>
            <button onClick={() => setIsCsvModalOpen(true)} id="btn-open-csv-import" className={btnSecondary}>
              <UploadCloud className="h-4 w-4 text-[#e0b760]" />
              <span>Importer CSV</span>
            </button>
            {activeSubTab === 'clients' ? (
              <button onClick={handleOpenNewClient} id="btn-new-client" className={btnPrimary}>
                <UserPlus className="h-4 w-4" />
                <span>Nouveau client</span>
              </button>
            ) : (
              <button onClick={handleOpenNewSupplier} id="btn-new-supplier" className={btnPrimary}>
                <Building2 className="h-4 w-4" />
                <span>Nouveau fournisseur</span>
              </button>
            )}
          </>
        }
      />

      {/* Segment switcher and search panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#101421]/60 border border-[#1d2739]/80 rounded-xl p-3">
        {/* Switch toggler with modern styling */}
        <div className="bg-[#0b0e17] p-1 rounded-xl flex border border-[#1f283d] w-full sm:w-auto min-w-[280px]">
          <button
            onClick={() => { setActiveSubTab('clients'); setSearchTerm(''); }}
            id="subtab-clients"
            className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${activeSubTab === 'clients' ? 'bg-[#1e2638] text-white border border-[#27354d]' : 'text-gray-400 hover:text-white border border-transparent'}`}
          >
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span>Clients ({clients.length})</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('suppliers'); setSearchTerm(''); }}
            id="subtab-suppliers"
            className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${activeSubTab === 'suppliers' ? 'bg-[#1e2638] text-white border border-[#27354d]' : 'text-gray-400 hover:text-white border border-transparent'}`}
          >
            <Briefcase className="h-3.5 w-3.5 text-sky-400" />
            <span>Fournisseurs ({suppliers.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder={activeSubTab === 'clients' ? "Rechercher un client..." : "Rechercher un fournisseur..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#0a0d15] border border-[#1f293d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#bda165]"
          />
        </div>
      </div>

      {/* Main Grid Tables */}
      <div className="bg-[#101421]/60 border border-[#1a2336] rounded-xl overflow-hidden shadow-xl">
        
        {activeSubTab === 'clients' ? (
          <div>
            {filteredClients.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-semibold">Aucun client trouvé</p>
                <p className="text-gray-500 text-xs mt-1">Créez votre premier client ou importez vos contacts de l'ancien logiciel pour commencer.</p>
                <button
                  onClick={handleOpenNewClient}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2336] hover:bg-[#202c44] border border-[#2c3a55] text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5 text-[#e0b760]" />
                  <span>Enregistrer un Client</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0b0e17] border-b border-[#1c273a] text-gray-400 font-mono text-[9px] uppercase tracking-wider">
                      <th className="py-3 px-4">Raison Sociale / Nom</th>
                      <th className="py-3 px-4">Contact Humain</th>
                      <th className="py-3 px-4">Coordonnées</th>
                      <th className="py-3 px-4">Adresse & Bureau</th>
                      <th className="py-3 px-4">TVA / Régistration</th>
                      <th className="py-3 px-4">Notes Internes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182235]">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-[#151d2e]/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <div>
                              <span>{client.name}</span>
                              <span className="text-[9px] font-mono text-gray-500 block">{client.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {client.contactName ? (
                            <span>{client.contactName}</span>
                          ) : (
                            <span className="text-gray-600">Non renseigné</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs space-y-0.5">
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-gray-400 hover:text-white">
                              <Mail className="h-3 w-3 text-gray-500" />
                              <a href={`mailto:${client.email}`}>{client.email}</a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Phone className="h-3 w-3 text-gray-500" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {!client.email && !client.phone && <span className="text-gray-600">—</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-400 space-y-0.5">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 text-gray-500 mt-0.5 shrink-0" />
                            <div>
                              {client.address && <div>{client.address}</div>}
                              <div>{[client.postalCode, client.city, client.country].filter(Boolean).join(', ')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300 font-mono text-[10px]">
                          {client.vatNumber || <span className="text-gray-600">—</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-400 max-w-[180px] truncate" title={client.notes}>
                          {client.notes || <span className="text-gray-600 font-mono">—</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditClient(client)}
                              title="Modifier"
                              className="p-1 px-1.5 bg-[#171e2c] border border-gray-800 rounded text-gray-400 hover:text-amber-400 hover:border-amber-400/35 transition-all cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteClient(client.id)}
                              title="Supprimer"
                              className="p-1 px-1.5 bg-[#1c1218] border border-red-500/10 rounded text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredSuppliers.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-semibold">Aucun fournisseur trouvé</p>
                <p className="text-gray-500 text-xs mt-1">Gérez votre réseau de mines partenaires, négociants de bruts ou ateliers lapidaires.</p>
                <button
                  onClick={handleOpenNewSupplier}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2336] hover:bg-[#202c44] border border-[#2c3a55] text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-[#e0b760]" />
                  <span>Enregistrer un Fournisseur</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0b0e17] border-b border-[#1c273a] text-gray-400 font-mono text-[9px] uppercase tracking-wider">
                      <th className="py-3 px-4">Réseau / Maison Mère</th>
                      <th className="py-3 px-4">Négociant Contact</th>
                      <th className="py-3 px-4">Coordonnées</th>
                      <th className="py-3 px-4">Adresse & Siège</th>
                      <th className="py-3 px-4">TVA / Douane</th>
                      <th className="py-3 px-4">Compagnie Notes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182235]">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-[#151d2e]/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            <div>
                              <span>{supplier.name}</span>
                              <span className="text-[9px] font-mono text-gray-500 block">{supplier.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {supplier.contactName ? (
                            <span>{supplier.contactName}</span>
                          ) : (
                            <span className="text-gray-600">Non renseigné</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs space-y-0.5">
                          {supplier.email && (
                            <div className="flex items-center gap-1.5 text-gray-400 hover:text-white">
                              <Mail className="h-3 w-3 text-gray-500" />
                              <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Phone className="h-3 w-3 text-gray-500" />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                          {!supplier.email && !supplier.phone && <span className="text-gray-600">—</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-400 space-y-0.5">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3 w-3 text-gray-500 mt-0.5 shrink-0" />
                            <div>
                              {supplier.address && <div>{supplier.address}</div>}
                              <div>{[supplier.postalCode, supplier.city, supplier.country].filter(Boolean).join(', ')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300 font-mono text-[10px]">
                          {supplier.vatNumber || <span className="text-gray-600">—</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-400 max-w-[180px] truncate" title={supplier.notes}>
                          {supplier.notes || <span className="text-gray-600 font-mono">—</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditSupplier(supplier)}
                              title="Modifier"
                              className="p-1 px-1.5 bg-[#171e2c] border border-gray-800 rounded text-gray-400 hover:text-amber-400 hover:border-amber-400/35 transition-all cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteSupplier(supplier.id)}
                              title="Supprimer"
                              className="p-1 px-1.5 bg-[#1c1218] border border-red-500/10 rounded text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121620] border border-[#232f46] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setIsCsvModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 rounded-lg bg-gray-900/60 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="p-6 bg-[#171d2b] border-b border-[#212a3d] flex items-center gap-3">
              <div className="h-10 w-10 bg-[#bda165]/10 border border-[#bda165]/20 text-[#e0b760] rounded-xl flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5.5 w-5.5" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-wider text-[#b4985c] uppercase">HÉGÉMONIE DE RECUPÉRATION</span>
                <h3 className="text-lg font-bold text-white">Importation CSV Inteligente ({activeSubTab === 'clients' ? 'Clients' : 'Fournisseurs'})</h3>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <p className="text-xs text-gray-300">
                Glissez votre fichier d'export CSV (séparateur virgule ou point-virgule) ou sélectionnez-le sur votre machine. Les champs seront automatiquement convertis pour correspondre à la structure GemoPhy.
              </p>

              {/* Upload Zone */}
              <div 
                className="border-2 border-dashed border-[#24334c] hover:border-[#bda165]/50 bg-[#161c28]/40 rounded-xl p-8 text-center text-xs space-y-3 cursor-pointer transition-all relative"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleCsvFileSelected} 
                  className="hidden" 
                />
                
                <UploadCloud className="h-10 w-10 text-gray-500 mx-auto" />
                <div className="text-gray-300 font-semibold font-sans">
                  {csvFile ? `Fichier prêt : ${csvFile.name}` : "Cliquez ou glissez un fichier .csv ici"}
                </div>
                <div className="text-gray-500 text-[11px]">
                  Fichier d'importation CSV standard, taille limite 10 Mo
                </div>
              </div>

              {/* Error & Success status */}
              {importStatus && (
                <div className={`p-4 rounded-xl flex items-start gap-2.5 text-xs ${importStatus.type === 'success' ? 'bg-[#10241b] text-[#52c48a] border border-[#203a2f]' : 'bg-[#291316] text-[#fc6a76] border border-[#3e1b21]'}`}>
                  {importStatus.type === 'success' ? <Check className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{importStatus.message}</span>
                </div>
              )}

              {/* CSV Analysis UI */}
              {csvFile && csvHeaders.length > 0 && (
                <div className="space-y-4 border-t border-gray-800 pt-4 animate-fadeIn">
                  <div className="text-xs font-bold text-[#e0b760] font-sans flex items-center gap-1.5">
                    <span>⚙ Mapping d'association des colonnes</span>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Nous avons deviné les correspondances ci-dessous. Modifiez-les si nécessaire en sélectionnant la colonne correspondante de votre fichier CSV.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-900/40 p-4 rounded-xl border border-gray-800">
                    {/* Map Raison Sociale */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-gray-400">NOM / RAISON SOCIALE <span className="text-red-500">*</span></label>
                      <select
                        value={csvMapping['name'] || ''}
                        onChange={(e) => setCsvMapping({...csvMapping, name: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Contact Person */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-gray-400">CONTACT PRINCIPAL (HUMAIN)</label>
                      <select
                        value={csvMapping['contactName'] || ''}
                        onChange={(e) => setCsvMapping({...csvMapping, contactName: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-gray-400">EMAIL</label>
                      <select
                        value={csvMapping['email'] || ''}
                        onChange={(e) => setCsvMapping({...csvMapping, email: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-gray-400">TÉLÉPHONE</label>
                      <select
                        value={csvMapping['phone'] || ''}
                        onChange={(e) => setCsvMapping({...csvMapping, phone: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* Address */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-gray-400">ADRESSE DE LIVRAISON / SIEGE</label>
                      <select
                        value={csvMapping['address'] || ''}
                        onChange={(e) => setCsvMapping({...csvMapping, address: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {/* City */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-gray-400">VILLE</label>
                      <select
                        value={csvMapping['city'] || ''}
                        onChange={(e) => setCsvMapping({...csvMapping, city: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    {activeSubTab === 'clients' && (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-mono text-gray-400">CODE POSTAL</label>
                        <select
                          value={csvMapping['postalCode'] || ''}
                          onChange={(e) => setCsvMapping({...csvMapping, postalCode: e.target.value})}
                          className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                        >
                          <option value="">-- Ne pas importer --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-gray-400">PAYS</label>
                      <select
                        value={csvMapping['country'] || ''}
                        onChange={(e) => setCsvMapping({...csvMapping, country: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-mono text-gray-400">NUMÉRO TVA INTRACOMMUNAUTAIRE</label>
                      <select
                        value={csvMapping['vatNumber'] || ''}
                        onChange={(e) => setCsvMapping({...csvMapping, vatNumber: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs bg-[#121620] border border-gray-800 rounded text-white"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Table Sample */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-mono text-gray-400 uppercase">Aperçu direct (5 premières lignes) :</span>
                    <div className="overflow-x-auto border border-gray-800 rounded-lg max-h-32">
                      <table className="w-full text-left text-[10px] text-gray-400">
                        <thead className="bg-[#0b0e17] sticky top-0">
                          <tr className="border-b border-gray-800">
                            {csvHeaders.map((h, i) => (
                              <th key={i} className="py-1.5 px-3 whitespace-nowrap font-semibold border-r border-[#192131]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900">
                          {csvPreview.map((row, index) => (
                            <tr key={index}>
                              {row.map((val, cellI) => (
                                <td key={cellI} className="py-1.5 px-3 border-r border-gray-900 truncate max-w-sm">{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with actions */}
            <div className="p-4 bg-[#171d2b] border-t border-[#212a3d] flex justify-between items-center">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 text-xs bg-[#131922] hover:bg-[#1a212e] text-amber-400 border border-amber-500/10 hover:border-amber-400/25 rounded-md flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Télécharger un modèle .csv</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={!csvFile || !csvMapping['name']}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer ${csvFile && csvMapping['name'] ? 'bg-[#bda165] text-black hover:bg-[#a98f56]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                  <Check className="h-4 w-4" />
                  <span>Lancer l'importation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW/EDIT CLIENT MODAL : fenêtre partagée avec la Facturation */}
      {isClientModalOpen && (
        <ClientFormModal
          client={editingClient}
          onSave={onSaveClient}
          onClose={() => setIsClientModalOpen(false)}
        />
      )}

      {/* NEW/EDIT SUPPLIER MODAL : fenêtre partagée avec les achats et la fiche pierre */}
      {isSupplierModalOpen && (
        <SupplierFormModal
          supplier={editingSupplier}
          onSave={onSaveSupplier}
          onClose={() => setIsSupplierModalOpen(false)}
        />
      )}

    </div>
  );
}