import os
import re
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# ── 1. Collecter tous les endpoints backend ───────────────────────────────────
from django.urls import get_resolver

def list_api_urls(resolver, prefix=''):
    urls = []
    for pattern in resolver.url_patterns:
        if hasattr(pattern, 'url_patterns'):
            urls.extend(list_api_urls(pattern, prefix + str(pattern.pattern)))
        else:
            full = prefix + str(pattern.pattern)
            if 'api/v1' in full and 'format' not in full:
                urls.append(full.replace('^', '').replace('$', ''))
    return urls

backend_urls = sorted(set(list_api_urls(get_resolver())))
print(f"Backend endpoints: {len(backend_urls)}")

# ── 2. Collecter tous les appels API dans le frontend ─────────────────────────
frontend_src = '/Users/hello/Desktop/soutenance/frontend/src'
frontend_calls = set()

for root, dirs, files in os.walk(frontend_src):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git']]
    for fname in files:
        if not fname.endswith(('.ts', '.tsx')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', errors='replace') as f:
            content = f.read()
        # Trouver tous les appels api.get/post/patch/delete
        matches = re.findall(r"api\.(get|post|patch|put|delete)\(['\"]([^'\"]+)['\"]", content)
        for method, url in matches:
            # Normaliser l'URL
            url = re.sub(r'\$\{[^}]+\}', '<id>', url)
            url = re.sub(r'/[0-9a-f-]{36}/', '/<id>/', url)
            frontend_calls.add((method.upper(), url))

print(f"Frontend API calls: {len(frontend_calls)}")

# ── Helpers de normalisation ──────────────────────────────────────────────────
API_PREFIX = 'api/v1/'

def norm_backend_url(burl: str) -> str:
    """
    Normalise un pattern backend en chemin comparable avec le frontend.
    Le frontend utilise des URLs relatives (ex: /auth/login/) car baseURL contient déjà /api/v1.
    """
    s = burl.replace('^', '').replace('$', '').lstrip('/')
    if s.startswith(API_PREFIX):
        s = s[len(API_PREFIX):]
    # Normaliser les params Django router (uuid, pk, etc.)
    s = re.sub(r'<[^:>]+:([^>]+)>', r'<\1>', s)  # <uuid:student_id> -> <student_id>
    s = re.sub(r'\(\?P<[^>]+>[^)]+\)', '<id>', s)  # regex url params -> <id>
    s = s.strip('/')
    return f'/{s}/' if s else '/'

def norm_frontend_url(furl: str) -> str:
    s = furl.strip()
    if not s.startswith('/'):
        s = '/' + s
    # Uniformiser: finir par /
    if s != '/' and not s.endswith('/'):
        s += '/'
    # Normaliser quelques formats déjà présents dans le script
    s = re.sub(r'\$\{[^}]+\}', '<id>', s)
    s = re.sub(r'/[0-9a-f-]{36}/', '/<id>/', s)
    return s

# ── 3. Analyser les appels par module ─────────────────────────────────────────
modules = {}
for method, url in sorted(frontend_calls):
    parts = norm_frontend_url(url).strip('/').split('/')
    module = parts[1] if len(parts) > 1 else parts[0]
    if module not in modules:
        modules[module] = []
    modules[module].append(f"{method} {norm_frontend_url(url)}")

print("\n=== APPELS FRONTEND PAR MODULE ===")
for mod, calls in sorted(modules.items()):
    print(f"\n  [{mod}] ({len(calls)} appels)")
    for c in sorted(calls):
        print(f"    {c}")

# ── 4. Vérifier les endpoints backend non utilisés ───────────────────────────
print("\n=== ENDPOINTS BACKEND NON APPELÉS PAR LE FRONTEND ===")
frontend_urls = {norm_frontend_url(url) for _, url in frontend_calls}

missing = []
for burl in backend_urls:
    norm = norm_backend_url(burl)
    found = False
    for furl in frontend_urls:
        if norm == furl:
            found = True
            break
    if not found and not any(x in norm for x in ['/schema/', '/docs/', '/redoc/', '/admin/', '/static/', '/media/']):
        missing.append(norm)

for m in sorted(missing)[:30]:
    print(f"  MISSING: {m}")

print(f"\nTotal manquants: {len(missing)}")

# ── 5. Vérifier les appels frontend sans endpoint backend ─────────────────────
print("\n=== APPELS FRONTEND SANS ENDPOINT BACKEND ===")
backend_norm_urls = {norm_backend_url(burl) for burl in backend_urls}

frontend_missing = []
for method, url in sorted(frontend_calls):
    f = norm_frontend_url(url)
    # Ignore les routes qui ne sont pas API (rare) ou qui passent par proxy hors /api/v1
    if not f.startswith('/'):
        continue
    if f not in backend_norm_urls:
        frontend_missing.append(f"{method} {f}")

for m in frontend_missing[:60]:
    print(f"  MISSING_FRONT: {m}")

print(f"\nTotal appels frontend sans backend: {len(frontend_missing)}")
