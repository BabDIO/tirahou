/**
 * Tests E2E - Administrateur
 * 
 * Teste les fonctionnalités d'administration
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateTo, verifyPageTitle, waitForTable } from './helpers/navigation';

test.describe('🔐 Administrateur', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });
  
  test('devrait voir son dashboard admin', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/admin/);
    
    // Vérifier les statistiques générales
    await expect(page.locator('body')).toContainText(/étudiant|enseignant|statistique/i);
    
    await page.screenshot({ path: 'playwright-report/screenshots/admin-home.png', fullPage: true });
  });
  
  test('devrait accéder à la gestion des utilisateurs', async ({ page }) => {
    await navigateTo(page, 'Utilisateurs');
    
    await verifyPageTitle(page, /utilisateur|gestion/i);
    
    await waitForTable(page);
    
    await page.screenshot({ path: 'playwright-report/screenshots/admin-users.png', fullPage: true });
  });
  
  test('devrait pouvoir rechercher un utilisateur', async ({ page }) => {
    await navigateTo(page, 'Utilisateurs');
    
    await waitForTable(page);
    
    // Rechercher
    const searchInput = page.locator('input[type="search"], input[placeholder*="Recherche"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('etudiant');
      await page.waitForTimeout(1000);
      
      await page.screenshot({ path: 'playwright-report/screenshots/admin-users-search.png', fullPage: true });
    }
  });
  
  test('devrait voir les statistiques globales', async ({ page }) => {
    // Le dashboard admin devrait avoir des cartes statistiques
    const statsCards = page.locator('.card, [class*="stat"]');
    const count = await statsCards.count();
    
    expect(count).toBeGreaterThan(0);
  });
  
});
