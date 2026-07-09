import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour tests E2E TIRAHOU
 * 
 * Exécute des tests automatisés complets simulant de vrais utilisateurs
 * avec captures d'écran, vidéos et rapports HTML détaillés.
 */
export default defineConfig({
  testDir: './e2e',
  
  // Timeout global pour chaque test (2 minutes)
  timeout: 120_000,
  
  // Timeout pour chaque action (10 secondes)
  expect: {
    timeout: 10_000,
  },
  
  // Retry des tests qui échouent
  retries: 1,
  
  // Exécution parallèle des tests
  workers: 3,
  
  // Reporter pour résultats
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
  ],
  
  use: {
    // URL de base de l'application
    baseURL: 'http://localhost:3000',
    
    // Capture d'écran à chaque échec
    screenshot: 'only-on-failure',
    
    // Vidéo pour chaque test
    video: 'retain-on-failure',
    
    // Traces pour debugging
    trace: 'on-first-retry',
    
    // Timeout pour les navigations
    navigationTimeout: 15_000,
    
    // Timeout pour les actions
    actionTimeout: 10_000,
  },

  // Projets de test (navigateurs)
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Serveur de développement (optionnel - à décommenter si besoin)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   timeout: 120_000,
  //   reuseExistingServer: true,
  // },
});
