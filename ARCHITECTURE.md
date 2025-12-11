# 🏗️ Framework Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HORA Services Test Framework                  │
│                  (OpenRouteService Demo)                         │
│              *** Test Pyramid Architecture ***                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   Playwright Test       │
                    │   Runner                │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            ┌───────▼────────┐       ┌───────▼────────┐
            │   UI TESTS     │       │   API TESTS    │
            │   (Slow)       │       │   (Fast)       │
            │   30% Coverage │       │   70% Coverage │
            └───────┬────────┘       └───────┬────────┘
                    │                        │
         ┌──────────┼──────────┐             │
         │          │          │             │
    ┌────▼───┐ ┌───▼────┐ ┌──▼────┐   ┌────▼────────┐
    │Desktop │ │iPhone  │ │Pixel 5│   │ ApiClient   │
    │Chrome  │ │Safari  │ │Chrome │   │ (Direct API)│
    │1920px  │ │390px   │ │393px  │   │ No Browser  │
    └────┬───┘ └───┬────┘ └──┬────┘   └────┬────────┘
         │         │         │              │
         └─────────┼─────────┘              │
                   │                        │
         ┌─────────▼────────┐     ┌─────────▼────────┐
         │  BDD Layer       │     │  BDD Layer       │
         │  routing.feature │     │  api-routing     │
         │  (UI Tests)      │     │  .feature        │
         └─────────┬────────┘     └─────────┬────────┘
                   │                        │
         ┌─────────▼────────┐     ┌─────────▼────────┐
         │ routing.steps.ts │     │ api-routing      │
         │ (MapPage)        │     │ .steps.ts        │
         └─────────┬────────┘     └─────────┬────────┘
                   │                        │
         ┌─────────▼────────┐     ┌─────────▼────────┐
         │  Fixtures (DI)   │     │  Fixtures (DI)   │
         │  mapPage fixture │     │  apiClient       │
         └─────────┬────────┘     └─────────┬────────┘
                   │                        │
         ┌─────────▼────────┐     ┌─────────▼────────┐
         │  MapPage.ts      │     │  ApiClient.ts    │
         │  - UI clicks     │     │  - Direct HTTP   │
         │  - Network hook  │     │  - No UI         │
         └─────────┬────────┘     └─────────┬────────┘
                   │                        │
                   └─────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │ OpenRouteService│
                    │ API             │
                    │ /v2/directions  │
                    └─────────────────┘
```

## Data Flow: From Gherkin to Assertion

```
1. Feature File (routing.feature)
   ↓
   "When I select a delivery destination on the map"
   
2. Step Definition (routing.steps.ts)
   ↓
   When('I select a delivery destination...', async ({ mapPage }) => {
     await mapPage.drawRouteOnMap(600, 400, 800, 500);
   });
   
3. Page Object (MapPage.ts)
   ↓
   async drawRouteOnMap(x1, y1, x2, y2) {
     const routePromise = this.waitForRouteCalculation();
     await page.mouse.click(x1, y1);
     await page.mouse.click(x2, y2);
     this.routeResponse = await routePromise;
   }
   
4. Network Interception
   ↓
   POST https://api.openrouteservice.org/v2/directions/...
   
5. API Response
   ↓
   {
     "features": [{
       "properties": {
         "summary": {
           "distance": 5420,  // meters
           "duration": 380    // seconds
         }
       }
     }]
   }
   
6. Assertion (routing.steps.ts)
   ↓
   Then('the route distance should be greater than zero', async ({ mapPage }) => {
     const distance = mapPage.getRouteDistance();
     expect(distance).toBeGreaterThan(0);
   });
```

## Test Pyramid Strategy

### Why Two Test Layers?
```
        ▲
       / \     UI Tests (30%)
      /   \    - Slow (browser startup)
     /_____\   - Test critical user flows
    /       \  
   /   API   \ API Tests (70%)
  /   Tests   \- Fast (no browser)
 /             \- Test business logic
/_______________\- More stable
```

### Test Distribution
| Layer | Speed | Count | Purpose |
|-------|-------|-------|---------|
| **UI Tests** | ~5s/test | 5 scenarios | Critical user journeys |
| **API Tests** | ~0.5s/test | 15+ scenarios | Business logic, edge cases |

### When to Use Each Layer
- **UI Tests**: User clicks map, sees route visualization
- **API Tests**: Validate distance calculations, routing algorithms, profiles

## Testing Strategy: UI vs API

### ❌ Traditional Approach (Flaky)
```
Test → Click Map → Wait for Visual Route → Assert Pin Color
       └─ PROBLEM: Canvas pixels can't be queried
```

### ✅ Our Approach (Stable)
```
UI Tests:
Test → Click Map → Intercept API → Assert JSON Response
       └─ SOLUTION: Validate business data, not pixels

API Tests:
Test → Direct HTTP POST → Assert JSON Response
       └─ FASTEST: No browser, no UI, just data validation
```

## Key Architectural Patterns

### 1. Page Object Model (POM)
```typescript
// ❌ BAD: Test logic mixed with implementation
test('calculate route', async ({ page }) => {
  await page.goto('...');
  await page.mouse.click(600, 400);
  const response = await page.waitForResponse(...);
  const json = await response.json();
  expect(json.features[0].properties.summary.distance).toBeGreaterThan(0);
});

