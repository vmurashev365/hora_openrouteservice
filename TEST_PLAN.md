# 📋 Test Plan: OpenRouteService Logistics Demo

**Version:** 1.0  
**Status:** Active  
**Last Updated:** Dec 2025  
**Author:** QA Automation Team

## 1. Introduction
This Test Plan outlines the strategy, scope, and risk management approach for the automated testing of the OpenRouteService Logistics module. The goal is to ensure the reliability of route calculations and map interactions for drivers in the US market.

## 2. Test Scope

### 2.1. In Scope (Verified) ✅
The following features are covered by the automated framework:
* **Route Calculation:** Verifying that start/end points generate a valid route.
* **Data Accuracy:** Validating distance (meters/miles) and duration (seconds) via API.
* **Address Discovery:** Verifying Reverse Geocoding triggers on map clicks.
* **Edge Cases:** Handling identical start/end points and invalid inputs.
* **Mobile Compatibility:** Rendering and interaction on iPhone 13 (WebKit) and Pixel 5.

### 2.2. Out of Scope ⛔
* **User Authentication:** Login/Registration flows (mocked or skipped for this demo).
* **Payment Processing:** Not included in the routing module.
* **Performance Load Testing:** Only single-user latency is verified.

## 3. Test Strategy
We strictly follow the **Testing Pyramid** principles with a focus on Gray Box Testing.

| Level | Tool / Approach | Coverage Goal |
|-------|----------------|---------------|
| **E2E (UI)** | Playwright (TypeScript) | **20%** - Critical user flows (Happy Path). |
| **Integration** | Network Interception | **80%** - Validation of API contracts and business logic logic via JSON responses. |
| **Documentation** | BDD (Gherkin) | Living documentation readable by non-technical stakeholders. |

### 3.1. Browser & Device Matrix
| Device | OS | Browser Engine | Rational |
|--------|----|----------------|----------|
| **Desktop** | Windows/Linux | Chromium | Dispatcher view. |
| **iPhone 13** | iOS 15+ | **WebKit** | **Primary Target** (57% US Driver Market). |
| **Pixel 5** | Android | Chromium | Secondary Driver Market. |

## 4. Risk Management (Risk-Based Testing)

| ID | Risk | Likelihood | Impact | Mitigation Strategy |
|----|------|------------|--------|---------------------|
| **R1** | **Canvas Flakiness**<br>Map elements (Canvas/SVG) are hard to test with standard selectors. | High | High | **Implemented:** Shifted validation to the Network layer (intercepting `/v2/directions` and `/geocode`). We validate data, not pixels. |
| **R2** | **API Instability**<br>3rd-party OpenRouteService API may change endpoints (POST vs GET). | Medium | High | **Implemented:** "Smart Predicate" in `MapPage.ts` that detects valid route data regardless of the HTTP method or specific endpoint version. |
| **R3** | **Network Latency**<br>Slow map tile loading causes timeouts. | Medium | Medium | **Implemented:** Adaptive timeouts (15s) and `waitForResponse` explicitly waiting for data, not UI rendering. |

## 5. Deliverables
1.  **Test Framework Code:** Playwright + TypeScript + BDD.
2.  **Automated Reports:** Allure HTML reports generated after every run.
3.  **Execution Evidence:** Traces and Screenshots attached to failed tests.

## 6. Exit Criteria
* 100% of `@smoke` scenarios pass on both Desktop and Mobile.
* No "Critical" or "Blocker" bugs found in the routing logic.
* Code review passed (Clean Code, strict TypeScript).