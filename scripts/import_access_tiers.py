# -*- coding: utf-8 -*-
"""
Reprise des clients et fournisseurs ACTIFS d'Access (Data.mdb) dans GemoMix Suite.

Deux étapes, volontairement séparées (comme pour le stock) :

  export : lit Data.mdb (sur une COPIE, jamais l'original) et produit un fichier JSON + un rapport de
           contrôle. N'écrit rien dans GemoMix.
  load   : envoie les fiches vers GemoMix par l'API. Une fiche déjà présente (ou à la corbeille) n'est
           jamais réécrite, SAUF les fiches issues du premier import (identifiant « -IMP- »), dont les
           colonnes étaient décalées : elles sont réparées sur place (même identifiant).

Règles :
  - « actif » = client facturé (table FACTURE) ou fournisseur avec pièce d'achat (table PIECEACHAT)
    depuis N ans (--years, 5 par défaut). Les champs ARCHIVE / PROSPECT d'Access ne sont pas utilisés.
  - nom = NOM (nom légal), et non le code Access ; les codes de tiers Access ne sont PAS repris comme
    codes comptables (ils ne correspondent pas à ceux de Sage) ; ils ne servent qu'à retrouver la fiche.
  - adresse = ADRESSE1 (+ ADRESSE2), code postal, ville, pays, n° de TVA, e-mail, téléphone, contact.
  - le type Access (FRANCE / CEE / EXPORT / TVA/MARGE) est conservé dans les notes.

Usage :
  python scripts/import_access_tiers.py export [--mdb C:\\Access\\Data\\Data.mdb] [--years 5]
  python scripts/import_access_tiers.py load   [--url http://localhost:3000] [--dry-run] [--forget "NOM"]
"""
import argparse, collections, datetime, json, os, re, shutil, sys, tempfile, unicodedata, urllib.request, urllib.error

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'import-access', 'out')
OUT_FILE = os.path.join(OUT_DIR, 'tiers_access.json')
REPORT_FILE = os.path.join(OUT_DIR, 'tiers_rapport.txt')
DRIVER = '{Microsoft Access Driver (*.mdb, *.accdb)}'

COUNTRIES = {
    'FRANCE': 'France', 'BELGIQUE': 'Belgique', 'THAILANDE': 'Thaïlande', 'ISRAEL': 'Israël', 'SRI LANKA': 'Sri Lanka',
    'ALLEMAGNE': 'Allemagne', 'ROYAUME-UNI': 'Royaume-Uni', 'U.S.A': 'États-Unis', 'USA': 'États-Unis', 'ETATS-UNIS': 'États-Unis',
    'ESPAGNE': 'Espagne', 'MONACO': 'Monaco', 'CHINE': 'Chine', 'SUISSE': 'Suisse', 'LUXEMBOURG': 'Luxembourg', 'GABON': 'Gabon',
    'ITALIE': 'Italie', 'PAYS-BAS': 'Pays-Bas', 'PORTUGAL': 'Portugal', 'INDE': 'Inde', 'HONG KONG': 'Hong Kong',
}
EU = {'France', 'Belgique', 'Allemagne', 'Espagne', 'Luxembourg', 'Italie', 'Pays-Bas', 'Portugal', 'Irlande', 'Autriche',
      'Grèce', 'Danemark', 'Suède', 'Finlande', 'Pologne', 'Tchéquie', 'Hongrie', 'Roumanie', 'Bulgarie', 'Croatie'}


def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def s(v):
    return '' if v is None else str(v).strip()


def key(v):
    """Clé de rapprochement : sans accents, majuscules, sans ponctuation ni espaces."""
    return re.sub(r'[^A-Z0-9]+', '', strip_accents(s(v)).upper())


def xk(v):
    """Clé exacte : sans accents, en majuscules, ponctuation conservée (« A.D.B » != « ADB »)."""
    return strip_accents(s(v)).upper()


def slug(v):
    return re.sub(r'[^A-Za-z0-9]+', '_', strip_accents(s(v))).strip('_').upper() or 'SANS_CODE'


