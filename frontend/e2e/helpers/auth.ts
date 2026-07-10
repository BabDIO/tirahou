/**
 * Helpers d'authentification pour tests E2E
 */

import { Page, expect } from '@playwright/test';
import { TEST_ACCOUNTS, AccountType } from '../fixtures/accounts';

/**
 * Connexion avec un compte de test
 */
export async function login(page: Page, accountType: AccountType) {
  const account = TEST_ACCOUNTS[accountType];
  
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
  
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  await expect(page.locator('body')).toContainText(/Bienvenue|Tableau de bord/i, { timeout: 10000 });
}

/**
 * Déconnexion
 */
export async function logout(page: Page) {
  const logoutButton = page.locator('button:has-text("Déconnexion")').first();

  if (!(await logoutButton.isVisible({ timeout: 2000 }).catch(() => false))) {
    const userMenu = page.locator('[aria-label="Menu utilisateur"]').first();
    await userMenu.click();
    await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
  }

  await logoutButton.click();
  await page.waitForURL(/\/login/, { timeout: 10000 });
}

/**
 * Vérifier que l'utilisateur est sur son dashboard
 */
export async function verifyDashboard(page: Page, accountType: AccountType) {
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('body')).toContainText(/Bienvenue|Tableau de bord/i);
}
