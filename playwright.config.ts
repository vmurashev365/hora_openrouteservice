import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig, cucumberReporter } from 'playwright-bdd';

/**
 * ARCHITECTURAL DECISION: Multi-Device Testing Strategy
 * ========================================================
 * US Logistics Market Requirements:
 * - 57%+ US users on iOS → iPhone 13 (WebKit) is NON-NEGOTIABLE
 * - Android coverage for driver apps → Pixel 5 (Chromium)
 * - Desktop for dispatchers → Chrome
 * 
 * This demonstrates understanding of market demographics in technical decisions.
 */

const testDir = defineBddConfig({
  paths: ['src/features/*.feature'],
  require: ['src/steps/*.steps.ts'],
  importTestFrom: 'src/fixtures/test.ts',
});

export default defineConfig({
  testDir,
  
  /**
   * STABILITY: Fail fast on flaky tests, but give a second chance
   * Production frameworks should not mask instability with excessive retries
   */
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  
  /**
   * DEBUGGING: Capture forensics on failures
   * Tracing only on retry saves disk space in CI/CD pipelines
   */
  use: {
    baseURL: 'https://maps.openrouteservice.org',
    trace: 'on-first-retry', // Captures network, snapshots, console logs
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    
    /**
     * PERFORMANCE: Reasonable timeouts for real-world network conditions
     * Map tiles and routing APIs can be slow under load
     */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /**
   * MARKET-ALIGNED TEST MATRIX
   * Each project represents a critical user segment for HORA Services
   */
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        // Dispatchers/admins typically use large monitors
      },
    },
    {
      name: 'Mobile Safari (iPhone 13)',
      use: {
        ...devices['iPhone 13'],
        /**
         * CRITICAL: WebKit engine behaves differently from Chromium
         * - Touch events vs mouse events
         * - Viewport restrictions (no desktop override)
         * - This catches iOS-specific bugs (e.g., 100vh issues, touch targets)
         */
      },
    },
    {
      name: 'Mobile Chrome (Pixel 5)',
      use: {
        ...devices['Pixel 5'],
        /**
         * Android coverage for broader driver demographics
         * Chromium-based, but mobile viewport and touch interactions
         */
      },
    },
  ],

  /**
   * REPORTING: Allure for stakeholder-friendly test reports
   * Industry standard for showing test results to non-technical managers
   */
  reporter: [
    ['list'], // Console output for quick feedback
    ['html', { open: 'never' }], // Built-in Playwright report
    [
      'allure-playwright',
      {
        outputFolder: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          'Test Environment': 'OpenRouteService Maps',
          'Framework': 'Playwright + playwright-bdd',
          'Target Market': 'US Logistics',
        },
      },
    ],
  ],

  /**
   * CI/CD Integration: Prevent port conflicts in parallel builds
   */
  webServer: undefined, // Not needed for testing external service
});
