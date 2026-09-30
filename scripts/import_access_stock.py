# -*- coding: utf-8 -*-
"""
Import du stock Access (Data.mdb) vers GemoMix Suite.

Deux étapes, volontairement séparées :

  export : lit Data.mdb (sur une COPIE, jamais l'original) et produit un fichier JSON
           + un rapport de contrôle. N'écrit rien dans GemoMix.
  load   : envoie le JSON vers GemoMix par l'API (POST /api/gemstones). Idempotent :
           une pierre déjà présente (ou archivée) n'est jamais réécrite.

Règles de conversion (stock Access = table LOT) :
  - stock actif = FLAG 'N' (non classé) et POIDS > 0  [--include-classes ajoute FLAG 'C']
  - variété = colonne GROSSEUR (libellée « Catégorie » dans l'application Access)
  - les prix Access (PRIXACH, PRIXVENTE) sont AU CARAT : valeur GemoMix = prix x poids restant
  - poids = POIDS (poids restant ; POIDSINIT = poids d'origine, cité dans la description)

Usage :
  python scripts/import_access_stock.py export [--mdb C:\\Access\\Data\\Data.mdb] [--include-classes]
  python scripts/import_access_stock.py csv    [--mdb ...]   (liste d'analyse pour Excel)
  python scripts/import_access_stock.py load   [--url http://localhost:3000] [--dry-run] [--decisions Stock_a_valider.xlsx]

Avec --decisions, la colonne « Décision » du tableau renvoyé pilote le chargement : « Importer tel quel »,
« Corriger puis importer » (les valeurs modifiées dans le tableau sont reprises), « Ne pas importer », « À revoir ensemble »
(ignorée). Une ligne signalée (anomalie, prix de vente < achat) SANS décision n'est pas importée ; une ligne non signalée
sans décision est importée telle quelle. Refaire « export » juste avant, puis « load --dry-run --decisions ... » d'abord.
"""
import argparse, collections, datetime, json, os, re, shutil, sys, tempfile, unicodedata, urllib.request, urllib.error

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'import-access', 'out')
OUT_FILE = os.path.join(OUT_DIR, 'stock_access.json')
DRIVER = '{Microsoft Access Driver (*.mdb, *.accdb)}'


def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def normalize_variety(grosseur):
    """GROSSEUR Access -> (variété GemoMix, précision de couleur/grade)."""
    raw = (grosseur or '').strip()
    key = strip_accents(raw).lower()
    occasion = key.startswith('occasion')
    if occasion:
        raw = raw[len('occasion'):].strip()
        key = strip_accents(raw).lower()
    families = [('diamant', 'Diamant'), ('saphir', 'Saphir'), ('rubis', 'Rubis'), ('emeraude', 'Émeraude'),
               ('tanzanite', 'Tanzanite'), ('spinelle', 'Spinelle'), ('tourmaline', 'Tourmaline'), ('topaze', 'Topaze')]
    for prefix, label in families:
        if key.startswith(prefix):
            rest = raw[len(prefix):].lstrip('s ').strip()   # « Saphirs » -> Saphir, « Saphir Vert » -> Vert
            return label, rest
    return (raw or 'Autre (Saisir)'), ''


def money(x):
    return round(float(x or 0), 2)


