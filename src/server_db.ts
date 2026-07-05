/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { SEED_GEMSTONES, SEED_PURCHASES, SEED_LOTS } from './data';
import { Gemstone, Purchase, Lot, Supplier, Client, SalesInvoice, CompanySettings, PriceGuideEntry } from './types';

export const DB_FILE_PATH = path.join(process.cwd(), 'gemophy.db');
// Ancienne base JSON (générée par la version AI Studio) : importée puis archivée au premier lancement
const LEGACY_JSON_PATH = path.join(process.cwd(), 'gemophy_database.json');

let db: Database.Database | null = null;

function getConnection(): Database.Database {
  if (db) return db;

  db = new Database(DB_FILE_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS gemstones (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      type TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      cut TEXT,
      color TEXT,
      clarity TEXT,
      dim_length REAL NOT NULL DEFAULT 0,
      dim_width REAL NOT NULL DEFAULT 0,
      dim_depth REAL NOT NULL DEFAULT 0,
      refractive_index TEXT,
      specific_gravity REAL NOT NULL DEFAULT 0,
      treatment TEXT,
      origin TEXT,
      cert_authority TEXT,
      cert_number TEXT,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Disponible',
      dealer TEXT,
      date_added TEXT NOT NULL,
      description TEXT,
      inclusions TEXT NOT NULL DEFAULT '[]',
      image TEXT,
      recuttings TEXT,
      source_purchase_id TEXT REFERENCES purchases(id) ON DELETE SET NULL,
      source_article_id TEXT,
      provenance TEXT
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      supplier TEXT,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Incomplet',
      total_cost REAL NOT NULL DEFAULT 0,
      articles TEXT NOT NULL DEFAULT '[]',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS lots (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      purchase_id TEXT NOT NULL,
      purchase_article_id TEXT,
      gemstone_type TEXT,
      weight REAL NOT NULL DEFAULT 0,
      quantity INTEGER,
      average_size TEXT,
      average_color TEXT,
      average_clarity TEXT,
      cut_type TEXT,
      destination TEXT,
      date_created TEXT NOT NULL,
      notes TEXT,
      image TEXT,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_lots_purchase ON lots(purchase_id);

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      vat_number TEXT,
      notes TEXT,
      date_added TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      country TEXT,
      vat_number TEXT,
      notes TEXT,
      date_added TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      date TEXT NOT NULL,
      due_date TEXT,
      client_id TEXT,
      client_name TEXT,
      items TEXT NOT NULL DEFAULT '[]',
      discount REAL NOT NULL DEFAULT 0,
      total_excl_tax REAL NOT NULL DEFAULT 0,
      vat_amount REAL NOT NULL DEFAULT 0,
      total_incl_tax REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Brouillon',
      payment_method TEXT,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT, address TEXT, postal_code TEXT, city TEXT, country TEXT,
      phone TEXT, email TEXT, vat_number TEXT, siret TEXT, website TEXT
    );

    CREATE TABLE IF NOT EXISTS price_guide (
      id TEXT PRIMARY KEY,
      gemstone_type TEXT NOT NULL,
      tier_name TEXT NOT NULL,
      min_price_per_carat REAL NOT NULL DEFAULT 0,
      max_price_per_carat REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  ensureForeignKeys(db);
  ensureSourceColumns(db);
  bootstrapIfEmpty(db);

  // Migration terminologie : 'Consignation' -> 'Confié' (terme du négoce). Idempotent.
  db.prepare("UPDATE gemstones SET status = 'Confié' WHERE status = 'Consignation'").run();

  return db;
}

// Migration : colonnes de traçabilité achat -> pierre (entrée directe en stock)
function ensureSourceColumns(conn: Database.Database) {
  const cols = (conn.pragma('table_info(gemstones)') as any[]).map(c => c.name);
  if (!cols.includes('source_purchase_id')) {
    console.log('[SQLite] Migration : ajout des colonnes de traçabilité achat -> pierre...');
    conn.exec(`
      ALTER TABLE gemstones ADD COLUMN source_purchase_id TEXT REFERENCES purchases(id) ON DELETE SET NULL;
      ALTER TABLE gemstones ADD COLUMN source_article_id TEXT;
    `);
  }
  if (!cols.includes('provenance')) {
    console.log('[SQLite] Migration : ajout de la colonne provenance...');
    conn.exec(`ALTER TABLE gemstones ADD COLUMN provenance TEXT;`);
    // Les pierres issues d'un achat sont identifiables par leur traçabilité
    conn.exec(`UPDATE gemstones SET provenance = 'Achat' WHERE source_purchase_id IS NOT NULL AND provenance IS NULL;`);
  }
}

/* ==========================================================================
   Migration : ajout des clés étrangères sur une base créée sans contraintes
   (SQLite ne supporte pas ALTER TABLE ADD CONSTRAINT : on reconstruit la table)
   ========================================================================== */

function ensureForeignKeys(conn: Database.Database) {
  const lotsFk = conn.pragma('foreign_key_list(lots)') as any[];
  const invFk = conn.pragma('foreign_key_list(sales_invoices)') as any[];
  if (lotsFk.length > 0 && invFk.length > 0) return;

  console.log('[SQLite] Migration : ajout des clés étrangères...');
  conn.pragma('foreign_keys = OFF');

  const migrate = conn.transaction(() => {
    if (lotsFk.length === 0) {
      const orphans = (conn.prepare(
        'SELECT COUNT(*) AS n FROM lots WHERE purchase_id NOT IN (SELECT id FROM purchases)'
      ).get() as { n: number }).n;
      if (orphans > 0) console.warn(`[SQLite] Migration : suppression de ${orphans} lot(s) de tri orphelin(s) sans achat parent`);

      conn.exec(`
        DELETE FROM lots WHERE purchase_id NOT IN (SELECT id FROM purchases);
        CREATE TABLE lots_new (
          id TEXT PRIMARY KEY,
          reference TEXT NOT NULL,
          purchase_id TEXT NOT NULL,
          purchase_article_id TEXT,
          gemstone_type TEXT,
          weight REAL NOT NULL DEFAULT 0,
          quantity INTEGER,
          average_size TEXT,
          average_color TEXT,
          average_clarity TEXT,
          cut_type TEXT,
          destination TEXT,
          date_created TEXT NOT NULL,
          notes TEXT,
          image TEXT,
          FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
        );
        INSERT INTO lots_new SELECT id, reference, purchase_id, purchase_article_id, gemstone_type,
          weight, quantity, average_size, average_color, average_clarity, cut_type,
          destination, date_created, notes, image FROM lots;
        DROP TABLE lots;
        ALTER TABLE lots_new RENAME TO lots;
        CREATE INDEX IF NOT EXISTS idx_lots_purchase ON lots(purchase_id);
      `);
    }

    if (invFk.length === 0) {
      conn.exec(`
        UPDATE sales_invoices SET client_id = NULL
          WHERE client_id = '' OR client_id NOT IN (SELECT id FROM clients);
        CREATE TABLE sales_invoices_new (
          id TEXT PRIMARY KEY,
          invoice_number TEXT NOT NULL,
          date TEXT NOT NULL,
          due_date TEXT,
          client_id TEXT,
          client_name TEXT,
          items TEXT NOT NULL DEFAULT '[]',
          discount REAL NOT NULL DEFAULT 0,
          total_excl_tax REAL NOT NULL DEFAULT 0,
          vat_amount REAL NOT NULL DEFAULT 0,
          total_incl_tax REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'Brouillon',
          payment_method TEXT,
          notes TEXT,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
        );
        INSERT INTO sales_invoices_new SELECT id, invoice_number, date, due_date, client_id, client_name,
          items, discount, total_excl_tax, vat_amount, total_incl_tax, status, payment_method, notes
          FROM sales_invoices;
        DROP TABLE sales_invoices;
        ALTER TABLE sales_invoices_new RENAME TO sales_invoices;
      `);
    }
  });
  migrate();

  conn.pragma('foreign_keys = ON');
  console.log('[SQLite] Migration terminée : clés étrangères actives.');
}

/* ==========================================================================
   Bootstrap : import de l'ancienne base JSON, sinon données de démonstration
   ========================================================================== */

function isDatabaseEmpty(conn: Database.Database): boolean {
  const tables = ['gemstones', 'purchases', 'lots', 'suppliers', 'clients', 'sales_invoices', 'company_settings'];
  return tables.every(t => (conn.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n === 0);
}

function bootstrapIfEmpty(conn: Database.Database) {
  if (!isDatabaseEmpty(conn)) return;

  if (fs.existsSync(LEGACY_JSON_PATH)) {
    console.log('[SQLite] Ancienne base JSON détectée : import des données...');
    try {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, 'utf-8'));
      importData(conn, legacy);
      fs.renameSync(LEGACY_JSON_PATH, LEGACY_JSON_PATH + '.imported');
      console.log('[SQLite] Import terminé. Fichier archivé en gemophy_database.json.imported');
      return;
    } catch (err) {
      console.error('[SQLite] Échec de l\'import JSON, insertion des données de démonstration :', err);
    }
  }

  console.log('[SQLite] Base vide : insertion des données de démonstration...');
  importData(conn, {
    gemstones: SEED_GEMSTONES,
    purchases: SEED_PURCHASES,
    lots: SEED_LOTS,
    suppliers: SEED_SUPPLIERS,
    clients: SEED_CLIENTS,
    salesInvoices: SEED_INVOICES,
    companySettings: SEED_COMPANY_SETTINGS
  });
}

interface ImportPayload {
  gemstones?: Gemstone[];
  purchases?: Purchase[];
  lots?: Lot[];
  suppliers?: Supplier[];
  clients?: Client[];
  salesInvoices?: SalesInvoice[];
  companySettings?: CompanySettings | null;
}

function importData(conn: Database.Database, data: ImportPayload) {
  const run = conn.transaction(() => {
    (data.gemstones || []).forEach(g => upsertGemstone(conn, g));
    (data.purchases || []).forEach(p => upsertPurchase(conn, p));
    (data.lots || []).forEach(l => upsertLot(conn, l));
    (data.suppliers || []).forEach(s => upsertSupplier(conn, s));
    (data.clients || []).forEach(c => upsertClient(conn, c));
    (data.salesInvoices || []).forEach(i => upsertInvoice(conn, i));
    if (data.companySettings) upsertCompanySettings(conn, data.companySettings);
  });
  run();
}

/* ==========================================================================
   Mappers ligne SQL <-> objet métier
   ========================================================================== */

function rowToGemstone(r: any): Gemstone {
  return {
    id: r.id,
    reference: r.reference,
    type: r.type,
    weight: r.weight,
    cut: r.cut ?? '',
    color: r.color ?? '',
    clarity: r.clarity ?? '',
    dimensions: { length: r.dim_length, width: r.dim_width, depth: r.dim_depth },
    refractiveIndex: r.refractive_index ?? '',
    specificGravity: r.specific_gravity,
    treatment: r.treatment ?? '',
    origin: r.origin ?? '',
    certificate: { authority: r.cert_authority ?? 'Sans', number: r.cert_number ?? '' },
    costPrice: r.cost_price,
    sellingPrice: r.selling_price,
    status: r.status,
    dealer: r.dealer ?? '',
    dateAdded: r.date_added,
    description: r.description ?? '',
    inclusions: JSON.parse(r.inclusions || '[]'),
    image: r.image ?? undefined,
    recuttings: r.recuttings ? JSON.parse(r.recuttings) : undefined,
    sourcePurchaseId: r.source_purchase_id ?? undefined,
    sourceArticleId: r.source_article_id ?? undefined,
    provenance: r.provenance ?? undefined
  };
}

function upsertGemstone(conn: Database.Database, g: Gemstone) {
  conn.prepare(`
    INSERT OR REPLACE INTO gemstones (
      id, reference, type, weight, cut, color, clarity,
      dim_length, dim_width, dim_depth, refractive_index, specific_gravity,
      treatment, origin, cert_authority, cert_number,
      cost_price, selling_price, status, dealer, date_added, description,
      inclusions, image, recuttings, source_purchase_id, source_article_id, provenance
    ) VALUES (
      @id, @reference, @type, @weight, @cut, @color, @clarity,
      @dimLength, @dimWidth, @dimDepth, @refractiveIndex, @specificGravity,
      @treatment, @origin, @certAuthority, @certNumber,
      @costPrice, @sellingPrice, @status, @dealer, @dateAdded, @description,
      @inclusions, @image, @recuttings, @sourcePurchaseId, @sourceArticleId, @provenance
    )
  `).run({
    id: g.id,
    reference: g.reference,
    type: g.type,
    weight: g.weight ?? 0,
    cut: g.cut ?? '',
    color: g.color ?? '',
    clarity: g.clarity ?? '',
    dimLength: g.dimensions?.length ?? 0,
    dimWidth: g.dimensions?.width ?? 0,
    dimDepth: g.dimensions?.depth ?? 0,
    refractiveIndex: g.refractiveIndex ?? '',
    specificGravity: g.specificGravity ?? 0,
    treatment: g.treatment ?? '',
    origin: g.origin ?? '',
    certAuthority: g.certificate?.authority ?? 'Sans',
    certNumber: g.certificate?.number ?? '',
    costPrice: g.costPrice ?? 0,
    sellingPrice: g.sellingPrice ?? 0,
    status: g.status ?? 'Disponible',
    dealer: g.dealer ?? '',
    dateAdded: g.dateAdded ?? new Date().toISOString(),
    description: g.description ?? '',
    inclusions: JSON.stringify(g.inclusions ?? []),
    image: g.image ?? null,
    recuttings: g.recuttings ? JSON.stringify(g.recuttings) : null,
    sourcePurchaseId: g.sourcePurchaseId ?? null,
    sourceArticleId: g.sourceArticleId ?? null,
    provenance: g.provenance ?? null
  });
}

function rowToPurchase(r: any): Purchase {
  return {
    id: r.id,
    reference: r.reference,
    supplier: r.supplier ?? '',
    date: r.date,
    status: r.status,
    totalCost: r.total_cost,
    articles: JSON.parse(r.articles || '[]'),
    notes: r.notes ?? undefined
  };
}

function upsertPurchase(conn: Database.Database, p: Purchase) {
  // ON CONFLICT DO UPDATE (et non INSERT OR REPLACE, qui supprime puis réinsère
  // la ligne et déclencherait la cascade de suppression des lots de tri liés)
  conn.prepare(`
    INSERT INTO purchases (id, reference, supplier, date, status, total_cost, articles, notes)
    VALUES (@id, @reference, @supplier, @date, @status, @totalCost, @articles, @notes)
    ON CONFLICT(id) DO UPDATE SET
      reference = excluded.reference,
      supplier = excluded.supplier,
      date = excluded.date,
      status = excluded.status,
      total_cost = excluded.total_cost,
      articles = excluded.articles,
      notes = excluded.notes
  `).run({
    id: p.id,
    reference: p.reference,
    supplier: p.supplier ?? '',
    date: p.date ?? new Date().toISOString(),
    status: p.status ?? 'Incomplet',
    totalCost: p.totalCost ?? 0,
    articles: JSON.stringify(p.articles ?? []),
    notes: p.notes ?? null
  });
}

function rowToLot(r: any): Lot {
  return {
    id: r.id,
    reference: r.reference,
    purchaseId: r.purchase_id,
    purchaseArticleId: r.purchase_article_id ?? '',
    gemstoneType: r.gemstone_type ?? '',
    weight: r.weight,
    quantity: r.quantity ?? undefined,
    averageSize: r.average_size ?? undefined,
    averageColor: r.average_color ?? undefined,
    averageClarity: r.average_clarity ?? undefined,
    cutType: r.cut_type ?? undefined,
    destination: r.destination ?? '',
    dateCreated: r.date_created,
    notes: r.notes ?? undefined,
    image: r.image ?? undefined
  };
}

function upsertLot(conn: Database.Database, l: Lot) {
  conn.prepare(`
    INSERT OR REPLACE INTO lots (
      id, reference, purchase_id, purchase_article_id, gemstone_type, weight,
      quantity, average_size, average_color, average_clarity, cut_type,
      destination, date_created, notes, image
    ) VALUES (
      @id, @reference, @purchaseId, @purchaseArticleId, @gemstoneType, @weight,
      @quantity, @averageSize, @averageColor, @averageClarity, @cutType,
      @destination, @dateCreated, @notes, @image
    )
  `).run({
    id: l.id,
    reference: l.reference,
    purchaseId: l.purchaseId,
    purchaseArticleId: l.purchaseArticleId ?? '',
    gemstoneType: l.gemstoneType ?? '',
    weight: l.weight ?? 0,
    quantity: l.quantity ?? null,
    averageSize: l.averageSize ?? null,
    averageColor: l.averageColor ?? null,
    averageClarity: l.averageClarity ?? null,
    cutType: l.cutType ?? null,
    destination: l.destination ?? '',
    dateCreated: l.dateCreated ?? new Date().toISOString(),
    notes: l.notes ?? null,
    image: l.image ?? null
  });
}

function rowToSupplier(r: any): Supplier {
  return {
    id: r.id,
    name: r.name,
    contactName: r.contact_name ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    country: r.country ?? undefined,
    vatNumber: r.vat_number ?? undefined,
    notes: r.notes ?? undefined,
    dateAdded: r.date_added
  };
}

function upsertSupplier(conn: Database.Database, s: Supplier) {
  conn.prepare(`
    INSERT OR REPLACE INTO suppliers (id, name, contact_name, email, phone, address, city, country, vat_number, notes, date_added)
    VALUES (@id, @name, @contactName, @email, @phone, @address, @city, @country, @vatNumber, @notes, @dateAdded)
  `).run({
    id: s.id,
    name: s.name,
    contactName: s.contactName ?? null,
    email: s.email ?? null,
    phone: s.phone ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    country: s.country ?? null,
    vatNumber: s.vatNumber ?? null,
    notes: s.notes ?? null,
    dateAdded: s.dateAdded ?? new Date().toISOString()
  });
}

function rowToClient(r: any): Client {
  return {
    id: r.id,
    name: r.name,
    contactName: r.contact_name ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    city: r.city ?? undefined,
    postalCode: r.postal_code ?? undefined,
    country: r.country ?? undefined,
    vatNumber: r.vat_number ?? undefined,
    notes: r.notes ?? undefined,
    dateAdded: r.date_added
  };
}

function upsertClient(conn: Database.Database, c: Client) {
  // ON CONFLICT DO UPDATE (et non INSERT OR REPLACE, qui supprime puis réinsère
  // la ligne et mettrait à NULL le client_id des factures liées)
  conn.prepare(`
    INSERT INTO clients (id, name, contact_name, email, phone, address, city, postal_code, country, vat_number, notes, date_added)
    VALUES (@id, @name, @contactName, @email, @phone, @address, @city, @postalCode, @country, @vatNumber, @notes, @dateAdded)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      contact_name = excluded.contact_name,
      email = excluded.email,
      phone = excluded.phone,
      address = excluded.address,
      city = excluded.city,
      postal_code = excluded.postal_code,
      country = excluded.country,
      vat_number = excluded.vat_number,
      notes = excluded.notes,
      date_added = excluded.date_added
  `).run({
    id: c.id,
    name: c.name,
    contactName: c.contactName ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    postalCode: c.postalCode ?? null,
    country: c.country ?? null,
    vatNumber: c.vatNumber ?? null,
    notes: c.notes ?? null,
    dateAdded: c.dateAdded ?? new Date().toISOString()
  });
}

function rowToInvoice(r: any): SalesInvoice {
  return {
    id: r.id,
    invoiceNumber: r.invoice_number,
    date: r.date,
    dueDate: r.due_date ?? '',
    clientId: r.client_id ?? '',
    clientName: r.client_name ?? '',
    items: JSON.parse(r.items || '[]'),
    discount: r.discount,
    totalExclTax: r.total_excl_tax,
    vatAmount: r.vat_amount,
    totalInclTax: r.total_incl_tax,
    status: r.status,
    paymentMethod: r.payment_method ?? 'Autre',
    notes: r.notes ?? undefined
  };
}

function upsertInvoice(conn: Database.Database, inv: SalesInvoice) {
  conn.prepare(`
    INSERT OR REPLACE INTO sales_invoices (
      id, invoice_number, date, due_date, client_id, client_name, items,
      discount, total_excl_tax, vat_amount, total_incl_tax, status, payment_method, notes
    ) VALUES (
      @id, @invoiceNumber, @date, @dueDate, @clientId, @clientName, @items,
      @discount, @totalExclTax, @vatAmount, @totalInclTax, @status, @paymentMethod, @notes
    )
  `).run({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date ?? new Date().toISOString(),
    dueDate: inv.dueDate ?? null,
    clientId: inv.clientId || null,
    clientName: inv.clientName ?? null,
    items: JSON.stringify(inv.items ?? []),
    discount: inv.discount ?? 0,
    totalExclTax: inv.totalExclTax ?? 0,
    vatAmount: inv.vatAmount ?? 0,
    totalInclTax: inv.totalInclTax ?? 0,
    status: inv.status ?? 'Brouillon',
    paymentMethod: inv.paymentMethod ?? 'Autre',
    notes: inv.notes ?? null
  });
}

function upsertCompanySettings(conn: Database.Database, s: CompanySettings) {
  conn.prepare(`
    INSERT OR REPLACE INTO company_settings (id, name, address, postal_code, city, country, phone, email, vat_number, siret, website)
    VALUES (1, @name, @address, @postalCode, @city, @country, @phone, @email, @vatNumber, @siret, @website)
  `).run({
    name: s.name ?? '',
    address: s.address ?? '',
    postalCode: s.postalCode ?? '',
    city: s.city ?? '',
    country: s.country ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    vatNumber: s.vatNumber ?? '',
    siret: s.siret ?? '',
    website: s.website ?? ''
  });
}

/* ==========================================================================
   API publique (mêmes signatures que l'ancienne couche JSON)
   ========================================================================== */

export async function getDb(): Promise<{ status: string }> {
  getConnection();
  return { status: 'loaded' };
}

export async function getAllGemstones(): Promise<Gemstone[]> {
  return getConnection()
    .prepare('SELECT * FROM gemstones ORDER BY date_added DESC')
    .all()
    .map(rowToGemstone);
}

export async function saveGemstone(gem: Gemstone): Promise<void> {
  upsertGemstone(getConnection(), gem);
}

export async function deleteGemstone(id: string): Promise<void> {
  getConnection().prepare('DELETE FROM gemstones WHERE id = ?').run(id);
}

export async function getAllPurchases(): Promise<Purchase[]> {
  return getConnection()
    .prepare('SELECT * FROM purchases ORDER BY date DESC')
    .all()
    .map(rowToPurchase);
}

export async function savePurchase(p: Purchase): Promise<void> {
  const conn = getConnection();
  const run = conn.transaction(() => {
    upsertPurchase(conn, p);
    createDirectEntryGemstones(conn, p);
  });
  run();
}

// Pour chaque article "pierre unique -> entrée directe en stock", crée la fiche
// pierre à l'inventaire. Idempotent : un article déjà converti (source_article_id
// présent) n'est jamais recréé, même si l'achat est modifié et réenregistré.
function createDirectEntryGemstones(conn: Database.Database, p: Purchase) {
  const findBySource = conn.prepare('SELECT id FROM gemstones WHERE source_article_id = ?');
  (p.articles ?? []).forEach(art => {
    if (art.entryMode !== 'stock') return;
    if (findBySource.get(art.id)) return;

    upsertGemstone(conn, {
      id: `gem-src-${art.id}`,
      reference: generateStoneReference(conn, art.gemstoneType, p.date),
      type: art.gemstoneType,
      weight: art.weight ?? 0,
      cut: '',
      color: '',
      clarity: '',
      dimensions: { length: 0, width: 0, depth: 0 },
      refractiveIndex: '',
      specificGravity: 0,
      treatment: '',
      origin: '',
      certificate: { authority: 'Sans', number: '' },
      costPrice: art.totalPrice ?? 0,
      sellingPrice: 0,
      status: 'Disponible',
      dealer: p.supplier ?? '',
      dateAdded: p.date ?? new Date().toISOString().split('T')[0],
      description: `Entrée directe en stock depuis l'achat ${p.reference} — ${art.name}`,
      inclusions: [],
      sourcePurchaseId: p.id,
      sourceArticleId: art.id,
      provenance: 'Achat'
    });
  });
}

// Génère une référence unique du type PP-2026-EME-004 (année d'achat + variété abrégée)
function generateStoneReference(conn: Database.Database, gemstoneType: string, dateStr?: string): string {
  const year = (dateStr || new Date().toISOString()).slice(0, 4);
  const code = (gemstoneType || 'GEM')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z]/g, '')
    .slice(0, 3) || 'GEM';
  const exists = conn.prepare('SELECT 1 FROM gemstones WHERE reference = ?');
  let n = (conn.prepare('SELECT COUNT(*) AS n FROM gemstones').get() as { n: number }).n + 1;
  let ref: string;
  do {
    ref = `PP-${year}-${code}-${String(n).padStart(3, '0')}`;
    n++;
  } while (exists.get(ref));
  return ref;
}

