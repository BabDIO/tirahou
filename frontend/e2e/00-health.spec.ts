/**
 * Tests E2E - Health Check
 * 
 * Vérifications rapides que l'environnement est opérationnel
 */

import { test, expect } from '@playwright/test';

test.describe('🏥 Health Check', () => {
  
  test('Backend API devrait être accessible', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/schema/');
    expect(response.status()).toBe(200);
    
    const body = await response.text();
    expect(body).toContain('openapi');
  });
  
  test('Frontend devrait charger', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier que la page charge sans erreur
    await expect(page).toHaveTitle(/TIRAHOU/i);
  });
  
  test('Page de connexion devrait être accessible', async ({ page }) => {
    await page.goto('/login');
    
    // Vérifier les éléments essentiels
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
  
});