def export(args):
    import pyodbc
    src = args.mdb
    if not os.path.isfile(src):
        sys.exit('Fichier introuvable : %s' % src)
    tmp = os.path.join(tempfile.gettempdir(), 'gemomix_import_data_copy.mdb')
    shutil.copyfile(src, tmp)            # on ne lit jamais l'original
    conn = pyodbc.connect('DRIVER=%s;DBQ=%s;ReadOnly=1;' % (DRIVER, tmp))
    cur = conn.cursor()

    flags = "('N','C')" if args.include_classes else "('N')"
    cur.execute("""SELECT REFERENCE, GROSSEUR, TAILLE, POIDSINIT, POIDS, PRIXACH, PRIXVENTE,
                          DATACH, FOURNISSEUR, NOPIECE, FLAG, POSITION
                   FROM LOT WHERE POIDS > 0.001 AND FLAG IN %s ORDER BY DATACH, REFERENCE""" % flags)
    rows = cur.fetchall()

    gems, anomalies = [], []
    varieties = collections.Counter()
    for (ref, grosseur, taille, poidsinit, poids, prixach, prixvente, datach, fourn, nopiece, flag, position) in rows:
        ref = (ref or '').strip()
        if not ref:
            anomalies.append('Ligne sans référence ignorée (fournisseur %s, poids %s)' % (fourn, poids))
            continue
        vtype, vcolor = normalize_variety(grosseur)
        varieties[(grosseur, vtype, vcolor)] += 1
        weight = round(float(poids), 2)
        desc = "Importé d'Access97 - lot %s" % ref
        if nopiece:
            desc += ", achat interne n° %s" % str(nopiece).strip()
        if poidsinit and round(float(poidsinit), 2) > weight:
            desc += " (poids d'origine %.2f ct, reste %.2f ct)" % (float(poidsinit), weight)
        if flag == 'C':
            desc += " [classé dans Access]"
        gems.append({
            'id': 'gem-access-' + re.sub(r'[^A-Za-z0-9_-]', '_', ref),
            'reference': ref,
            'type': vtype,
            'weight': weight,
            'cut': (taille or '').strip(),
            'color': vcolor,
            'clarity': '',
            'dimensions': {'length': 0, 'width': 0, 'depth': 0},
            'refractiveIndex': '',
            'specificGravity': 0,
            'treatment': '',
            'origin': '',
            'certificate': {'authority': 'Sans', 'number': ''},
            'costPrice': money(float(prixach or 0) * weight),
            'sellingPrice': money(float(prixvente or 0) * weight),
            'status': 'Disponible',
            'dealer': (fourn or '').strip(),
            'dateAdded': datach.strftime('%Y-%m-%d') if datach else datetime.date.today().isoformat(),
            'description': desc,
            'inclusions': [],
            'provenance': 'Stock initial',
            'location': '' if (position or 'STOCK').strip().upper() == 'STOCK' else position.strip(),
            # prix au carat exacts d'Access (servent à détecter une correction faite dans le tableau ; jamais envoyés)
            '_pachCt': float(prixach or 0),
            '_pvteCt': float(prixvente or 0),
        })

    os.makedirs(OUT_DIR, exist_ok=True)
    payload = {'generatedAt': datetime.datetime.now().isoformat(timespec='seconds'),
               'source': src, 'includeClasses': bool(args.include_classes), 'gemstones': gems}
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)

    # ------------------------------------------------------------------ rapport
    n = len(gems)
    print('=== RAPPORT D\'EXPORT (rien n\'a été écrit dans GemoMix) ===')
    print('Source        : %s (copie lue en lecture seule)' % src)
    print('Pierres       : %d   |   poids total : %.2f ct' % (n, sum(g['weight'] for g in gems)))
    print('Coût d\'achat  : %s EUR   |   valeur de vente estimée : %s EUR' % (
        format(sum(g['costPrice'] for g in gems), ',.0f').replace(',', ' '),
        format(sum(g['sellingPrice'] for g in gems), ',.0f').replace(',', ' ')))
    print('\nPar variété :')
    for t, c in collections.Counter(g['type'] for g in gems).most_common():
        print('   %-14s %4d' % (t, c))
    print('\nConversion des catégories Access :')
    for (raw, t, col), c in sorted(varieties.items(), key=lambda kv: -kv[1]):
        print('   %-24r -> variété %-10s précision %-14r (%d)' % (raw, t, col, c))
    no_price = [g['reference'] for g in gems if g['sellingPrice'] == 0]
    no_cut = [g['reference'] for g in gems if not g['cut']]
    no_cost = [g['reference'] for g in gems if g['costPrice'] == 0]
    print('\nÀ compléter après import :')
    print('   sans prix de vente : %d   |   sans taille : %d   |   sans prix d\'achat : %d' % (len(no_price), len(no_cut), len(no_cost)))
    print('   (couleur/pureté, certificat, origine : absents d\'Access pour ces pierres)')
    print('\nFournisseurs distincts : %d' % len({g['dealer'] for g in gems}))
    for a in anomalies:
        print('ANOMALIE :', a)
    print('\nFichier écrit : %s' % OUT_FILE)


