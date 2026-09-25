/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  getDb, DB_FILE_PATH,
  getAllGemstones, saveGemstone, deleteGemstone, getGemstoneImage, getLotImage,
  getAllPurchases, savePurchase, deletePurchase, deleteLotsByPurchaseId, getNextPurchaseReference, getNextSubReference,
  getAllLots, saveLot, deleteLot,
  getAllSuppliers, saveSupplier, deleteSupplier,
  getAllClients, saveClient, deleteClient,
  getAllSalesInvoices, saveSalesInvoice, deleteSalesInvoice, InvoiceLockedError,
  getCompanySettings, saveCompanySettings,
  getAllPriceGuideEntries, savePriceGuideEntry, deletePriceGuideEntry,
  getTrash, restoreTrashItem,
  getMovementsForEntity,
  getAllBijoux, saveBijou, deleteBijou, decomposeBijou
} from './src/server_db';
import { TrashEntityType } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

// Les photos (pierres, lots) sont transmises en data-URL : la limite par défaut (100 ko) les rejetait
app.use(express.json({ limit: '25mb' }) as any);

// --- Database CRUD API Endpoints ---

// Get Company Settings
app.get('/api/company-settings', async (req, res) => {
  try {
    const settings = await getCompanySettings();
    res.json(settings);
  } catch (error: any) {
    console.error("Error fetching company settings:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des paramètres de l'entreprise." });
  }
});

// Update Company Settings
app.post('/api/company-settings', async (req, res) => {
  try {
    const settings = req.body;
    await saveCompanySettings(settings);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving company settings:", error);
    res.status(500).json({ error: "Erreur lors de la sauvegarde des paramètres." });
  }
});

// Get all gemstones
app.get('/api/gemstones', async (req, res) => {
  try {
    const list = await getAllGemstones();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching gemstones:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des pierres précieuses." });
  }
});

// Photo d'une pierre, chargée à la demande (les listes ne la transportent pas)
app.get('/api/gemstones/:id/image', async (req, res) => {
  try {
    res.json({ image: await getGemstoneImage(req.params.id) });
  } catch (error: any) {
    console.error("Error fetching gemstone image:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de la photo." });
  }
});

// Photo d'un lot, chargée à la demande
app.get('/api/lots/:id/image', async (req, res) => {
  try {
    res.json({ image: await getLotImage(req.params.id) });
  } catch (error: any) {
    console.error("Error fetching lot image:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de la photo." });
  }
});

// Create/Update a gemstone
app.post('/api/gemstones', async (req, res) => {
  try {
    const gem = req.body;
    if (!gem || !gem.id) {
      return res.status(400).json({ error: "Format de donnée invalide." });
    }
    await saveGemstone(gem);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving gemstone:", error);
    res.status(500).json({ error: "Erreur lors de la sauvegarde de la pierre précieuse." });
  }
});

// Delete a gemstone
app.delete('/api/gemstones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteGemstone(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting gemstone:", error);
    res.status(500).json({ error: "Erreur lors de la suppression de la pierre précieuse." });
  }
});

// Get all purchases
app.get('/api/purchases', async (req, res) => {
  try {
    const list = await getAllPurchases();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ error: "Erreur lors de l'acquisition des factures d'achat." });
  }
});

// Create/Update a purchase
// Module 6 : numéro de la prochaine facture d'achat (aperçu avant enregistrement)
app.get('/api/purchases/next-reference', async (req, res) => {
  try {
    const reference = await getNextPurchaseReference();
    res.json({ reference });
  } catch (error: any) {
    console.error("Error generating next purchase reference:", error);
    res.status(500).json({ error: "Erreur lors de la génération du numéro de facture." });
  }
});

// Module 7 : prochaine référence lot/pierre (n° facture/suffixe) sous un achat donné
app.get('/api/purchases/:id/next-sub-reference', async (req, res) => {
  try {
    const reference = await getNextSubReference(req.params.id);
    res.json({ reference });
  } catch (error: any) {
    console.error("Error generating next sub-reference:", error);
    res.status(500).json({ error: "Erreur lors de la génération de la référence." });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const p = req.body;
    if (!p || !p.id) {
      return res.status(400).json({ error: "Format de donnée facture invalide." });
    }
    await savePurchase(p);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving purchase:", error);
    res.status(500).json({ error: "Erreur lors de la sauvegarde d'achat." });
  }
});