// ✅ GOOD: Clean separation of concerns
test('calculate route', async ({ mapPage }) => {
  await mapPage.goto();
  await mapPage.drawRouteOnMap();
  expect(mapPage.getRouteDistance()).toBeGreaterThan(0);
});
```

### 2. Dependency Injection (Fixtures)
```typescript
// ❌ BAD: Manual initialization in every test
test('test 1', async ({ page }) => {
  const mapPage = new MapPage(page);
  await mapPage.goto();
  // ... test logic
});

// ✅ GOOD: Auto-injected via fixtures
test('test 1', async ({ mapPage }) => {
  // mapPage already initialized!
  await mapPage.goto();
  // ... test logic
});
```

### 3. Gray Box Testing
```typescript
// ❌ BAD: Asserting visual elements (flaky)
await expect(page.locator('.route-line')).toBeVisible();

// ✅ GOOD: Asserting API data (stable)
const distance = mapPage.getRouteDistance();
expect(distance).toBeGreaterThan(0);
```

## Multi-Device Test Matrix

| Device | Browser | Engine | Resolution | Purpose |
|--------|---------|--------|------------|---------|
| **Desktop** | Chrome | Chromium | 1920x1080 | Dispatcher/Admin users |
| **iPhone 13** | Safari | WebKit | 390x844 | Primary US driver segment (57% iOS) |
| **Pixel 5** | Chrome | Chromium | 393x851 | Android driver coverage |

## Why This Matters for HORA Services

### Domain Alignment
```
Logistics Concepts     →     Framework Features
─────────────────────────────────────────────────
Route Planning         →     MapPage.drawRouteOnMap()
Distance Calculation   →     API Response: distance (meters)
ETA Estimation         →     API Response: duration (seconds)
Turn-by-Turn Nav       →     API Response: coordinates[]
Mobile-First Drivers   →     iPhone 13 + Pixel 5 tests
US Market Focus        →     Miles conversion, iOS priority
```

### Real-World Scenarios Covered
1. ✅ Driver calculates route from warehouse to customer
2. ✅ System provides accurate fuel cost data (distance)
3. ✅ System provides accurate ETA (duration)
4. ✅ Route calculation completes within 10 seconds (performance)
5. ✅ Edge case: same start/end location (error handling)

## Reporting Flow

```
Playwright Test Runner
  ↓
Test Results (JSON)
  ↓
┌──────────────┬──────────────┬──────────────┐
│   Console    │  Playwright  │   Allure     │
│   Reporter   │  HTML Report │   Report     │
├──────────────┼──────────────┼──────────────┤
│ Quick CI/CD  │ Dev Debugging│ Stakeholder  │
│ Feedback     │ with Traces  │ Dashboards   │
└──────────────┴──────────────┴──────────────┘
```

## Framework Extensibility

### Current State (Demo)
```
src/
├── features/
│   ├── routing.feature         # UI tests (map interaction)
│   └── api-routing.feature     # API tests (no UI)
├── pages/
│   └── MapPage.ts              # Page Object for UI tests
├── utils/
│   └── ApiClient.ts            # HTTP client for API tests
└── steps/
    ├── routing.steps.ts        # UI test step definitions
    └── api-routing.steps.ts    # API test step definitions
```

### Production State (Future)
```
src/
├── features/
│   ├── routing.feature         # Route planning
│   ├── delivery.feature        # Order management
│   └── driver-auth.feature     # Authentication
├── pages/
│   ├── MapPage.ts
│   ├── DriverDashboard.ts
│   └── LoginPage.ts
├── steps/
│   ├── routing.steps.ts
│   ├── delivery.steps.ts
│   └── auth.steps.ts
├── fixtures/
│   └── test.ts                 # Extended with ApiClient, DbHelper
└── utils/
    ├── TestDataFactory.ts
    └── ApiClient.ts
```

## Technology Justification

### Why Playwright over Cypress?
| Feature | Playwright | Cypress |
|---------|-----------|---------|
| Multi-browser | ✅ Chrome, Safari, Firefox | ⚠️ Chrome only (WebKit experimental) |
| Network Interception | ✅ Native | ✅ Native |
| Mobile Testing | ✅ Real device emulation | ⚠️ Viewport only |
| Auto-waiting | ✅ Built-in | ✅ Built-in |
| API Testing | ✅ `request` fixture | ⚠️ Requires `cy.request()` |

### Why playwright-bdd over Cucumber-js?
| Feature | playwright-bdd | Cucumber-js |
|---------|---------------|-------------|
| Playwright Integration | ✅ Native | ⚠️ Requires custom glue |
| Step Generation | ✅ Auto-generates `.spec.ts` | ❌ Manual setup |
| Fixture Support | ✅ Full support | ⚠️ Complex world objects |
| TypeScript | ✅ First-class | ⚠️ Requires configuration |

---

## Interview Soundbite

> "This framework demonstrates three critical skills for HORA Services: 
> 1. **Domain Knowledge**: Understanding logistics apps need stable map testing
> 2. **Market Awareness**: Prioritizing iOS (57% US share) with iPhone 13
> 3. **Architectural Excellence**: Using BDD, POM, DI, and Gray Box Testing for maintainable automation"