export async function deletePurchase(id: string): Promise<void> {
  getConnection().prepare('DELETE FROM purchases WHERE id = ?').run(id);
}

export async function getAllLots(): Promise<Lot[]> {
  return getConnection()
    .prepare('SELECT * FROM lots ORDER BY date_created DESC')
    .all()
    .map(rowToLot);
}

export async function saveLot(l: Lot): Promise<void> {
  upsertLot(getConnection(), l);
}

export async function deleteLot(id: string): Promise<void> {
  getConnection().prepare('DELETE FROM lots WHERE id = ?').run(id);
}

export async function deleteLotsByPurchaseId(purchaseId: string): Promise<void> {
  getConnection().prepare('DELETE FROM lots WHERE purchase_id = ?').run(purchaseId);
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  return getConnection()
    .prepare('SELECT * FROM suppliers ORDER BY date_added DESC')
    .all()
    .map(rowToSupplier);
}

export async function saveSupplier(s: Supplier): Promise<void> {
  upsertSupplier(getConnection(), s);
}

export async function deleteSupplier(id: string): Promise<void> {
  getConnection().prepare('DELETE FROM suppliers WHERE id = ?').run(id);
}

export async function getAllClients(): Promise<Client[]> {
  return getConnection()
    .prepare('SELECT * FROM clients ORDER BY date_added DESC')
    .all()
    .map(rowToClient);
}