def country_of(pays):
    raw = s(pays)
    if not raw:
        return ''
    return COUNTRIES.get(strip_accents(raw).upper(), raw.title())


def zone_of(country):
    if not country:
        return '?'
    if country == 'France':
        return 'France'
    return 'UE' if country in EU else 'Hors UE'


def clean_address(a1, a2):
    a1 = re.sub(r'^(\d+\s*(?:bis|ter|quater)?)\s*,\s*', r'\1 ', s(a1), flags=re.I).strip(' ,')
    a2 = s(a2).strip(' ,')
    return ', '.join(x for x in (a1, a2) if x)


def clean_postal(cp, country):
    cp = s(cp)
    if country == 'France' and cp.isdigit() and len(cp) == 4:
        cp = cp.zfill(5)
    return cp


# Une fiche du premier import déjà réparée porte cette mention dans ses notes : elle n'est plus jamais réécrite
REPAIRED_MARK = "Repris d'Access"

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def build(kind, r, activity):
    """r : dict des colonnes Access -> fiche GemoMix + drapeaux de contrôle."""
    code, nom = s(r['CODE']), s(r['NOM'])
    country = country_of(r['PAYS'])
    flags = []
    email = s(r.get('EMAIL'))
    if email and not EMAIL_RE.match(email.split(';')[0].split(',')[0].strip()):
        flags.append('e-mail invalide : %s' % email)
    if not country:
        flags.append('pays manquant')
    if not s(r['CP']):
        flags.append('code postal manquant')
    vat = s(r.get('IDTVA'))
    if zone_of(country) == 'UE' and not vat:
        flags.append('n° de TVA manquant (pays UE)')
    typ = s(r.get('TYPE'))
    if typ.upper().startswith('TVA'):
        flags.append('type « %s » : TVA sur marge à confirmer' % typ)
    phones = [p for p in (s(r.get('TEL1')), s(r.get('TEL2'))) if p]
    notes_parts = ['Repris d\'Access (code %s%s)' % (code, ', type %s' % typ if typ else '')]
    if kind == 'client':
        if s(r.get('COMMENT')):
            notes_parts.append(s(r['COMMENT']))
    else:
        obs = [s(r.get('OBSERVATIONS%d' % i)) for i in range(1, 6)]
        notes_parts += [o for o in obs if o]
    rec = {
        'id': '',   # attribué à l'export (unicité)
        'name': nom or code,
        'contactName': s(r.get('CONTACT1')) or None,
        'email': email or None,
        'phone': ' / '.join(phones) or None,
        'address': clean_address(r['ADRESSE1'], r['ADRESSE2']) or None,
        'postalCode': clean_postal(r['CP'], country) or None,
        'city': s(r['VILLE']) or None,
        'country': country or None,
        'vatNumber': vat or None,
        'notes': ' — '.join(notes_parts),
        'dateAdded': datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
        '_accessCode': code, '_accessType': typ, '_zone': zone_of(country), '_flags': flags,
        '_lastActivity': activity[0], '_activityCount': activity[1],
    }
    return {k: v for k, v in rec.items() if v is not None}


