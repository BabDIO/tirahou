/**
 * Tests E2E - Étudiant
 * 
 * Teste toutes les fonctionnalités accessibles à un étudiant
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateTo, verifyPageTitle, waitForTable } from './helpers/navigation';

test.describe('👨‍🎓 Étudiant', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page, 'student');
  });
  
  test('devrait voir son dashboard étudiant', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/student/);
    await verifyPageTitle(page, /dashboard|tableau de bord/i);
    
    // Capture du dashboard
    await page.screenshot({ path: 'playwright-report/screenshots/student-home.png', fullPage: true });
  });
  
  test('devrait consulter ses notes', async ({ page }) => {
    // Naviguer vers "Mes notes"
    await navigateTo(page, 'Mes notes');
    
    // Vérifier la page
    await verifyPageTitle(page, /notes|résultats/i);
    
    // Attendre le chargement des données
    await page.waitForTimeout(2000);
    
    // Capture
    await page.screenshot({ path: 'playwright-report/screenshots/student-grades.png', fullPage: true });
  });
  
  test('devrait voir son emploi du temps', async ({ page }) => {
    await navigateTo(page, 'Emploi du temps');
    
    await verifyPageTitle(page, /emploi du temps|planning/i);
    
    // Attendre le calendrier
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'playwright-report/screenshots/student-schedule.png', fullPage: true });
  });
  
  test('devrait consulter ses absences', async ({ page }) => {
    await navigateTo(page, 'Absences');
    
    await verifyPageTitle(page, /absence|présence/i);
    
    await page.waitForTimeout(1500);
    
    await page.screenshot({ path: 'playwright-report/screenshots/student-attendance.png', fullPage: true });
  });
  
  test('devrait voir ses informations financières', async ({ page }) => {
    await navigateTo(page, 'Finances');
    
    await verifyPageTitle(page, /finance|paiement/i);
    
    await page.waitForTimeout(1500);
    
    await page.screenshot({ path: 'playwright-report/screenshots/student-finance.png', fullPage: true });
  });
  
  test('devrait accéder aux documents', async ({ page }) => {
    await navigateTo(page, 'Documents');
    
    await verifyPageTitle(page, /document/i);
    
    await page.waitForTimeout(1500);
    
    await page.screenshot({ path: 'playwright-report/screenshots/student-documents.png', fullPage: true });
  });
  
  test('NE DEVRAIT PAS pouvoir accéder à la saisie des notes', async ({ page }) => {
    // Essayer d'accéder directement à une page enseignant
    await page.goto('/teacher/grades');
    
    // Devrait être redirigé ou voir un message d'erreur
    await page.waitForTimeout(2000);
    
    // Vérifier qu'on n'est PAS sur la page de saisie
    const url = page.url();
    expect(url).not.toContain('/teacher/grades');
  });
  
});