export async function saveClient(c: Client): Promise<void> {
  upsertClient(getConnection(), c);
}

export async function deleteClient(id: string): Promise<void> {
  getConnection().prepare('DELETE FROM clients WHERE id = ?').run(id);
}

export async function getAllSalesInvoices(): Promise<SalesInvoice[]> {
  return getConnection()
    .prepare('SELECT * FROM sales_invoices ORDER BY date DESC')
    .all()
    .map(rowToInvoice);
}

export async function saveSalesInvoice(inv: SalesInvoice): Promise<void> {
  const conn = getConnection();
  const run = conn.transaction(() => {
    upsertInvoice(conn, inv);

    // Marque automatiquement les pierres référencées comme vendues (facture payée ou en attente)
    if (inv.status === 'Payée' || inv.status === 'En attente') {
      const markSold = conn.prepare("UPDATE gemstones SET status = 'Vendu' WHERE id = ?");
      (inv.items ?? []).forEach(item => {
        if (item.gemstoneId) markSold.run(item.gemstoneId);
      });
    }
  });
  run();
}

export async function deleteSalesInvoice(id: string): Promise<void> {
  getConnection().prepare('DELETE FROM sales_invoices WHERE id = ?').run(id);
}

export async function getAllPriceGuideEntries(): Promise<PriceGuideEntry[]> {
  return getConnection()
    .prepare('SELECT * FROM price_guide ORDER BY gemstone_type, sort_order, tier_name')
    .all()
    .map((r: any) => ({
      id: r.id,
      gemstoneType: r.gemstone_type,
      tierName: r.tier_name,
      minPricePerCarat: r.min_price_per_carat,
      maxPricePerCarat: r.max_price_per_carat,
      notes: r.notes ?? undefined,
      sortOrder: r.sort_order
    }));
}

