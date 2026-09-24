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
  python scripts/import_access_stock.py load   [--url http://localhost:3000] [--dry-run]
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


def http(method, url, body=None):
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8') or 'null')


def load(args):
    if not os.path.isfile(OUT_FILE):
        sys.exit("Aucun fichier d'export : lancez d'abord la commande « export ».")
    gems = json.load(open(OUT_FILE, encoding='utf-8'))['gemstones']
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
            http('POST', base + '/api/gemstones', g)
            ok += 1
        except urllib.error.HTTPError as e:
            ko += 1
            print('ECHEC %s : HTTP %s %s' % (g['reference'], e.code, e.read().decode('utf-8', 'replace')[:150]))
    print('Importées : %d | échecs : %d' % (ok, ko))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    e = sub.add_parser('export'); e.add_argument('--mdb', default=r'C:\Access\Data\Data.mdb'); e.add_argument('--include-classes', action='store_true')
    l = sub.add_parser('load'); l.add_argument('--url', default='http://localhost:3000'); l.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    export(a) if a.cmd == 'export' else load(a)
