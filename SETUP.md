# 🚀 Quick Setup Guide for Interview Demo

## 1. Install Dependencies

```powershell
# Navigate to project directory
cd c:\playwright\hora_openrouteservice

# Install Node.js dependencies
npm install

# Install Playwright browsers (Chrome, WebKit for Safari, Chromium)
npx playwright install
```

## 2. Generate BDD Test Files

```powershell
# Generate step definition glue code from .feature files
npm run bdd:generate
```

**What this does**: `playwright-bdd` scans `src/features/*.feature` and creates `.spec.ts` files that Playwright can execute.

## 3. Run Tests

```powershell
# Run all tests across all devices
npm test

# Run with visible browser (for demo)
npm run test:headed

# Run only mobile tests (iPhone + Android)
npm run test:mobile

# Run smoke tests only
npm run test:smoke

# Debug mode (Playwright Inspector)
npm run test:debug
```

## 4. View Reports

```powershell
# Playwright HTML report
npm run report:open

# Allure report (requires Allure CLI installation)
npm install -g allure-commandline
npm run report:allure
```

---

## 🎯 Demo Flow for Interview

### Part 1: Code Walkthrough (10 minutes)

1. **Show architecture diagram** (from README)
   - "This is a production-ready framework with BDD, Page Objects, and DI"

2. **Open `src/features/routing.feature`**
   - "Business stakeholders can read this without technical knowledge"

3. **Open `src/pages/MapPage.ts`**
   - Explain the Canvas challenge
   - Show `waitForRouteCalculation()` method
   - "This is Gray Box Testing—we validate API responses, not pixels"

4. **Open `src/steps/routing.steps.ts`**
   - Show how Gherkin connects to code
   - Point out API assertions vs. UI assertions

5. **Open `playwright.config.ts`**
   - "iPhone 13 is critical for US market—57% iOS penetration"
   - Show multi-device projects

### Part 2: Live Test Execution (5 minutes)

```powershell
# Run tests with visible browser
npm run test:headed -- --project="Mobile Safari (iPhone 13)"
```

**What to narrate**:
- "Watch how we click coordinates, not DOM elements"
- "See the network interception—we're capturing the API call"
- "This runs on WebKit, not Chrome—catches iOS-specific bugs"

### Part 3: Report Review (5 minutes)

```powershell
# Generate and open Allure report
npm run report:allure
```

**What to show**:
- Test execution timeline
- Environment info (framework, target market)
- Attachments (traces, videos on failures)

---

## ❓ Expected Interview Questions

### Q1: "Why not just use Selenium?"
**Answer**: 
> "Playwright has built-in auto-waiting, network interception, and mobile emulation. For testing modern SPAs with API-driven UIs, it's more stable. Selenium requires third-party libraries (WebDriverManager, RestAssured) for what Playwright does natively."

### Q2: "How do you handle flaky tests?"
**Answer**:
> "Three strategies: 
> 1. **API Interception**: Instead of waiting for UI updates, I intercept the API call (see `MapPage.waitForRouteCalculation()`).
> 2. **Smart Waits**: Wait for actual network responses, not arbitrary timeouts.
> 3. **Retry Logic**: Configured retries (1 locally, 2 in CI) but not excessive—flaky tests should be fixed, not masked."

### Q3: "How would you scale this for 500+ tests?"
**Answer**:
> "Four approaches:
> 1. **Sharding**: Split tests across parallel workers (`--shard=1/4`)
> 2. **Test Distribution**: Use CI matrix strategy (GitHub Actions jobs)
> 3. **Smart Grouping**: Run smoke tests on every PR, full regression nightly
> 4. **Worker-Scoped Fixtures**: Cache expensive setups (DB connections) at worker level, not per-test."

### Q4: "How do you test authenticated flows?"
**Answer**:
> "I'd create an `authContext` fixture that handles login and stores session in `storageState`. Tests would:
> ```typescript
> test.use({ storageState: 'auth/driver-session.json' });
> ```
> This skips login UI for 99% of tests—only auth-specific tests would exercise the login flow."

---

## 🐛 Troubleshooting

### Tests fail with "Cannot find module 'playwright-bdd'"
**Solution**: 
```powershell
npm install
npm run bdd:generate
```

### Tests fail with "Timeout waiting for route calculation"
**Solution**: 
- Network may be slow. Increase timeout in `MapPage.ts`:
  ```typescript
  await this.page.waitForResponse(..., { timeout: 30000 });
  ```

### Browser doesn't launch in headed mode
**Solution**: 
```powershell
npx playwright install --force
```

---

## 📋 Pre-Interview Checklist

- [ ] Run `npm install` successfully
- [ ] Run `npm test` and verify at least 1 scenario passes
- [ ] Open Allure report to verify it renders
- [ ] Practice explaining the Canvas challenge (30-second pitch)
- [ ] Review README talking points
- [ ] Have VS Code open with key files pinned
- [ ] Test demo on company laptop (if different from personal machine)

---

## 🎤 Opening Statement (30 seconds)

> "I built this framework to demonstrate how I'd approach testing a logistics app with complex map interactions. The key challenge was that the map is a Canvas element—you can't use traditional selectors. So I implemented Gray Box Testing: we simulate user interactions via coordinates and validate the underlying API responses. This approach is 100x more stable than pixel-based assertions and validates the data that actually matters to drivers—distance, duration, and navigation waypoints."

---

## 🏁 Closing Statement (30 seconds)

> "This demo shows my approach to production automation: BDD for stakeholder alignment, multi-device testing for market coverage, and API interception for stability. In a real HORA project, I'd extend this with CI/CD integration, visual regression testing, and performance benchmarks. I'm excited to bring this level of rigor to your driver and routing apps."

---

Good luck! 🚀