export async function savePriceGuideEntry(entry: PriceGuideEntry): Promise<void> {
  getConnection().prepare(`
    INSERT OR REPLACE INTO price_guide (id, gemstone_type, tier_name, min_price_per_carat, max_price_per_carat, notes, sort_order)
    VALUES (@id, @gemstoneType, @tierName, @minPricePerCarat, @maxPricePerCarat, @notes, @sortOrder)
  `).run({
    id: entry.id,
    gemstoneType: entry.gemstoneType,
    tierName: entry.tierName,
    minPricePerCarat: entry.minPricePerCarat ?? 0,
    maxPricePerCarat: entry.maxPricePerCarat ?? 0,
    notes: entry.notes ?? null,
    sortOrder: entry.sortOrder ?? 0
  });
}

export async function deletePriceGuideEntry(id: string): Promise<void> {
  getConnection().prepare('DELETE FROM price_guide WHERE id = ?').run(id);
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const r: any = getConnection().prepare('SELECT * FROM company_settings WHERE id = 1').get();
  if (!r) return null;
  return {
    name: r.name ?? '',
    address: r.address ?? '',
    postalCode: r.postal_code ?? '',
    city: r.city ?? '',
    country: r.country ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    vatNumber: r.vat_number ?? '',
    siret: r.siret ?? '',
    website: r.website ?? ''
  };
}

