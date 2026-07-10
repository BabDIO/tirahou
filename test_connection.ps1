# Script PowerShell pour tester la connexion au backend
Write-Host "=== TEST CONNEXION BACKEND ===" -ForegroundColor Cyan

# Test 1: Vérifier que le backend répond
Write-Host "1. Test de ping au backend..." -ForegroundColor Yellow
$backendTest = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health/" -Method Get -ErrorAction SilentlyContinue
if ($backendTest) {
    Write-Host "   ✓ Backend répond: $backendTest" -ForegroundColor Green
} else {
    Write-Host "   ✗ Backend ne répond pas" -ForegroundColor Red
}

# Test 2: Test d'authentification avec un compte étudiant
Write-Host "2. Test d'authentification avec student097@uvhci.edu..." -ForegroundColor Yellow
$authBody = @{
    email = "student097@uvhci.edu"
    password = "1223@Cisse"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/token/" -Method Post -Body $authBody -ContentType "application/json"
    if ($authResponse.access) {
        Write-Host "   ✓ Authentification réussie!" -ForegroundColor Green
        Write-Host "   Token access: $($authResponse.access.Substring(0, 20))..." -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Erreur d'authentification: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== RÉCAPITULATIF ===" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3001" -ForegroundColor White
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "`nPour tester le dashboard:" -ForegroundColor Yellow
Write-Host "1. Ouvrez http://localhost:3001 dans votre navigateur" -ForegroundColor White
Write-Host "2. Connectez-vous avec:" -ForegroundColor White
Write-Host "   Email: student097@uvhci.edu" -ForegroundColor White
Write-Host "   Mot de passe: 1223@Cisse" -ForegroundColor White