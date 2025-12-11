# HORA Services - OpenRouteService Test Automation Framework

## 🎯 Project Overview

This is a **production-ready Test Automation Framework** demonstrating modern Playwright practices for testing map-based logistics applications. 

### Key Features
- ✅ **BDD with Gherkin**: Business-readable test scenarios
- ✅ **Multi-Device Testing**: iPhone 13 (Safari/WebKit) + Pixel 5 (Chrome) + Desktop
- ✅ **Test Pyramid Architecture**: API tests + UI tests (not just UI)
- ✅ **Gray Box Testing**: API interception for Canvas/Map element stability
- ✅ **Dependency Injection**: Clean test architecture with fixtures
- ✅ **TypeScript Strict Mode**: Catch errors at compile time
- ✅ **Allure Reporting**: Stakeholder-friendly test reports

---

## 🏗️ Architecture Highlights

### The Canvas Testing Challenge
**Problem**: OpenRouteService uses Canvas/SVG for map rendering. Traditional selectors (`cy.get('.map-pin')`) don't work.

**Solution**: 
1. Simulate user interactions via `page.mouse.click(x, y)`
2. Intercept network calls (`POST /v2/directions`)
3. Assert API response data (distance, duration, coordinates)

**Why This Matters**: Shows understanding of when to shift testing from UI to API layer.

### Tech Stack Decisions
| Technology | Why Chosen |
|-----------|-----------|
| **playwright-bdd** | Real BDD with Gherkin (not just describe/it blocks) |
| **TypeScript Strict** | Production code quality - fail fast |
| **iPhone 13 (WebKit)** | 57%+ US market share - critical for logistics apps |
| **Allure Reports** | Executive-friendly dashboards |

---

## 📂 Project Structure

```
hora_openrouteservice/
├── src/
│   ├── features/
│   │   ├── routing.feature          # BDD scenarios in business language (UI tests)
│   │   └── api-routing.feature      # API-only tests (no UI)
│   ├── steps/
│   │   ├── routing.steps.ts         # Step definitions (Gherkin → Code)
│   │   └── api-routing.steps.ts    # API test step definitions
│   ├── pages/
│   │   └── MapPage.ts               # Page Object with API interception
│   ├── utils/
│   │   └── ApiClient.ts             # Direct API client for API tests
│   └── fixtures/
│       └── test.ts                  # Dependency Injection setup
├── playwright.config.ts             # Multi-device test configuration
├── package.json                     # Dependencies and scripts
└── tsconfig.json                    # TypeScript strict mode config
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Git

### Installation
```bash
# Clone repository
cd hora_openrouteservice

# Install dependencies
npm install

# Install Playwright browsers (Chrome, WebKit, Chromium)
npx playwright install

# Generate BDD test files from .feature files
npm run bdd:generate
```

### Running Tests
```bash
# Run all tests (Desktop + Mobile)
npm test

# Run with DEMO_MODE enabled (uses mock fallback data)
npm run test:demo

# Run only API tests (no UI, fastest)
npm run test:api

# Run in headed mode (see browser)
npm run test:headed

# Run only mobile tests (iPhone + Android)
npm run test:mobile

# Run smoke tests only
npm run test:smoke

# Debug mode (step through with Playwright Inspector)
npm run test:debug
```

**DEMO_MODE Explained:**
- When `DEMO_MODE=true`, the framework uses mock data (1500m distance, 300s duration) if the API returns geocoding responses instead of routing responses
- Without DEMO_MODE, tests will fail with a descriptive error if mock data would be used
- This prevents false positives in production while allowing demo flexibility

### View Reports
```bash
# Playwright HTML Report
npm run report:open

# Allure Report (requires Allure CLI)
npm run report:allure
```

---


**Code Reference**: `src/fixtures/test.ts`

---

## 🧪 Test Scenarios

### Scenario 1: Basic Route Calculation (Smoke Test)
**Business Value**: Validates core functionality—drivers can calculate delivery routes.

**Technical Approach**:
- Click two map points (pickup + delivery)
- Intercept `POST /v2/directions/` API call
- Assert distance > 0, duration > 0, waypoints exist

**Tags**: `@smoke`, `@mobile`, `@critical`

---

### Scenario 2: Performance Validation
**Business Value**: Ensures routes calculate fast enough for on-the-go drivers (10s threshold).

**Technical Approach**:
- Timeout enforced in `waitForRouteCalculation()`
- Test fails if API doesn't respond within 10 seconds

**Tags**: `@regression`, `@performance`

---

### Scenario 3: US Market Localization
**Business Value**: Drivers expect distance in miles (not kilometers).

**Technical Approach**:
- API returns meters (SI units)
- Framework converts to miles (1 mile = 1609.34m)
- Validates conversion logic

**Tags**: `@regression`, `@data-validation`

---

### Scenario 4: Edge Case (Same Start/End)
**Business Value**: System must handle invalid inputs gracefully (driver error).

**Technical Approach**:
- Click same coordinates twice
- Verify system doesn't crash
- Assert either distance=0 or API error

**Tags**: `@edge-case`, `@mobile`

---

### Scenario 5: Direct API Testing (No UI)
**Business Value**: Validate OpenRouteService API contract directly—10x faster than UI tests.

**Technical Approach**:
- POST request to `/v2/directions/driving-car/json`
- Assert response structure (distance, duration, waypoints)
- Test different routing profiles (car, HGV, bicycle, walking)

**Tags**: `@api`, `@smoke`

**Test Pyramid Strategy**:
- **API Tests**: Fast, stable, test business logic directly
- **UI Tests**: Slower, test critical user workflows
- Follows the 70% API / 30% UI ratio for optimal speed and coverage

---

## 🎥 Demo Script

If presenting this live:

1. **Show `routing.feature`**: "Non-technical stakeholders can read this."
2. **Show `MapPage.ts`**: "Here's how we handle the Canvas challenge with API interception."
3. **Run `npm run test:mobile`**: "Watch tests run on iPhone and Android."
4. **Show Allure report**: "This is what we show to product managers."
5. **Run `npm run test:debug`**: "Here's how I debug flaky tests with Playwright Inspector."

---

## 📈 Next Steps (Production Enhancements)

This is a demo framework. In production, I'd add:

- [ ] **CI/CD Integration**: GitHub Actions pipeline with Allure history
- [ ] **Parallel Execution**: Shard tests across multiple workers
- [ ] **Visual Regression**: Percy or Playwright's `toHaveScreenshot()`
- [ ] **API Contract Testing**: Validate OpenRouteService API schema with Pact
- [ ] **Database Fixtures**: Seed test delivery orders from SQL
- [ ] **Authentication**: Test login flows with session storage
- [ ] **Accessibility**: Add `@axe-core/playwright` for WCAG compliance

---

## 📚 Documentation & Process (ISTQB Aligned)

This project follows structured testing processes adapted for Agile:

- **[Test Plan](TEST_PLAN.md)**: Defines scope, strategy, and risk management (RBT).
- **Risk Register**: Documented analysis of technical risks (e.g., Canvas testing) and mitigation strategies.
- **Traceability**: All tests map directly to Gherkin Feature files, ensuring 100% requirement coverage.
- **[Engineering Report](ENGINEERING_REPORT.md)**: Detailed log of technical challenges (Mobile Viewports, API Mismatches) and solutions.


## 📝 License

MIT (Demo purposes only)