export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  upsertCompanySettings(getConnection(), settings);
}

/* ==========================================================================
   Données de démonstration (premier lancement uniquement)
   ========================================================================== */

const SEED_COMPANY_SETTINGS: CompanySettings = {
  name: 'Gemophy',
  address: '12 Rue de la Paix',
  postalCode: '75002',
  city: 'Paris',
  country: 'France',
  phone: '+33 1 23 45 67 89',
  email: 'contact@gemophy.app',
  vatNumber: 'FR32 123456789',
  siret: '123 456 789 00012',
  website: 'www.gemophy.app'
};

const SEED_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Muzo Mining Syndicate',
    contactName: 'Carlos Escobar',
    email: 'carlos@muzomining.co',
    phone: '+57 1 345 6789',
    address: 'Calle 12 #4-56',
    city: 'Bogotá',
    country: 'Colombie',
    vatNumber: 'CO-998877665',
    notes: "Fournisseur historique d'émeraudes naturelles de haute qualité.",
    dateAdded: '2025-01-10T12:00:00Z'
  },
  {
    id: 'SUP-002',
    name: 'Ceylon Direct Gems',
    contactName: 'Arjuna Ranasinghe',
    email: 'arjuna@ceylondirect.lk',
    phone: '+94 11 234 5678',
    address: '88 Galle Road',
    city: 'Colombo',
    country: 'Sri Lanka',
    vatNumber: 'LK-334455667',
    notes: 'Spécialiste de saphirs bleus non chauffés et certifiés.',
    dateAdded: '2025-02-15T10:30:00Z'
  },
  {
    id: 'SUP-003',
    name: 'East Africa Gems Ltd',
    contactName: 'Juma Mwangi',
    email: 'info@eastafricagems.com',
    phone: '+255 22 987 6543',
    address: '12-14 Jamhuri St',
    city: 'Dar es Salaam',
    country: 'Tanzanie',
    vatNumber: 'TZ-112233445',
    notes: 'Spécialiste Tanzanite (Merelani) et Spinelle rouge (Mahenge).',
    dateAdded: '2025-03-05T08:15:00Z'
  }
];

