#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Script d'orchestration complète des tests E2E TIRAHOU
  
.DESCRIPTION
  Lance automatiquement :
  1. Backend Django
  2. Frontend React
  3. Tests Playwright
  4. Génération du rapport
  5. Arrêt des serveurs
  
.EXAMPLE
  .\run-full-tests.ps1
#>

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 TESTS E2E AUTOMATISÉS - TIRAHOU" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_DIR = "backend"
$FRONTEND_DIR = "frontend"
$BACKEND_PORT = 8000
$FRONTEND_PORT = 3000
$WAIT_TIME = 15

# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1 : Vérifier les prérequis
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "📋 Vérification des prérequis..." -ForegroundColor Yellow

if (-not (Test-Path $BACKEND_DIR)) {
    Write-Host "❌ Dossier backend introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $FRONTEND_DIR)) {
    Write-Host "❌ Dossier frontend introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prérequis OK" -ForegroundColor Green
Write-Host ""

# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2 : Démarrer le backend Django
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "🔧 Démarrage du backend Django..." -ForegroundColor Yellow

$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    python manage.py runserver
} -ArgumentList (Resolve-Path $BACKEND_DIR)

Write-Host "   Backend lancé (Job ID: $($backendJob.Id))" -ForegroundColor Gray

# Attendre que le backend démarre
Write-Host "   Attente du démarrage ($WAIT_TIME secondes)..." -ForegroundColor Gray
Start-Sleep -Seconds $WAIT_TIME

# Vérifier que le backend répond
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/api/schema/" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Backend opérationnel (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend ne répond pas encore, on continue..." -ForegroundColor Yellow
}
Write-Host ""

# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3 : Démarrer le frontend React
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "⚛️  Démarrage du frontend React..." -ForegroundColor Yellow

$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList (Resolve-Path $FRONTEND_DIR)

Write-Host "   Frontend lancé (Job ID: $($frontendJob.Id))" -ForegroundColor Gray

# Attendre que le frontend démarre
Write-Host "   Attente du démarrage ($WAIT_TIME secondes)..." -ForegroundColor Gray
Start-Sleep -Seconds $WAIT_TIME

# Vérifier que le frontend répond
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$FRONTEND_PORT/" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Frontend opérationnel (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend ne répond pas encore, on continue..." -ForegroundColor Yellow
}
Write-Host ""

# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4 : Exécuter les tests Playwright
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "🧪 Exécution des tests E2E..." -ForegroundColor Yellow
Write-Host ""

Set-Location $FRONTEND_DIR

# Lancer les tests
$testResult = npx playwright test --reporter=list,html

Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Tous les tests ont réussi !" -ForegroundColor Green
} else {
    Write-Host "⚠️  Certains tests ont échoué" -ForegroundColor Yellow
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 5 : Arrêter les serveurs
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "🛑 Arrêt des serveurs..." -ForegroundColor Yellow

Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
Remove-Job -Job $backendJob -ErrorAction SilentlyContinue

Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
Remove-Job -Job $frontendJob -ErrorAction SilentlyContinue

Write-Host "✅ Serveurs arrêtés" -ForegroundColor Green
Write-Host ""

# ══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 6 : Afficher le résumé
# ══════════════════════════════════════════════════════════════════════════════
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   📊 RÉSULTATS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📁 Rapport HTML    : frontend/playwright-report/index.html" -ForegroundColor White
Write-Host "📸 Captures d'écran : frontend/playwright-report/screenshots/" -ForegroundColor White
Write-Host "🎥 Vidéos          : frontend/test-results/" -ForegroundColor White
Write-Host ""

# Ouvrir le rapport automatiquement
Write-Host "🌐 Ouverture du rapport..." -ForegroundColor Yellow
Start-Process "frontend/playwright-report/index.html"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✨ Tests terminés !" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
