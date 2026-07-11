/**
 * Tests E2E - Enseignant
 *
 * Teste la saisie de notes et gestion de cours
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateTo, verifyPageTitle, verifyPageContains } from './helpers/navigation';

test.describe('👨‍🏫 Enseignant', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'teacher');
  });

  test('devrait voir son dashboard enseignant', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    // Le <h1> du dashboard enseignant est le nom de l'utilisateur — on
    // vérifie plutôt un repère de contenu (KPIs du dashboard enseignant).
    await verifyPageContains(page, /mes cours|cours aujourd'hui|notes à valider/i);

    await page.screenshot({ path: 'playwright-report/screenshots/teacher-home.png', fullPage: true });
  });

  test('devrait accéder à la saisie des notes', async ({ page }) => {
    await navigateTo(page, 'Notes & Évaluations');

    await verifyPageTitle(page, /saisie|note/i);

    // Vérifier la présence des sélecteurs EC et Session
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible();

    await page.screenshot({ path: 'playwright-report/screenshots/teacher-grades-entry.png', fullPage: true });
  });

  test('devrait pouvoir sélectionner un EC et une session', async ({ page }) => {
    await navigateTo(page, 'Notes & Évaluations');

    // Sélectionner un EC (premier disponible)
    const ecSelect = page.locator('select').first();
    const ecCount = await ecSelect.locator('option').count();
    if (ecCount > 1) {
      await ecSelect.selectOption({ index: 1 });
    }

    await page.waitForTimeout(1000);

    // Sélectionner une session
    const sessionSelect = page.locator('select').nth(1);
    const sessionCount = await sessionSelect.locator('option').count();
    if (sessionCount > 1) {
      await sessionSelect.selectOption({ index: 1 });
    }

    await page.waitForTimeout(2000);

    // Vérifier qu'un tableau apparaît (s'il y a des étudiants)
    const hasTable = await page.locator('table, tbody tr').count() > 0;
    if (hasTable) {
      await page.screenshot({ path: 'playwright-report/screenshots/teacher-grades-table.png', fullPage: true });
    }
  });

  test('devrait voir la liste de ses cours', async ({ page }) => {
    await navigateTo(page, 'Mes Cours');

    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'playwright-report/screenshots/teacher-courses.png', fullPage: true });
  });

  test('devrait voir ses devoirs', async ({ page }) => {
    await navigateTo(page, 'Mes Devoirs');

    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'playwright-report/screenshots/teacher-assignments.png', fullPage: true });
  });

  test('NE DEVRAIT PAS pouvoir accéder à une page réservée aux administrateurs', async ({ page }) => {
    await page.goto('/admin/users');

    await page.waitForURL(/\/unauthorized/, { timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).not.toContain('/admin/users');
  });

});
