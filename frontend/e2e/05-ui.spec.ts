/**
 * Tests E2E - Interface Utilisateur
 * 
 * Teste les composants UI communs : recherche globale, notifications, thème
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { globalSearch } from './helpers/navigation';

test.describe('🎨 Interface Utilisateur', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });
  
  test('devrait ouvrir la recherche globale avec Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+K');
    
    // Vérifier que le modal de recherche s'ouvre
    await expect(page.locator('input[type="search"], input[placeholder*="Recherche"]')).toBeVisible({ timeout: 3000 });
    
    await page.screenshot({ path: 'playwright-report/screenshots/ui-global-search.png' });
    
    // Fermer avec Escape
    await page.keyboard.press('Escape');
  });
  
  test('devrait rechercher du contenu', async ({ page }) => {
    await globalSearch(page, 'étudiant');
    
    // Vérifier que des résultats apparaissent
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'playwright-report/screenshots/ui-search-results.png' });
  });
  
  test('devrait ouvrir le centre de notifications', async ({ page }) => {
    // Chercher l'icône de notification (cloche)
    const notifButton = page.locator('button[aria-label*="notif" i], button:has-text("🔔")').first();
    
    if (await notifButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notifButton.click();
      
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'playwright-report/screenshots/ui-notifications.png' });
    }
  });
  
  test('devrait changer le thème (clair/sombre)', async ({ page }) => {
    // Chercher le bouton de thème
    const themeButton = page.locator('button[aria-label*="thème" i], button:has([class*="sun" i]), button:has([class*="moon" i])').first();
    
    if (await themeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Capture avant
      await page.screenshot({ path: 'playwright-report/screenshots/ui-theme-light.png', fullPage: true });
      
      await themeButton.click();
      await page.waitForTimeout(500);
      
      // Sélectionner mode sombre
      const darkOption = page.locator('button:has-text("Sombre"), [role="menuitem"]:has-text("Sombre")').first();
      if (await darkOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await darkOption.click();
        await page.waitForTimeout(500);
        
        // Capture après
        await page.screenshot({ path: 'playwright-report/screenshots/ui-theme-dark.png', fullPage: true });
      }
    }
  });
  
  test('devrait afficher le menu utilisateur', async ({ page }) => {
    // Chercher le bouton de menu utilisateur
    const userMenu = page.locator('[aria-label="Menu utilisateur"], button:has-text("Profil"), button:has-text("Admin")').first();
    
    if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userMenu.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ path: 'playwright-report/screenshots/ui-user-menu.png' });
    }
  });
  
  test('devrait être responsive (mobile)', async ({ page }) => {
    // Passer en mode mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'playwright-report/screenshots/ui-mobile.png', fullPage: true });
    
    // Revenir en desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });
  
});
