#!/usr/bin/env python3
"""Add or update single-line keys in js/i18n.js without touching anything else.

Usage:  python3 tools/i18n-set.py edits.json
edits.json = [{"key": "form.phone", "en": "Phone", "fr": "Téléphone", "after": "form.contactErr"}]
- An existing key is replaced in place (both en and fr).
- A new key is inserted on the line after "after" (required for new keys).
Then run:  node tools/sync-html-fallbacks.mjs --write   (keeps the HTML text in sync)
"""
import json, os, re, sys

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'i18n.js')
s = open(P, encoding='utf-8').read()

def q(v):
    return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"

for e in json.load(open(sys.argv[1], encoding='utf-8')):
    k = e['key']
    line = f"    {q(k)}: {{ en: {q(e['en'])}, fr: {q(e['fr'])} }},"
    pat = re.compile(r"^    '" + re.escape(k) + r"': \{.*\},$", re.M)
    found = pat.findall(s)
    if len(found) == 1:
        s = pat.sub(lambda _: line, s)
        print('updated', k)
    elif not found:
        anchor = re.compile(r"^    '" + re.escape(e['after']) + r"': \{.*\},$", re.M).search(s)
        if not anchor:
            sys.exit(f"anchor key not found: {e.get('after')}")
        s = s[:anchor.end()] + '\n' + line + s[anchor.end():]
        print('added', k)
    else:
        sys.exit('duplicate key ' + k)
open(P, 'w', encoding='utf-8').write(s)