def export(args):
    import pyodbc
    src = args.mdb
    if not os.path.isfile(src):
        sys.exit('Fichier introuvable : %s' % src)
    tmp = os.path.join(tempfile.gettempdir(), 'gemomix_import_tiers_copy.mdb')
    shutil.copyfile(src, tmp)            # on ne lit jamais l'original
    cur = pyodbc.connect('DRIVER=%s;DBQ=%s;ReadOnly=1;' % (DRIVER, tmp)).cursor()
    limit = datetime.datetime.now() - datetime.timedelta(days=round(365.25 * args.years))

    def rows(table, cols):
        cur.execute('SELECT %s FROM [%s]' % (', '.join(cols), table))
        return [dict(zip(cols, r)) for r in cur.fetchall()]

    # ---------------- activité : dernière date et nombre de pièces par code (clé normalisée)
    def activity(table, code_col, date_col):
        acts = {}
        for r in rows(table, [code_col, date_col]):
            k = xk(r[code_col])
            if not k or not r[date_col]:
                continue
            d = r[date_col]
            last, n = acts.get(k, (None, 0))
            acts[k] = (d if last is None or d > last else last, n + 1)
        return acts

    fac = activity('FACTURE', 'CODE', 'DATE')
    ach = activity('PIECEACHAT', 'CODE', 'DATACH')

    ccols = ['CODE', 'NOM', 'TYPE', 'ADRESSE1', 'ADRESSE2', 'CP', 'VILLE', 'PAYS', 'TEL1', 'TEL2', 'EMAIL', 'CONTACT1', 'COMMENT', 'IDTVA']
    fcols = ['CODE', 'NOM', 'TYPE', 'ADRESSE1', 'ADRESSE2', 'CP', 'VILLE', 'PAYS', 'TEL1', 'TEL2', 'EMAIL', 'CONTACT1', 'IDTVA'] + ['OBSERVATIONS%d' % i for i in range(1, 6)]
    clients_raw, suppliers_raw = rows('CLIENT', ccols), rows('FOURNISSEUR', fcols)

    def make(kind, raws, acts, prefix):
        used_ids, active, allrec = collections.Counter(), [], []
        for r in raws:
            code = s(r['CODE'])
            if not code or code.strip('-') == '':
                continue
            a = acts.get(xk(code), (None, 0))
            rec = build(kind, r, ((a[0].date().isoformat() if a[0] else ''), a[1]))
            base = '%s-ACC-%s' % (prefix, slug(code))
            used_ids[base] += 1
            rec['id'] = base if used_ids[base] == 1 else '%s_%d' % (base, used_ids[base])
            if used_ids[base] > 1:
                rec['_flags'].append('identifiant en doublon (codes Access proches)')
            rec['_active'] = bool(a[0] and a[0] >= limit)
            allrec.append(rec)
            if rec['_active']:
                active.append(rec)
        return active, allrec

    c_act, c_all = make('client', clients_raw, fac, 'CLI')
    f_act, f_all = make('fournisseur', suppliers_raw, ach, 'SUP')

    # ---------------- contrôles transversaux
    def dup_flags(recs):
        by_vat, by_addr = collections.defaultdict(list), collections.defaultdict(list)
        for x in recs:
            if x.get('vatNumber'):
                by_vat[key(x['vatNumber'])].append(x)
            if x.get('address') and x.get('city'):
                by_addr[key(x['address'] + x['city'])].append(x)
        pairs = []
        for grp in list(by_vat.values()) + list(by_addr.values()):
            if len(grp) > 1:
                names = sorted({g['name'] for g in grp})
                if names not in pairs:
                    pairs.append(names)
        return pairs

    orphan_c = sorted({k for k in fac if k not in {xk(r['CODE']) for r in clients_raw}})
    orphan_f = sorted({k for k in ach if k not in {xk(r['CODE']) for r in suppliers_raw}})

    os.makedirs(OUT_DIR, exist_ok=True)
    json.dump({'generated': datetime.datetime.now().isoformat(), 'years': args.years,
               'clients_actifs': c_act, 'fournisseurs_actifs': f_act, 'clients_tous': c_all, 'fournisseurs_tous': f_all},
              open(OUT_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    L = []
    p = L.append
    p('REPRISE DES TIERS ACCESS -> GemoMix : rapport de contrôle (%s)' % datetime.date.today().isoformat())
    p('Source : %s | actif = activité depuis %d an(s) (avant le %s)' % (src, args.years, limit.date().isoformat()))
    p('')
    p('CLIENTS      : %d dans Access, %d actifs' % (len(c_all), len(c_act)))
    p('FOURNISSEURS : %d dans Access, %d actifs' % (len(f_all), len(f_act)))
    for label, recs in (('Clients actifs', c_act), ('Fournisseurs actifs', f_act)):
        z = collections.Counter(x['_zone'] for x in recs)
        p('  %-20s zones : %s' % (label, ', '.join('%s=%d' % kv for kv in z.most_common())))
    p('  Types Access des clients actifs : %s' % dict(collections.Counter(x['_accessType'] or '(vide)' for x in c_act)))
    p('')
    for label, recs in (('CLIENTS ACTIFS', c_act), ('FOURNISSEURS ACTIFS', f_act)):
        cnt = collections.Counter(f.split(' (')[0].split(' :')[0] for x in recs for f in x['_flags'])
        p('À VÉRIFIER — %s : %d fiche(s) avec au moins un point' % (label, sum(1 for x in recs if x['_flags'])))
        for k2, n in cnt.most_common():
            ex = [x['name'] for x in recs if any(f.startswith(k2) for f in x['_flags'])][:4]
            p('   - %-34s %3d   ex. %s' % (k2, n, ', '.join(ex)))
        p('')
    p('DOUBLONS POSSIBLES (même n° de TVA ou même adresse) :')
    for label, recs in (('clients', c_act), ('fournisseurs', f_act)):
        for names in dup_flags(recs):
            p('   - %s : %s' % (label, ' / '.join(names)))
    p('')
    p('Codes utilisés en factures sans fiche client : %d %s' % (len(orphan_c), orphan_c[:8]))
    p('Codes utilisés en achats sans fiche fournisseur : %d %s' % (len(orphan_f), orphan_f[:8]))
    p('')
    p('EXEMPLES (fournisseurs actifs) :')
    for x in f_act[:6]:
        p('   %-34s | %s | %s %s | %s | TVA %s | dernier achat %s' % (x['name'][:34], x.get('address', ''), x.get('postalCode', ''), x.get('city', ''), x.get('country', ''), x.get('vatNumber', '-'), x['_lastActivity']))
    p('EXEMPLES (clients actifs) :')
    for x in c_act[:6]:
        p('   %-34s | %s | %s %s | %s | dernière facture %s' % (x['name'][:34], x.get('address', ''), x.get('postalCode', ''), x.get('city', ''), x.get('country', ''), x['_lastActivity']))
    report = '\n'.join(L)
    open(REPORT_FILE, 'w', encoding='utf-8').write(report)
    print(report)
    print('\nFichiers : %s | %s' % (OUT_FILE, REPORT_FILE))


def http(method, url, body=None):
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8') or 'null')


def strip_private(rec):
    return {k: v for k, v in rec.items() if not k.startswith('_')}


def load(args):
    if not os.path.isfile(OUT_FILE):
        sys.exit("Aucun fichier d'export : lancez d'abord la commande « export ».")
    data = json.load(open(OUT_FILE, encoding='utf-8'))
    base = args.url.rstrip('/')
    forget = {key(x) for x in (args.forget or [])}
    plan = {'créer': 0, 'réparer (fiche du premier import)': 0, 'déjà présent : inchangé': 0, 'oubliées (corbeille)': 0, 'sans équivalent Access : laissées': 0}
    todo = []   # (méthode, chemin, corps, libellé)

    for kind, path, act_key, all_key in (('client', '/api/clients', 'clients_actifs', 'clients_tous'),
                                         ('fournisseur', '/api/suppliers', 'fournisseurs_actifs', 'fournisseurs_tous')):
        existing = http('GET', base + path)
        trash = {t['id'] for t in http('GET', base + '/api/trash') if t.get('type') in ('client', 'supplier')}
        by_id = {e['id']: e for e in existing}
        ex_exact, ex_fuzzy = {}, collections.defaultdict(list)
        for e in existing:
            ex_exact.setdefault(xk(e['name']), e)
            ex_fuzzy[key(e['name'])].append(e)
        access_all = data[all_key]
        ac_exact, ac_fuzzy = {}, collections.defaultdict(list)
        for rec in access_all:
            for v in (rec['name'], rec['_accessCode']):
                ac_exact.setdefault(xk(v), rec)
                ac_fuzzy[key(v)].append(rec)
        handled_existing = set()

        def find_existing(rec):
            e = by_id.get(rec['id']) or ex_exact.get(xk(rec['name'])) or ex_exact.get(xk(rec['_accessCode']))
            if e is None:
                c = ex_fuzzy.get(key(rec['name'])) or []
                e = c[0] if len(c) == 1 else None
            return e

        def find_access(e):
            rec = ac_exact.get(xk(e['name']))
            if rec is None:
                c = ac_fuzzy.get(key(e['name'])) or []
                rec = c[0] if len({x['id'] for x in c}) == 1 else None
            return rec

        for rec in data[act_key]:
            match = find_existing(rec)
            if rec['id'] in trash:
                continue
            if match is not None and '-IMP-' in match['id'] and match['id'] in handled_existing:
                match = None   # déjà réparée par une autre fiche Access : celle-ci est créée à part
            if match is None:
                plan['créer'] += 1
                todo.append(('POST', path, strip_private(rec), '%s : créer %s' % (kind, rec['name'])))
            elif '-IMP-' in match['id'] and REPAIRED_MARK not in (match.get('notes') or ''):
                fixed = strip_private(rec)
                fixed['id'] = match['id']
                fixed['dateAdded'] = match.get('dateAdded', fixed['dateAdded'])
                plan['réparer (fiche du premier import)'] += 1
                todo.append(('POST', path, fixed, '%s : réparer %s (%s)' % (kind, match['name'], match['id'])))
                handled_existing.add(match['id'])
            else:
                plan['déjà présent : inchangé'] += 1
                handled_existing.add(match['id'])

        # fiches du premier import qui ne sont pas dans le lot actif : on les répare aussi si Access les connaît
        for e in existing:
            if '-IMP-' not in e['id'] or e['id'] in handled_existing or REPAIRED_MARK in (e.get('notes') or ''):
                continue
            if key(e['name']) in forget:
                plan['oubliées (corbeille)'] += 1
                todo.append(('DELETE', '%s/%s' % (path, e['id']), None, '%s : oublier %s' % (kind, e['name'])))
                continue
            rec = find_access(e)
            if rec is None:
                plan['sans équivalent Access : laissées'] += 1
                todo.append((None, None, None, '%s : %s n\'existe pas dans Access (laissée telle quelle)' % (kind, e['name'])))
                continue
            fixed = strip_private(rec)
            fixed['id'] = e['id']
            fixed['dateAdded'] = e.get('dateAdded', fixed['dateAdded'])
            plan['réparer (fiche du premier import)'] += 1
            todo.append(('POST', path, fixed, '%s : réparer %s (%s, hors lot actif)' % (kind, e['name'], e['id'])))

    for k2, n in plan.items():
        print('  %-40s %d' % (k2, n))
    if args.dry_run:
        print('\nMode --dry-run : rien n\'est envoyé. Détail des réparations / oublis / cas particuliers :')
        for m, pth, body, lib in todo:
            if m != 'POST' or 'réparer' in lib:
                print('   -', lib)
        return
    ok = ko = 0
    for m, pth, body, lib in todo:
        if m is None:
            continue
        try:
            http(m, base + pth, body)
            ok += 1
        except urllib.error.HTTPError as e:
            ko += 1
            print('ECHEC %s : HTTP %s %s' % (lib, e.code, e.read().decode('utf-8', 'replace')[:150]))
    print('\nEnvoyés : %d | échecs : %d' % (ok, ko))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    e = sub.add_parser('export'); e.add_argument('--mdb', default=r'C:\Access\Data\Data.mdb'); e.add_argument('--years', type=int, default=5)
    l = sub.add_parser('load'); l.add_argument('--url', default='http://localhost:3000'); l.add_argument('--dry-run', action='store_true')
    l.add_argument('--forget', action='append', help="nom d'une fiche du premier import à envoyer à la corbeille (répétable)")
    a = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    {'export': export, 'load': load}[a.cmd](a)
