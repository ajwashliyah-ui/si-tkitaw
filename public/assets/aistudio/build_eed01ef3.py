#!/usr/bin/env python3
"""Rakit js/demo-backend.js dari kode .gs asli, lalu preview.html (satu file, mode demo)."""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
baca = lambda p: (root / p).read_text(encoding='utf-8')
nama = 'SpreadsheetApp Utilities PropertiesService CacheService LockService DriveApp ContentService ScriptApp'.split()

demo = ('/* Dibuat otomatis oleh tools/build.py. Jangan diedit langsung. */\n'
        + baca('tools/gas-shim.js')
        + '\nfunction buatBackendDemo(simpanan) {\n  var shim = buatShim(simpanan);\n'
        + '  return (function (' + ', '.join(nama) + ') {\n'
        + baca('gas/Setup.gs') + '\n' + baca('gas/Code.gs')
        + '\n  if (!shim.db.sheets.Users) setupDatabase();\n'
        + '  return { db: shim.db, doPost: doPost };\n  })('
        + ', '.join('shim.' + n for n in nama) + ');\n}\n')
(root / 'js/demo-backend.js').write_text(demo, encoding='utf-8')

html = baca('index.html')
uri = lambda p: 'data:image/png;base64,' + base64.b64encode((root / p).read_bytes()).decode()
gaya = lambda m: '<style>\n' + baca(m.group(1)) + '\n</style>'
skrip = lambda m: '<script>\n' + baca(m.group(1)).replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', gaya, html)
html = re.sub(r'<script src="(config\.js|js/[^"]+)"></script>', skrip, html)
for p in ('assets/logo.png', 'assets/lambang.png'):
    html = html.replace(p, uri(p))
(root / 'preview.html').write_text(html, encoding='utf-8')
