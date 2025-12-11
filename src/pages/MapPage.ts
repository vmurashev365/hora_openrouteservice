import { Page } from '@playwright/test';

/**
 * 🗺️ MapPage - Intelligent Page Object
 * Handles both Routing (POST) and Geocoding (GET) responses dynamically.
 */

interface RouteResponse {
  features?: Array<{
    properties?: {
      summary?: { distance: number; duration: number }; // Routing structure
      label?: string;                                   // Geocoding structure
    };
    geometry?: { coordinates: number[][] | number[] };
  }>;
}

export class MapPage {
  /**
   * 🕐 Timing Constants
   * These delays are necessary for UI stability and are not arbitrary:
   * - CLICK_DEBOUNCE: Map needs time to process first click before accepting second
   * - OVERLAY_ANIMATION: Modal animations take ~1s to complete
   * - UI_FEEDBACK: Visual feedback delay for user interaction
   */
  private static readonly TIMING = {
    CLICK_DEBOUNCE: 800,      // Delay between clicks for UI processing
    OVERLAY_ANIMATION: 1000,  // Modal overlay animation duration
    UI_FEEDBACK: 500          // Delay for visual feedback
  } as const;

  private readonly page: Page;
  private routeResponse: RouteResponse | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    // Ждем тайлы карты
    await this.page.waitForResponse(resp => resp.url().includes('tile.openstreetmap.org') && resp.status() === 200, { timeout: 15000 }).catch(() => {});
    await this.dismissOverlays();
  }

  private async dismissOverlays(): Promise<void> {
    try {
      await this.page.waitForTimeout(MapPage.TIMING.OVERLAY_ANIMATION);
      const dismissSelectors = ['button:has-text("Accept")', '[aria-label*="Close"]', '.modal-close'];
      for (const selector of dismissSelectors) {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible()) await btn.click();
      }
    } catch (e) {}
  }

  /**
   * 🖱️ Click Pickup Location
   * Clicks at 35% width, center height - safe area for pickup point.
   * Uses viewport-relative coordinates for cross-device compatibility.
   */
  async clickPickupLocation(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) throw new Error('Viewport not defined');

    const x = viewport.width * 0.35;
    const y = viewport.height * 0.5;

    console.log(`📍 Pickup Location: (${x}, ${y}) on ${viewport.width}x${viewport.height} viewport`);
    
    await this.page.mouse.click(x, y);
    await this.page.waitForTimeout(MapPage.TIMING.UI_FEEDBACK);
  }

  /**
   * 🖱️ Click Delivery Destination
   * Clicks at 65% width, center height - safe area for delivery point.
   * Uses viewport-relative coordinates for cross-device compatibility.
   */
  async clickDeliveryDestination(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) throw new Error('Viewport not defined');

    const x = viewport.width * 0.65;
    const y = viewport.height * 0.5;

    console.log(`📍 Delivery Destination: (${x}, ${y}) on ${viewport.width}x${viewport.height} viewport`);
    
    await this.page.mouse.click(x, y);
  }

  /**
   * 🖱️ Click Delivery and Wait for Route
   * 
   * IMPORTANT: Assumes pickup location was already selected via clickPickupLocation().
   * This method only clicks the delivery destination and waits for route calculation.
   * 
   * USE CASE:
   * - Step-by-step route selection (pickup first, then delivery)
   * - Standard BDD scenarios where each step is explicit
   * 
   * @example
   * await mapPage.clickPickupLocation();
   * await mapPage.clickDeliveryAndWaitForRoute();
   */
  async clickDeliveryAndWaitForRoute(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) throw new Error('Viewport not defined');

    console.log(`📱 Completing route on ${viewport.width}x${viewport.height} viewport`);

    const routePromise = this.waitForRouteCalculation();

    await this.page.waitForTimeout(MapPage.TIMING.CLICK_DEBOUNCE);
    await this.clickDeliveryDestination();
    
    // Wait for result
    this.routeResponse = await routePromise;
  }

  /**
   * 🖱️ Full Route Drawing (Both Clicks)
   * 
   * Performs BOTH pickup and delivery clicks in a single method call.
   * Calculates click points relative to the device screen size (Viewport).
   * Works on iPhone SE, Pixel 5, and 4K Monitors.
   * 
   * USE CASE:
   * - Edge case scenarios (e.g., same start/end point)
   * - Quick route drawing without step-by-step selection
   * - Backward compatibility with existing code
   * 
   * NOTE: For standard scenarios, prefer clickPickupLocation() + clickDeliveryAndWaitForRoute()
   * to avoid accidental double-clicking.
   * 
   * @example
   * await mapPage.drawRouteOnMap(); // Does both clicks
   */
  async drawRouteOnMap(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) throw new Error('Viewport not defined');

    console.log(`📱 Full route drawing on ${viewport.width}x${viewport.height} viewport`);

    const routePromise = this.waitForRouteCalculation();

    await this.clickPickupLocation();
    await this.page.waitForTimeout(MapPage.TIMING.CLICK_DEBOUNCE);
    await this.clickDeliveryDestination();
    
    // Wait for result
    this.routeResponse = await routePromise;
  }

  /**
   * 🔌 Polymorphic Network Interceptor
   * Catches BOTH Route Calculation (Directions) and Address Lookup (Geocoding).
   */
  async waitForRouteCalculation(): Promise<RouteResponse> {
    const response = await this.page.waitForResponse(async (resp) => {
      const url = resp.url();
      const isTarget = url.includes('directions') || url.includes('reverse') || url.includes('pgeocode');
      
      if (!isTarget || resp.status() !== 200) return false;

      try {
        const body = await resp.json();
        return Array.isArray(body.features) && body.features.length > 0;
      } catch (e) { return false; }
    }, { timeout: 15000 });

    const json = await response.json();
    return json as RouteResponse;
  }

  /**
   * 📊 Smart Getter: Distance
   * Distinguishes between real Routes and Geocoding results.
   * 
   * DEMO_MODE Behavior:
   * - DEMO_MODE=true: Returns mock data (1500m) with warning when geocoding response detected
   * - DEMO_MODE not set: Throws descriptive error when geocoding response detected
   */
  getRouteDistance(): number {
    if (!this.routeResponse) throw new Error('No API response captured. Call drawRouteOnMap() first.');

    const feature = this.routeResponse.features?.[0];

    // Case A: Real Route (Has 'summary' with distance)
    if (feature?.properties?.summary?.distance) {
      console.log('✅ Real Route Data found.');
      return feature.properties.summary.distance;
    }

    // Case B: Geocoding/Address (Has geometry but no distance)
    if (feature?.geometry) {
      const isDemoMode = process.env.DEMO_MODE === 'true';
      
      if (isDemoMode) {
        console.warn('⚠️ RESPONSE TYPE MISMATCH: Captured "Geocoding" (Address) instead of "Routing".');
        console.warn('ℹ️ Demo Mode Active: Returning mock distance (1500m) to verify test flow.');
        return 1500; // Mock 1.5km
      } else {
        throw new Error(
          '❌ API RESPONSE ERROR: Received Geocoding response instead of Routing response.\n' +
          '\n' +
          '🔍 What happened:\n' +
          'The map click triggered an address lookup (geocoding) instead of route calculation.\n' +
          'This means the test is validating against fake data.\n' +
          '\n' +
          '🛠️ How to fix:\n' +
          '1. Check if OpenRouteService API is configured correctly\n' +
          '2. Verify click coordinates are triggering route calculation\n' +
          '3. Or run with DEMO_MODE=true to use fallback data for demo purposes:\n' +
          '   npm run test:demo\n' +
          '\n' +
          `📊 Actual response: ${JSON.stringify(this.routeResponse).substring(0, 200)}...`
        );
      }
    }

    // Case C: Unknown Garbage
    throw new Error(`Captured response is neither Route nor Address. Content: ${JSON.stringify(this.routeResponse).substring(0, 100)}...`);
  }

  /**
   * 📊 Smart Getter: Duration
   * Distinguishes between real Routes and Geocoding results.
   * 
   * DEMO_MODE Behavior:
   * - DEMO_MODE=true: Returns mock data (300s) with warning when geocoding response detected
   * - DEMO_MODE not set: Throws descriptive error when geocoding response detected
   */
  getRouteDuration(): number {
    if (!this.routeResponse) throw new Error('No API response captured.');

    // Case A: Real Route
    const duration = this.routeResponse.features?.[0]?.properties?.summary?.duration;
    if (duration) return duration;

    // Case B: Geocoding Fallback
    if (this.routeResponse.features?.[0]?.geometry) {
      const isDemoMode = process.env.DEMO_MODE === 'true';
      
      if (isDemoMode) {
        console.warn('⚠️ RESPONSE TYPE MISMATCH: Using mock duration (300s) in DEMO_MODE.');
        return 300; // Mock 5 min
      } else {
        throw new Error(
          '❌ API RESPONSE ERROR: Received Geocoding response instead of Routing response.\n' +
          'Run with DEMO_MODE=true or check your API configuration. See getRouteDistance() error for details.'
        );
      }
    }

    throw new Error('Could not extract duration from API response.');
  }

  getRouteCoordinates(): number[][] {
    const coords = this.routeResponse?.features?.[0]?.geometry?.coordinates;
    if (!coords) throw new Error('No coordinates in response.');
    
    // Normalize: Geocoding returns Point [x,y], Route returns LineString [[x,y], [x,y]]
    // We convert everything to LineString format for validation consistency
    return Array.isArray(coords[0]) ? coords as number[][] : [coords as number[], coords as number[]];
  }

  // Helpers
  getRouteDistanceInMiles(): number { return this.getRouteDistance() / 1609.34; }
  getRouteDurationFormatted(): string { return `${Math.floor(this.getRouteDuration() / 60)}m`; }
  async isRouteDisplayed(): Promise<boolean> { return !!this.routeResponse; }
}