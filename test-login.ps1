# Script de test de connexion TIRAHOU
# UTF-8 encoding

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST DE CONNEXION TIRAHOU" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Backend accessible
Write-Host "[1/3] Test backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/login/" -Method OPTIONS -UseBasicParsing -TimeoutSec 5
    Write-Host "  ✓ Backend accessible (port 8000)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Backend inaccessible!" -ForegroundColor Red
    Write-Host "  → Lancez: cd backend && python manage.py runserver" -ForegroundColor Yellow
    exit 1
}

# Test 2: Connexion avec student097@uvhci.edu
Write-Host "`n[2/3] Test connexion student097@uvhci.edu..." -ForegroundColor Yellow
try {
    $body = @{
        email = "student097@uvhci.edu"
        password = "1223@Cisse"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/login/" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Connexion réussie!" -ForegroundColor Green
        $data = $response.Content | ConvertFrom-Json
        Write-Host "  → Access token reçu (${($data.access.Length)} chars)" -ForegroundColor Gray
        Write-Host "  → Refresh token reçu (${($data.refresh.Length)} chars)" -ForegroundColor Gray
        Write-Host "  → Utilisateur: $($data.user.email)" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Erreur HTTP $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ✗ Échec de connexion!" -ForegroundColor Red
    Write-Host "  → $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Frontend accessible
Write-Host "`n[3/3] Test frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "  ✓ Frontend accessible (port 3000)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Frontend inaccessible" -ForegroundColor Yellow
    Write-Host "  → Lancez: cd frontend && npm run dev" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RÉSUMÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  ✓ Fonctionne" -ForegroundColor Green
Write-Host "Login:    ✓ OK avec student097@uvhci.edu" -ForegroundColor Green
Write-Host "`nVous pouvez maintenant tester sur:" -ForegroundColor White
Write-Host "  → http://localhost:3000/login" -ForegroundColor Cyan
Write-Host "  → Email: student097@uvhci.edu" -ForegroundColor Gray
Write-Host "  → Mot de passe: 1223@Cisse" -ForegroundColor Gray
Write-Host "`n========================================`n" -ForegroundColor Cyan
