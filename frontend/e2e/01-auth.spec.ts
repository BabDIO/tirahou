/**
 * Tests E2E - Authentification
 * 
 * Teste la connexion et déconnexion pour tous les rôles
 */

import { test, expect } from '@playwright/test';
import { login, logout } from './helpers/auth';
import { TEST_ACCOUNTS, AccountType } from './fixtures/accounts';

test.describe('🔐 Authentification', () => {
  
  test('devrait afficher la page de connexion', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page).toHaveTitle(/TIRAHOU|Connexion/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
  
  test('devrait refuser une connexion avec mauvais identifiants', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'faux@email.com');
    await page.fill('input[type="password"]', 'mauvaisMotDePasse');
    await page.click('button[type="submit"]');
    
    // Vérifier le message d'erreur
    await expect(page.locator('body')).toContainText(/erreur|invalide|incorrect/i, { timeout: 5000 });
  });
  
  // Test pour chaque rôle
  const roles: AccountType[] = ['admin', 'student', 'teacher', 'scolarite', 'financier', 'responsable', 'bibliothecaire'];
  
  for (const role of roles) {
    test(`devrait connecter et déconnecter ${role}`, async ({ page }) => {
      // Connexion
      await login(page, role);
      
      // Vérifier qu'on est sur le dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('body')).toContainText(TEST_ACCOUNTS[role].name);
      
      // Prendre une capture d'écran du dashboard
      await page.screenshot({ path: `playwright-report/screenshots/${role}-dashboard.png`, fullPage: true });
      
      // Déconnexion
      await logout(page);
      
      // Vérifier qu'on est déconnecté
      await expect(page).toHaveURL(/\/login/);
    });
  }
  
});