// Delete a purchase
app.delete('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deletePurchase(id);
    await deleteLotsByPurchaseId(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting purchase:", error);
    res.status(500).json({ error: "Erreur lors de la suppression de la facture d'achat." });
  }
});

// Get all lots
app.get('/api/lots', async (req, res) => {
  try {
    const list = await getAllLots();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching lots:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des sachets." });
  }
});

// Create/Update a lot
app.post('/api/lots', async (req, res) => {
  try {
    const l = req.body;
    if (!l || !l.id) {
      return res.status(400).json({ error: "Format de donnée lot invalide." });
    }
    await saveLot(l);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving lot:", error);
    res.status(500).json({ error: "Erreur lors de la sauvegarde du sachet de tri." });
  }
});

// Delete a lot
app.delete('/api/lots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteLot(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting lot:", error);
    res.status(500).json({ error: "Erreur lors de la suppression du sachet." });
  }
});

// --- Suppliers API Endpoints ---
app.get('/api/suppliers', async (req, res) => {
  try {
    const list = await getAllSuppliers();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Erreur de récupération des fournisseurs." });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const s = req.body;
    if (!s || !s.id) return res.status(400).json({ error: "Format invalide." });
    await saveSupplier(s);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving supplier:", error);
    res.status(500).json({ error: "Erreur d'enregistrement du fournisseur." });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    await deleteSupplier(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Erreur de suppression du fournisseur." });
  }
});

// --- Clients API Endpoints ---
app.get('/api/clients', async (req, res) => {
  try {
    const list = await getAllClients();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    res.status(500).json({ error: "Erreur de récupération des clients." });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const c = req.body;
    if (!c || !c.id) return res.status(400).json({ error: "Format invalide." });
    await saveClient(c);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving client:", error);
    res.status(500).json({ error: "Erreur d'enregistrement du client." });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await deleteClient(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting client:", error);
    res.status(500).json({ error: "Erreur de suppression du client." });
  }
});

// --- Sales Invoices API Endpoints ---
app.get('/api/sales-invoices', async (req, res) => {
  try {
    const list = await getAllSalesInvoices();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching sales invoices:", error);
    res.status(500).json({ error: "Erreur de récupération des factures de vente." });
  }
});

app.post('/api/sales-invoices', async (req, res) => {
  try {
    const inv = req.body;
    if (!inv || !inv.id) return res.status(400).json({ error: "Format invalide." });
    await saveSalesInvoice(inv);
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof InvoiceLockedError) return res.status(409).json({ error: error.message });
    console.error("Error saving invoice:", error);
    res.status(500).json({ error: "Erreur d'enregistrement de la facture de vente." });
  }
});

app.delete('/api/sales-invoices/:id', async (req, res) => {
  try {
    await deleteSalesInvoice(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    if (error instanceof InvoiceLockedError) return res.status(409).json({ error: error.message });
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Erreur de suppression de la facture de vente." });
  }
});


// --- Price Guide (barème d'estimation) API Endpoints ---
app.get('/api/price-guide', async (req, res) => {
  try {
    const list = await getAllPriceGuideEntries();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching price guide:", error);
    res.status(500).json({ error: "Erreur de récupération du barème d'estimation." });
  }
});

app.post('/api/price-guide', async (req, res) => {
  try {
    const entry = req.body;
    if (!entry || !entry.id || !entry.gemstoneType || !entry.tierName) {
      return res.status(400).json({ error: "Format de palier invalide." });
    }
    await savePriceGuideEntry(entry);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving price guide entry:", error);
    res.status(500).json({ error: "Erreur d'enregistrement du palier." });
  }
});

app.delete('/api/price-guide/:id', async (req, res) => {
  try {
    await deletePriceGuideEntry(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting price guide entry:", error);
    res.status(500).json({ error: "Erreur de suppression du palier." });
  }
});

// --- Module 12 : Bijoux composés (monture + pierres serties) & décomposition ---
app.get('/api/bijoux', async (req, res) => {
  try {
    const list = await getAllBijoux();
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching bijoux:", error);
    res.status(500).json({ error: "Erreur de récupération des bijoux." });
  }
});

app.post('/api/bijoux', async (req, res) => {
  try {
    const bijou = req.body;
    if (!bijou || !bijou.id || !bijou.reference) {
      return res.status(400).json({ error: "Format de bijou invalide." });
    }
    await saveBijou(bijou);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error saving bijou:", error);
    res.status(500).json({ error: "Erreur d'enregistrement du bijou." });
  }
});

app.delete('/api/bijoux/:id', async (req, res) => {
  try {
    await deleteBijou(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting bijou:", error);
    res.status(500).json({ error: "Erreur de suppression du bijou." });
  }
});

app.post('/api/bijoux/:id/decompose', async (req, res) => {
  try {
    await decomposeBijou(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error decomposing bijou:", error);
    res.status(400).json({ error: error.message || "Erreur lors de la décomposition du bijou." });
  }
});

// --- Module 11 : Corbeille (suppression logique / historique immuable) ---
app.get('/api/trash', async (req, res) => {
  try {
    const items = await getTrash();
    res.json(items);
  } catch (error: any) {
    console.error("Error fetching trash:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de la corbeille." });
  }
});

app.post('/api/trash/:type/:id/restore', async (req, res) => {
  try {
    await restoreTrashItem(req.params.type as TrashEntityType, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error restoring trash item:", error);
    res.status(500).json({ error: "Erreur lors de la restauration de l'élément." });
  }
});

// --- Module 10 : Historique des mouvements de stock (journal en lecture seule) ---
app.get('/api/movements/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    if (entityType !== 'gemstone' && entityType !== 'lot') {
      return res.status(400).json({ error: "Type d'entité invalide (attendu : gemstone ou lot)." });
    }
    const movements = await getMovementsForEntity(entityType, entityId);
    res.json(movements);
  } catch (error: any) {
    console.error("Error fetching movements:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de l'historique des mouvements." });
  }
});

// Initialize Gemini on the server side securely
const aiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (aiApiKey) {
  ai = new GoogleGenAI({
    apiKey: aiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API endpoint for authentic Gemology AI Chatbot and Expert Appraiser
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!ai) {
      return res.status(200).json({ 
        text: "Bonjour ! Je suis l'assistant IA GemoPhy. Note : La clé GEMINI_API_KEY n'est pas configurée dans vos secrets. Je fonctionne actuellement en mode simulation locale hors-ligne pour vos démonstrations. Activez votre clé d'API pour débloquer l'intégrité de mes connaissances scientifiques en gemmologie !"
      });
    }

    const systemInstruction = 
      "Vous êtes le Dr. Aurélien GemoPhy, expert-gemmologue en chef agréé et chercheur universitaire. " +
      "Votre expertise couvre la joaillerie, la cristallographie, la physique optique des minéraux, les traitements thermiques indétectables, " +
      "l'évaluation et l'appraisal professionnel des diamants et pierres de couleurs.\n\n" +
      "Vos consignes de communication :\n" +
      "1. Répondez de manière fluide, passionnée et extrêmement rigoureuse scientifiquement.\n" +
      "2. Guidez l'utilisateur sur la classification des 4Cs, l'identification des traitements (chauffage, remplissage résine, diffusion de surface) et l'estimation du prix.\n" +
      "3. Expliquez les propriétés physiques (indice de réfraction, biréfringence, gravité spécifique) pour discriminer une matière naturelle d'une synthèse (ex: Verneuil/Flux) ou d'un simulant (ex: YAG, zircone cubique).\n" +
      "4. Si l'utilisateur pose une question de programmation sur Python pour la gestion de son stock, proposez-lui du code Python optimisé pour manipuler des données gemmologiques de façon didactique.\n" +
      "5. Répondez toujours en français.";

    // Adapt history if received or construct chat session
    const formattedContents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        formattedContents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        });
      }
    }
    // Push the current latest message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error on Server:", error);
    res.status(500).json({ error: error?.message || "Erreur interne lors de la génération de contenu IA." });
  }
});

// Endpoint to backup / download the SQLite database file
app.get('/api/backup-db', (req: any, res: any) => {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.download(DB_FILE_PATH, 'gemophy.db');
    } else {
      res.status(404).json({ error: "Le fichier de base de données n'existe pas encore ou n'a pas été initialisé." });
    }
  } catch (err: any) {
    console.error("Error exporting database:", err);
    res.status(500).json({ error: "Erreur lors du téléchargement de la base de données." });
  }
});

// Configure Vite middleware for asset compilation in Dev mode
async function startServer() {
  // Initialize SQLite Database
  try {
    console.log("[SQLite] Initializing database...");
    await getDb();
    console.log(`[SQLite] Database ready: ${DB_FILE_PATH}`);
  } catch (err) {
    console.error("[SQLite] Error launching database:", err);
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares as any);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath) as any);
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