def csv_export(args):
    """CSV d'analyse (Excel français : séparateur « ; », virgule décimale, UTF-8 avec BOM)."""
    import csv, pyodbc
    if not os.path.isfile(args.mdb):
        sys.exit('Fichier introuvable : %s' % args.mdb)
    tmp = os.path.join(tempfile.gettempdir(), 'gemomix_import_data_copy.mdb')
    shutil.copyfile(args.mdb, tmp)
    cur = pyodbc.connect('DRIVER=%s;DBQ=%s;ReadOnly=1;' % (DRIVER, tmp)).cursor()
    cur.execute("""SELECT FLAG, REFERENCE, GROSSEUR, TAILLE, POIDSINIT, POIDS, PRIXACH, PRIXVENTE,
                          FOURNISSEUR, NOPIECE, DATACH, DATECLASSEMENT, POSITION
                   FROM LOT WHERE POIDS > 0.001 AND FLAG IN ('N','C') ORDER BY FLAG, REFERENCE""")
    fr = lambda x, nd=2: ('%.*f' % (nd, x)).replace('.', ',') if x is not None else ''
    d = lambda x: x.strftime('%d/%m/%Y') if x else ''
    header = ['Statut Access', 'Référence', 'Catégorie Access', 'Variété GemoMix', 'Précision', 'Taille',
              'Poids origine (ct)', 'Poids restant (ct)', 'Prix achat /ct (EUR)', 'Prix vente /ct (EUR)',
              'Coût restant (EUR)', 'Valeur vente restante (EUR)', 'Fournisseur', 'N° achat interne',
              'Date achat', 'Date classement', 'Position', 'Observations', 'Prix vente < prix achat', 'Décision (à remplir)']
    out_rows, counts = [], collections.Counter()
    for (flag, ref, gros, taille, pinit, poids, pach, pvte, fourn, nopiece, datach, dclass, position) in cur.fetchall():
        vtype, vcol = normalize_variety(gros)
        obs = []
        if flag == 'C':
            if poids <= 0.1:
                obs.append("Résidu d'arrondi (<= 0,1 ct) : lot soldé en pratique")
            else:
                obs.append('A VERIFIER : lot classé mais poids restant significatif')
            if not dclass:
                obs.append('classé sans date de classement')
        else:
            if pinit and poids < pinit - 0.005:
                obs.append('Vendu en partie')
            if not pvte:
                obs.append('Sans prix de vente')
            if not (taille or '').strip():
                obs.append('Sans taille')
            if pvte and pach and pvte < pach:
                obs.append("Prix de vente inférieur au prix d'achat")
        if pinit is not None and poids > pinit + 0.005:
            obs.append("ANOMALIE : poids restant > poids d'origine")
        status = 'Actif (non classé)' if flag == 'N' else 'Classé avec poids'
        counts[status] += 1
        out_rows.append([status, (ref or '').strip(), (gros or '').strip(), vtype, vcol, (taille or '').strip(),
                         fr(pinit), fr(poids), fr(pach), fr(pvte), fr((pach or 0) * poids), fr((pvte or 0) * poids),
                         (fourn or '').strip(), str(nopiece or '').strip(), d(datach), d(dclass),
                         (position or '').strip(), ' ; '.join(obs),
                         'OUI' if (pvte and pach and pvte < pach) else '', ''])
    # les cas à vérifier en premier, puis le reste
    out_rows.sort(key=lambda r: (0 if ('A VERIFIER' in r[17] or 'ANOMALIE' in r[17]) else 1, r[0], r[1]))
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, 'stock_access_analyse.csv')
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(header)
        w.writerows(out_rows)
    print('CSV écrit : %s' % path)
    for k, v in counts.items():
        print('   %-22s %d' % (k, v))
    print('   à vérifier / anomalies : %d' % sum(1 for r in out_rows if ('A VERIFIER' in r[17] or 'ANOMALIE' in r[17])))


def _num(x):
    """Nombre lu dans une cellule Excel (float) ou un CSV français (« 1 200,50 »). None si vide."""
    if x is None or x == '':
        return None
    if isinstance(x, (int, float)):
        return float(x)
    try:
        return float(str(x).replace(' ', '').replace(' ', '').replace(',', '.'))
    except ValueError:
        return None


