import { test as base } from 'playwright-bdd';
import { MapPage } from '../pages/MapPage';
import { ApiClient } from '../utils/ApiClient';

/**
 * 🏗️ Test Fixtures - Dependency Injection for Clean Test Architecture
 * =====================================================================
 * 
 * DESIGN PATTERN: Fixture-Based Dependency Injection
 * 
 * PROBLEM WE'RE SOLVING:
 * Without fixtures, every test would have:
 *   const mapPage = new MapPage(page);
 *   await mapPage.goto();
 *   // ... test logic
 * 
 * This leads to:
 * ❌ Code duplication across test files
 * ❌ Inconsistent initialization
 * ❌ Harder to add new page objects (modify every test)
 * ❌ Difficult to mock dependencies for unit testing
 * 
 * WITH FIXTURES:
 * ✅ Single source of truth for page object initialization
 * ✅ Automatic lifecycle management (setup/teardown)
 * ✅ Easy to add new fixtures (e.g., ApiClient, DatabaseHelper)
 * ✅ Tests receive fully-configured dependencies
 * 
 * INTERVIEW TALKING POINT:
 * "This fixture pattern is inspired by Dependency Injection in Spring/NestJS.
 * It makes tests more maintainable and follows SOLID principles."
 */

/**
 * Type definition for our custom test fixtures
 * TypeScript ensures test steps receive correctly-typed page objects
 */
type CustomFixtures = {
  /**
   * mapPage: Fully initialized MapPage instance
   * - Already navigated to base URL
   * - Map tiles loaded and ready
   * - Available in all step definitions via { mapPage } parameter
   */
  mapPage: MapPage;
  
  /**
   * apiClient: Direct API access without UI
   * - Used for API-layer testing (Test Pyramid middle layer)
   * - Faster and more stable than UI tests
   * - Available in all step definitions via { apiClient } parameter
   */
  apiClient: ApiClient;
  
  /**
   * FUTURE EXTENSIONS (commented for demo):
   * In a production framework, you'd add more fixtures here:
   * 
   * dbHelper: DatabaseHelper;     // For data setup/teardown
   * authContext: AuthContext;     // For managing login sessions
   * testDataFactory: TestDataFactory; // For generating test data
   */
};

/**
 * Extend the base playwright-bdd test with custom fixtures
 * This creates a new 'test' object that includes all base fixtures
 * (page, context, browser) plus our custom ones
 */
export const test = base.extend<CustomFixtures>({
  /**
   * mapPage Fixture Definition
   * 
   * LIFECYCLE:
   * 1. Before each test: Create new MapPage instance
   * 2. During test: Pass mapPage to step definitions
   * 3. After test: Automatic cleanup (page closes via Playwright)
   * 
   * SCOPE: Function-level (new instance per test)
   * Each scenario gets a fresh MapPage to avoid test pollution
   */
  mapPage: async ({ page }, use) => {
    /**
     * SETUP PHASE: Initialize page object
     * 
     * ARCHITECTURAL DECISION:
     * We DON'T navigate here because:
     * - Some tests may need to set cookies first
     * - Some tests may want to intercept requests before navigation
     * - The "Given" step handles navigation explicitly (BDD best practice)
     * 
     * This keeps fixtures focused on object creation, not business logic
     */
    const mapPage = new MapPage(page);

    /**
     * HANDOFF PHASE: Provide fixture to test
     * The 'use' callback passes mapPage to step definitions
     * Execution pauses here until the test completes
     */
    await use(mapPage);

    /**
     * TEARDOWN PHASE: Cleanup (if needed)
     * 
     * For MapPage, we don't need explicit cleanup because:
     * - Playwright auto-closes pages after tests
     * - No database connections to close
     * - No temp files to delete
     * 
     * But in production, you might add:
     * await mapPage.clearSessionStorage();
     * await mapPage.resetTestData();
     */
  },

  /**
   * apiClient Fixture Definition
   * 
   * LIFECYCLE:
   * 1. Before each test: Create new ApiClient instance with Playwright's request context
   * 2. During test: Pass apiClient to step definitions
   * 3. After test: Automatic cleanup (request context closes via Playwright)
   * 
   * SCOPE: Function-level (new instance per test)
   * Each scenario gets a fresh ApiClient to avoid test pollution
   * 
   * PURPOSE:
   * Enables API-layer testing without UI - faster, more stable, and follows Test Pyramid
   */
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request);
    
    /**
     * HANDOFF PHASE: Provide fixture to test
     * The 'use' callback passes apiClient to step definitions
     * Execution pauses here until the test completes
     */
    await use(client);
    
    /**
     * TEARDOWN PHASE: Cleanup
     * Playwright automatically closes the request context
     * No explicit cleanup needed for ApiClient
     */
  },

  /**
   * EXAMPLE: Database fixture for data-driven testing (commented for demo)
   * 
   * In logistics testing, you often need to:
   * - Create test delivery orders
   * - Setup driver accounts
   * - Prepopulate route history
   * 
   * A dbHelper fixture would handle this setup/teardown
   */
  /*
  dbHelper: async ({ }, use) => {
    const db = await DatabaseHelper.connect({
      host: process.env.DB_HOST,
      database: 'hora_test',
    });
    
    // Setup: Create test data
    await db.seedTestData();
    
    await use(db);
    
    // Teardown: Clean up test data
    await db.cleanupTestData();
    await db.disconnect();
  },
  */
});

/**
 * Export expect for convenience
 * This allows step definitions to use:
 *   import { test, expect } from '../fixtures/test';
 * 
 * Instead of:
 *   import { test } from '../fixtures/test';
 *   import { expect } from '@playwright/test';
 */
export { expect } from '@playwright/test';

/**
 * 🎓 EDUCATIONAL NOTES FOR INTERVIEW:
 * ===================================
 * 
 * Q: "Why use fixtures instead of a base test class?"
 * A: "Fixtures are more composable. With inheritance (class BaseTest),
 *     you can only extend one class. With fixtures, you can mix and match
 *     capabilities like Lego blocks. Need API + UI + DB? Just add fixtures."
 * 
 * Q: "How do fixtures improve test execution speed?"
 * A: "Fixtures can have different scopes:
 *     - 'test' scope: New instance per test (default)
 *     - 'worker' scope: Shared across tests in same worker (faster)
 *     For expensive setup (like database migrations), worker scope saves time."
 * 
 * Q: "Can fixtures depend on other fixtures?"
 * A: "Yes! Notice how mapPage uses { page } from Playwright's fixtures.
 *     You can build a dependency graph:
 *     authContext → apiClient → mapPage
 *     Playwright resolves the chain automatically."
 * 
 * Q: "How would you handle test data generation?"
 * A: "I'd create a testDataFactory fixture using faker.js or similar:
 *     
 *     testData: async ({ }, use) => {
 *       const factory = new TestDataFactory();
 *       await use({
 *         createDriver: () => factory.generateDriver(),
 *         createDelivery: () => factory.generateDelivery(),
 *       });
 *     }
 *     
 *     Then in tests: const driver = testData.createDriver();
 *     This ensures consistent, realistic test data across scenarios."
 */
