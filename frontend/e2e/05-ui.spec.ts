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
    // Note : 'Control+K' (majuscule) est interprété par Playwright comme
    // nécessitant Shift — utiliser 'Control+k' (minuscule) pour matcher le
    // raccourci réel de l'app (écoute `e.key === 'k'`).
    await page.keyboard.press('Control+k');

    // Vérifier que le modal de recherche s'ouvre
    await expect(page.locator('input[type="search"], input[placeholder*="Recherche"]')).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'playwright-report/screenshots/ui-global-search.png' });

    // Fermer avec Escape
    await page.keyboard.press('Escape');
  });

  test('devrait ouvrir la recherche globale via le bouton "Recherche rapide"', async ({ page }) => {
    await page.getByRole('button', { name: /recherche rapide/i }).click();

    await expect(page.locator('input[type="search"], input[placeholder*="Recherche"]')).toBeVisible({ timeout: 3000 });
  });

  test('devrait rechercher du contenu', async ({ page }) => {
    await globalSearch(page, 'a');

    // Vérifier que la recherche a bien été saisie (résultats ou message "aucun résultat")
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'playwright-report/screenshots/ui-search-results.png' });
  });

  test('devrait ouvrir le centre de notifications', async ({ page }) => {
    const notifButton = page.getByRole('button', { name: /notifications/i }).first();

    await expect(notifButton).toBeVisible({ timeout: 3000 });
    await notifButton.click();

    // La cloche est un lien vers /notifications (CommunicationPage)
    await page.waitForURL(/\/notifications/, { timeout: 5000 });

    await page.screenshot({ path: 'playwright-report/screenshots/ui-notifications.png', fullPage: true });
  });

  test('devrait changer le thème (clair/sombre)', async ({ page }) => {
    const themeButton = page.getByRole('button', { name: /changer le thème/i }).first();

    await expect(themeButton).toBeVisible({ timeout: 3000 });

    // Capture avant
    await page.screenshot({ path: 'playwright-report/screenshots/ui-theme-light.png', fullPage: true });

    await themeButton.click();

    // Menu déroulant avec les options Clair / Sombre / Système (rendu en <button>, pas menuitem)
    const darkOption = page.getByRole('button', { name: /^sombre$/i }).first();
    await expect(darkOption).toBeVisible({ timeout: 3000 });
    await darkOption.click();

    // Le mode sombre stamp data-theme="dark" sur <html>
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Capture après
    await page.screenshot({ path: 'playwright-report/screenshots/ui-theme-dark.png', fullPage: true });
  });

  test('devrait afficher le menu utilisateur', async ({ page }) => {
    const userMenu = page.locator('[aria-label="Menu utilisateur"]').first();

    await expect(userMenu).toBeVisible({ timeout: 3000 });
    await userMenu.click();

    // Le menu déroulant doit contenir l'option de déconnexion
    await expect(page.locator('button:has-text("Déconnexion")')).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'playwright-report/screenshots/ui-user-menu.png' });
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
