# Script d'orchestration complete des tests E2E TIRAHOU
# Lance automatiquement backend + frontend + tests Playwright

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   TESTS E2E AUTOMATISES - TIRAHOU" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_DIR = "backend"
$FRONTEND_DIR = "frontend"
$BACKEND_PORT = 8000
$FRONTEND_PORT = 3000
$WAIT_TIME = 15

# ETAPE 1 : Verifier les prerequis
Write-Host "Verification des prerequis..." -ForegroundColor Yellow

if (-not (Test-Path $BACKEND_DIR)) {
    Write-Host "Erreur: Dossier backend introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $FRONTEND_DIR)) {
    Write-Host "Erreur: Dossier frontend introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Prerequis valides" -ForegroundColor Green
Write-Host ""

# ETAPE 2 : Demarrer le backend Django
Write-Host "Demarrage du backend Django..." -ForegroundColor Yellow

$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    python manage.py runserver
} -ArgumentList (Resolve-Path $BACKEND_DIR)

Write-Host "   Backend lance (Job ID: $($backendJob.Id))" -ForegroundColor Gray
Write-Host "   Attente du demarrage ($WAIT_TIME secondes)..." -ForegroundColor Gray
Start-Sleep -Seconds $WAIT_TIME

# Verifier que le backend repond
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/api/schema/" -UseBasicParsing -TimeoutSec 5
    Write-Host "OK: Backend operationnel (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Warning: Backend ne repond pas encore, on continue..." -ForegroundColor Yellow
}
Write-Host ""

# ETAPE 3 : Demarrer le frontend React
Write-Host "Demarrage du frontend React..." -ForegroundColor Yellow

$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList (Resolve-Path $FRONTEND_DIR)

Write-Host "   Frontend lance (Job ID: $($frontendJob.Id))" -ForegroundColor Gray
Write-Host "   Attente du demarrage ($WAIT_TIME secondes)..." -ForegroundColor Gray
Start-Sleep -Seconds $WAIT_TIME

# Verifier que le frontend repond
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$FRONTEND_PORT/" -UseBasicParsing -TimeoutSec 5
    Write-Host "OK: Frontend operationnel (HTTP $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "Warning: Frontend ne repond pas encore, on continue..." -ForegroundColor Yellow
}
Write-Host ""

# ETAPE 4 : Executer les tests Playwright
Write-Host "Execution des tests E2E..." -ForegroundColor Yellow
Write-Host ""

Set-Location $FRONTEND_DIR

# Lancer les tests
npx playwright test --reporter=list,html

Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Tous les tests ont reussi !" -ForegroundColor Green
} else {
    Write-Host "Warning: Certains tests ont echoue" -ForegroundColor Yellow
}

Write-Host ""

# ETAPE 5 : Arreter les serveurs
Write-Host "Arret des serveurs..." -ForegroundColor Yellow

Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
Remove-Job -Job $backendJob -ErrorAction SilentlyContinue

Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
Remove-Job -Job $frontendJob -ErrorAction SilentlyContinue

Write-Host "OK: Serveurs arretes" -ForegroundColor Green
Write-Host ""

# ETAPE 6 : Afficher le resume
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   RESULTATS" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Rapport HTML    : frontend/playwright-report/index.html" -ForegroundColor White
Write-Host "Captures ecran  : frontend/playwright-report/screenshots/" -ForegroundColor White
Write-Host "Videos          : frontend/test-results/" -ForegroundColor White
Write-Host ""

# Ouvrir le rapport automatiquement
Write-Host "Ouverture du rapport..." -ForegroundColor Yellow
Start-Process "frontend/playwright-report/index.html"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   Tests termines !" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