def read_decisions(path):
    """Lit le tableau renvoyé par Laurent (.xlsx, tous les onglets, ou .csv).
    Retourne {référence: {decision, poids, pach, pvte, taille, signale}} ; la dernière décision non vide
    d'une même référence l'emporte, un désaccord entre onglets est signalé dans 'conflits'."""
    rows = []
    if path.lower().endswith('.csv'):
        import csv
        with open(path, encoding='utf-8-sig', newline='') as f:
            rows.append(list(csv.reader(f, delimiter=';')))
    else:
        try:
            import openpyxl
        except ImportError:
            sys.exit("Lecture d'un .xlsx : installez openpyxl (py -3.11 -m pip install openpyxl) ou enregistrez le fichier en .csv (séparateur « ; »).")
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        for ws in wb.worksheets:
            rows.append([list(r) for r in ws.iter_rows(values_only=True)])
    out, conflits = {}, []
    for sheet in rows:
        if not sheet:
            continue
        head = [strip_accents(str(c or '')).lower().strip() for c in sheet[0]]

        def col(prefix):
            for i, h in enumerate(head):
                if h.startswith(prefix):
                    return i
            return None
        c_ref, c_dec = col('reference'), col('decision')
        if c_ref is None or c_dec is None:
            continue
        c_poids, c_pach, c_pvte, c_taille = col('poids restant'), col('prix achat'), col('prix vente /ct'), col('taille')
        c_obs, c_vla = col('observations'), col('prix vente <')
        for r in sheet[1:]:
            r = list(r) + [None] * (len(head) - len(r))
            ref = str(r[c_ref] or '').strip()
            if not ref:
                continue
            obs = str(r[c_obs] or '') if c_obs is not None else ''
            signale = ('ANOMALIE' in obs or 'A VERIFIER' in obs
                       or (c_vla is not None and str(r[c_vla] or '').strip().upper() == 'OUI'))
            dec = strip_accents(str(r[c_dec] or '')).lower().strip()
            item = {'decision': dec, 'signale': signale,
                    'poids': _num(r[c_poids]) if c_poids is not None else None,
                    'pach': _num(r[c_pach]) if c_pach is not None else None,
                    'pvte': _num(r[c_pvte]) if c_pvte is not None else None,
                    'taille': str(r[c_taille] or '').strip() if c_taille is not None else None}
            prev = out.get(ref)
            if prev and prev['decision'] and dec and prev['decision'] != dec:
                conflits.append(ref)
            if dec or not prev:
                out[ref] = item
            elif prev:
                prev['signale'] = prev['signale'] or signale
    return out, conflits


def apply_decisions(gems, decisions, conflits):
    """Filtre et corrige les pierres selon les décisions. Retourne (à importer, rapport)."""
    a_importer, rapport = [], collections.defaultdict(list)
    by_ref = {g['reference']: g for g in gems}
    for ref in conflits:
        rapport['Décisions contradictoires entre onglets (pierre ignorée)'].append(ref)
    for g in gems:
        ref = g['reference']
        d = decisions.get(ref)
        if ref in conflits:
            continue
        if d is None or d['decision'] == '':
            if d is not None and d['signale']:
                rapport['Cas signalé sans décision (pierre ignorée)'].append(ref)
            else:
                a_importer.append(g)
            continue
        dec = d['decision']
        if dec.startswith('ne pas'):
            rapport['Refusées (« Ne pas importer »)'].append(ref)
        elif dec.startswith('a revoir'):
            rapport['« À revoir ensemble » (pierre ignorée)'].append(ref)
        elif dec.startswith('importer') or dec.startswith('corriger'):
            g = dict(g)
            w0 = g['weight'] or 0
            cout_ct = g.get('_pachCt', (g['costPrice'] / w0) if w0 else 0)
            vente_ct = g.get('_pvteCt', (g['sellingPrice'] / w0) if w0 else 0)
            change = []
            if d['poids'] is not None and abs(d['poids'] - w0) > 0.001:
                change.append('poids %.2f -> %.2f' % (w0, d['poids']))
            if d['pach'] is not None and abs(d['pach'] - cout_ct) > 0.0051:
                change.append("prix d'achat/ct %.2f -> %.2f" % (cout_ct, d['pach']))
            if d['pvte'] is not None and abs(d['pvte'] - vente_ct) > 0.0051:
                change.append('prix de vente/ct %.2f -> %.2f' % (vente_ct, d['pvte']))
            if d['taille'] is not None and d['taille'] != g['cut']:
                change.append('taille « %s » -> « %s »' % (g['cut'], d['taille']))
            if dec.startswith('importer') and change:
                rapport['« Importer tel quel » mais valeurs modifiées (pierre ignorée : choisissez « Corriger puis importer »)'].append('%s (%s)' % (ref, '; '.join(change)))
                continue
            if dec.startswith('corriger'):
                if not change:
                    rapport['« Corriger » sans aucune valeur modifiée (importée telle quelle)'].append(ref)
                else:
                    w = d['poids'] if d['poids'] is not None else w0
                    cp = d['pach'] if d['pach'] is not None else cout_ct
                    vp = d['pvte'] if d['pvte'] is not None else vente_ct
                    g.update({'weight': round(w, 2), 'costPrice': money(cp * w), 'sellingPrice': money(vp * w)})
                    if d['taille'] is not None:
                        g['cut'] = d['taille']
                    g['description'] = g['description'] + ' [corrigé après validation : ' + '; '.join(change) + ']'
                    rapport['Corrigées puis importées'].append('%s (%s)' % (ref, '; '.join(change)))
            a_importer.append(g)
        else:
            rapport['Décision non reconnue (pierre ignorée)'].append('%s (« %s »)' % (ref, dec))
    for ref, d in decisions.items():
        if ref not in by_ref and (d['decision'].startswith('importer') or d['decision'].startswith('corriger')):
            rapport["Décidées à l'import mais absentes de l'export (relancer « export --include-classes »)"].append(ref)
    return a_importer, rapport


