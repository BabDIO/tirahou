/**
 * Tests E2E - Étudiant
 *
 * Teste toutes les fonctionnalités accessibles à un étudiant
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateTo, verifyPageTitle, verifyPageContains } from './helpers/navigation';

test.describe('👨‍🎓 Étudiant', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'student');
  });

  test('devrait voir son dashboard étudiant', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    // Le <h1> du dashboard est le nom de l'utilisateur (bannière), pas un
    // titre statique — on vérifie plutôt un repère de contenu du dashboard.
    await verifyPageContains(page, /mes cours|mon emploi du temps|assiduité/i);

    // Capture du dashboard
    await page.screenshot({ path: 'playwright-report/screenshots/student-home.png', fullPage: true });
  });

  test('devrait consulter ses notes', async ({ page }) => {
    // Naviguer vers "Mes Notes"
    await navigateTo(page, 'Mes Notes');

    // Vérifier la page
    await verifyPageTitle(page, /notes|résultats/i);

    // Attendre le chargement des données
    await page.waitForTimeout(2000);

    // Capture
    await page.screenshot({ path: 'playwright-report/screenshots/student-grades.png', fullPage: true });
  });

  test('devrait voir son emploi du temps', async ({ page }) => {
    await navigateTo(page, 'Mon Emploi du temps');

    await verifyPageTitle(page, /emploi du temps|planning/i);

    // Attendre le calendrier
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'playwright-report/screenshots/student-schedule.png', fullPage: true });
  });

  test('devrait consulter son assiduité', async ({ page }) => {
    await navigateTo(page, 'Mon Assiduité');

    await verifyPageTitle(page, /assiduité|présence|absence/i);

    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'playwright-report/screenshots/student-attendance.png', fullPage: true });
  });

  test('devrait voir ses informations financières', async ({ page }) => {
    await navigateTo(page, 'Mes Paiements');

    await verifyPageTitle(page, /financ|paiement/i);

    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'playwright-report/screenshots/student-finance.png', fullPage: true });
  });

  test('devrait accéder aux documents', async ({ page }) => {
    await navigateTo(page, 'Mes Documents');

    await verifyPageTitle(page, /document/i);

    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'playwright-report/screenshots/student-documents.png', fullPage: true });
  });

  test('devrait voir son portefeuille de points', async ({ page }) => {
    await navigateTo(page, 'Mon Portefeuille');

    // Le <h1> de cette page est le solde en points ("0 pts"), pas un titre
    // statique — on vérifie la présence du libellé "Mon portefeuille".
    await verifyPageContains(page, /mon portefeuille/i);

    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'playwright-report/screenshots/student-wallet.png', fullPage: true });
  });

  test('devrait accéder à la bibliothèque et voir ses emprunts', async ({ page }) => {
    await navigateTo(page, 'Bibliothèque');

    await page.waitForTimeout(1500);

    // Onglet "Mes emprunts" du catalogue
    const borrowingsTab = page.locator('button, [role="tab"]').filter({ hasText: /mes emprunts/i }).first();
    if (await borrowingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await borrowingsTab.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'playwright-report/screenshots/student-library.png', fullPage: true });
  });

  test('NE DEVRAIT PAS pouvoir accéder à une page réservée aux administrateurs', async ({ page }) => {
    // Essayer d'accéder directement à une page admin (RBAC : allowedRoles=[...ADMIN])
    await page.goto('/admin/users');

    // ProtectedRoute doit rediriger un rôle non autorisé vers /unauthorized
    await page.waitForURL(/\/unauthorized/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).not.toContain('/admin/users');
  });

});