const SEED_CLIENTS: Client[] = [
  {
    id: 'CLI-001',
    name: 'Atelier de Haute Joaillerie Paris',
    contactName: 'Jean-Pierre Laurent',
    email: 'jp.laurent@joaillerieparis.fr',
    phone: '+33 1 42 61 55 55',
    address: '15 Place Vendôme',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
    vatNumber: 'FR-88123456789',
    notes: 'Client VIP. Commandes régulières de saphirs et rubis calibrés.',
    dateAdded: '2025-01-20T14:45:00Z'
  },
  {
    id: 'CLI-002',
    name: 'Gem & Aura Design',
    contactName: 'Elena Rostova',
    email: 'elena@gemaura-design.ch',
    phone: '+41 22 731 22 11',
    address: '42 Rue du Rhône',
    city: 'Genève',
    postalCode: '1204',
    country: 'Suisse',
    vatNumber: 'CHE-554.432.112 TVA',
    notes: 'Maison suisse cherchant des pièces uniques certifiées SSEF/Gubelin.',
    dateAdded: '2025-03-12T16:20:00Z'
  }
];

const SEED_INVOICES: SalesInvoice[] = [
  {
    id: 'INV-2026-001',
    invoiceNumber: 'FAC-2026-001',
    date: '2026-06-01',
    dueDate: '2026-07-01',
    clientId: 'CLI-001',
    clientName: 'Atelier de Haute Joaillerie Paris',
    items: [
      {
        id: 'INV-ITEM-001',
        gemstoneId: 'gem-002',
        description: 'Saphir Royal Blue Ovale Sri Lanka (Ceylan) - Réf: GEM-SAP-002',
        weight: 2.45,
        quantity: 1,
        unitPrice: 8500,
        vatRate: 20,
        totalAmount: 8500
      }
    ],
    discount: 500,
    totalExclTax: 8000,
    vatAmount: 1600,
    totalInclTax: 9600,
    status: 'Payée',
    paymentMethod: 'Virement',
    notes: 'Vente directe au salon de Genève. Certificat GIA joint.'
  }
];
