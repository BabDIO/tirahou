/**
 * Helpers de navigation pour tests E2E
 */

import { Page, expect } from '@playwright/test';

/**
 * Naviguer vers une page via le menu
 *
 * Note : l'app est une SPA (React Router) — un clic sur un lien de nav ne
 * déclenche pas de navigation navigateur complète, donc `networkidle` seul
 * n'est pas fiable pour attendre la fin du rendu React. On attend en plus
 * qu'un titre de page (h1/h2) soit visible avant de continuer.
 */
export async function navigateTo(page: Page, linkText: string) {
  // Chercher le lien dans la navigation
  const link = page.locator(`a:has-text("${linkText}")`).first();
  await link.click();

  // Attendre la fin des requêtes réseau puis le rendu du contenu React
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.locator('h1, h2').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
}

/**
 * Recherche globale (Ctrl+K)
 *
 * Note : Playwright interprète 'Control+K' (K majuscule) comme nécessitant
 * Shift, ce qui ne correspond pas au raccourci réel de l'app (qui écoute
 * `e.key === 'k'`, minuscule). Utiliser 'Control+k' (minuscule) est donc requis.
 */
export async function globalSearch(page: Page, query: string) {
  // Ouvrir la recherche avec Ctrl+k
  await page.keyboard.press('Control+k');

  // Attendre que le modal de recherche s'ouvre
  await page.waitForSelector('input[type="search"], input[placeholder*="Recherche"]', { timeout: 3000 });

  // Taper la recherche
  await page.fill('input[type="search"], input[placeholder*="Recherche"]', query);

  // Attendre les résultats
  await page.waitForTimeout(1000);
}

/**
 * Vérifier qu'une page contient un titre (h1/h2 exact)
 *
 * À éviter sur les pages dont le <h1> est un "hero" dynamique (nom de
 * l'utilisateur, solde, etc.) plutôt qu'un titre statique — utiliser
 * verifyPageContains dans ce cas.
 */
export async function verifyPageTitle(page: Page, title: string) {
  await expect(page.locator('h1, h2').first()).toContainText(title, { timeout: 8000 });
}

/**
 * Vérifier qu'une page contient un texte donné n'importe où dans le corps
 * (plus robuste que verifyPageTitle pour les pages avec un h1 dynamique)
 */
export async function verifyPageContains(page: Page, text: string | RegExp) {
  await expect(page.locator('body')).toContainText(text, { timeout: 5000 });
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