def http(method, url, body=None):
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8') or 'null')


def load(args):
    if not os.path.isfile(OUT_FILE):
        sys.exit("Aucun fichier d'export : lancez d'abord la commande « export ».")
    gems = json.load(open(OUT_FILE, encoding='utf-8'))['gemstones']
    if args.decisions:
        if not os.path.isfile(args.decisions):
            sys.exit('Fichier de décisions introuvable : %s' % args.decisions)
        decisions, conflits = read_decisions(args.decisions)
        gems, rapport = apply_decisions(gems, decisions, conflits)
        print('=== DÉCISIONS lues dans %s ===' % os.path.basename(args.decisions))
        for titre, refs in rapport.items():
            print('  %s : %d' % (titre, len(refs)))
            for x in refs[:40]:
                print('      - %s' % x)
    base = args.url.rstrip('/')
    existing = {g['id'] for g in http('GET', base + '/api/gemstones')}
    archived = {t['id'] for t in http('GET', base + '/api/trash') if t.get('type') == 'gemstone'}
    todo = [g for g in gems if g['id'] not in existing and g['id'] not in archived]
    print('%d pierres dans le fichier | %d déjà présentes | %d archivées (ignorées) | %d à importer'
          % (len(gems), len([g for g in gems if g['id'] in existing]), len([g for g in gems if g['id'] in archived]), len(todo)))
    if args.dry_run:
        print('Mode --dry-run : rien n\'est envoyé.')
        return
    ok = ko = 0
    for g in todo:
        try:
            http('POST', base + '/api/gemstones', {k: v for k, v in g.items() if not k.startswith('_')})
            ok += 1
        except urllib.error.HTTPError as e:
            ko += 1
            print('ECHEC %s : HTTP %s %s' % (g['reference'], e.code, e.read().decode('utf-8', 'replace')[:150]))
    print('Importées : %d | échecs : %d' % (ok, ko))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    e = sub.add_parser('export'); e.add_argument('--mdb', default=r'C:\Access\Data\Data.mdb'); e.add_argument('--include-classes', action='store_true')
    c = sub.add_parser('csv'); c.add_argument('--mdb', default=r'C:\Access\Data\Data.mdb')
    l = sub.add_parser('load'); l.add_argument('--url', default='http://localhost:3000'); l.add_argument('--dry-run', action='store_true')
    l.add_argument('--decisions', help='tableau renvoyé (.xlsx ou .csv) : la colonne « Décision » filtre et corrige ce qui est importé')
    a = ap.parse_args()
    {'export': export, 'csv': csv_export, 'load': load}[a.cmd](a)
