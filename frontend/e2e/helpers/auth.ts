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
  
  // Aller à la page de connexion
  await page.goto('/login');
  
  // Remplir le formulaire
  await page.fill('input[name="email"], input[type="email"]', account.email);
  await page.fill('input[name="password"], input[type="password"]', account.password);
  
  // Soumettre
  await page.click('button[type="submit"]');
  
  // Attendre la redirection vers le dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  
  // Vérifier que l'utilisateur est connecté
  await expect(page.locator('body')).toContainText(account.name, { timeout: 5000 });
}

/**
 * Déconnexion
 */
export async function logout(page: Page) {
  // Chercher le bouton de déconnexion (peut être dans un menu dropdown)
  const logoutButton = page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion")').first();
  
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
  } else {
    // Essayer d'ouvrir un menu utilisateur d'abord
    const userMenu = page.locator('[aria-label="Menu utilisateur"], button:has-text("Profil")').first();
    if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenu.click();
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion")').first().click();
    }
  }
  
  // Attendre la redirection vers login
  await page.waitForURL(/\/login/, { timeout: 5000 });
}

/**
 * Vérifier que l'utilisateur est sur son dashboard
 */
export async function verifyDashboard(page: Page, accountType: AccountType) {
  const account = TEST_ACCOUNTS[accountType];
  
  // Vérifier l'URL contient dashboard
  await expect(page).toHaveURL(/\/dashboard/);
  
  // Vérifier le nom de l'utilisateur
  await expect(page.locator('body')).toContainText(account.name);
}
