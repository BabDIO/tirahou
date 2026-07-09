/**
 * Helpers de navigation pour tests E2E
 */

import { Page, expect } from '@playwright/test';

/**
 * Naviguer vers une page via le menu
 */
export async function navigateTo(page: Page, linkText: string) {
  // Chercher le lien dans la navigation
  const link = page.locator(`a:has-text("${linkText}")`).first();
  await link.click();
  
  // Attendre que la page charge
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

/**
 * Recherche globale (Ctrl+K)
 */
export async function globalSearch(page: Page, query: string) {
  // Ouvrir la recherche avec Ctrl+K
  await page.keyboard.press('Control+K');
  
  // Attendre que le modal de recherche s'ouvre
  await page.waitForSelector('input[type="search"], input[placeholder*="Recherche"]', { timeout: 3000 });
  
  // Taper la recherche
  await page.fill('input[type="search"], input[placeholder*="Recherche"]', query);
  
  // Attendre les résultats
  await page.waitForTimeout(1000);
}

/**
 * Vérifier qu'une page contient un titre
 */
export async function verifyPageTitle(page: Page, title: string) {
  await expect(page.locator('h1, h2').first()).toContainText(title, { timeout: 5000 });
}

/**
 * Attendre qu'un tableau se charge
 */
export async function waitForTable(page: Page) {
  await page.waitForSelector('table, [role="table"]', { timeout: 10000 });
  
  // Attendre que le skeleton disparaisse (si présent)
  await page.waitForSelector('.skeleton', { state: 'hidden', timeout: 5000 }).catch(() => {});
}

/**
 * Vérifier qu'un tableau contient des données
 */
export async function verifyTableHasData(page: Page) {
  const rows = page.locator('tbody tr, [role="row"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
}
