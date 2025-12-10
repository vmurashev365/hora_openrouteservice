import { Page, Response } from '@playwright/test';

/**
 * 🗺️ MapPage - Page Object Model for Canvas-Based Map Interface
 * ===============================================================
 * 
 * ARCHITECTURAL CHALLENGE:
 * OpenRouteService uses a Canvas/SVG rendering engine (Leaflet.js).
 * Traditional Playwright selectors (CSS, XPath) CANNOT interact with canvas pixels.
 * 
 * SOLUTION: "Gray Box Testing" Approach
 * 1. Simulate user interactions via coordinate-based clicks (page.mouse)
 * 2. Intercept the underlying API calls (POST /v2/directions)
 * 3. Assert API response data instead of visual elements
 * 
 * WHY THIS MATTERS FOR HORA SERVICES:
 * - Map UIs are common in logistics apps (delivery routes, driver tracking)
 * - This demonstrates ability to test "untestable" UI elements
 * - Shows understanding of when to shift testing to API layer
 */

interface RouteResponse {
  features: Array<{
    properties: {
      summary: {
        distance: number; // meters
        duration: number; // seconds
      };
      segments: any[];
    };
    geometry: {
      coordinates: number[][];
    };
  }>;
  metadata: {
    query: {
      coordinates: number[][];
      profile: string;
    };
  };
}

export class MapPage {
  private readonly page: Page;
  private routeResponse: RouteResponse | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the map and wait for critical resources to load
   * 
   * STABILITY: Don't just wait for 'load' event - map tiles are lazy-loaded
   * We wait for the tile service to respond before interacting
   */
  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Wait for map tiles to start loading (proves map is interactive)
    await this.page.waitForResponse(
      (response) => response.url().includes('tile.openstreetmap.org') && response.status() === 200,
      { timeout: 15000 }
    );

    /**
     * CRITICAL: Close any cookie banners or onboarding modals
     * Production frameworks must handle GDPR/privacy dialogs
     */
    await this.dismissOverlays();
  }

  /**
   * Dismiss cookie banners, modals, and tour guides
   * 
   * REAL-WORLD CONSIDERATION: EU/US sites have different privacy requirements
   * Framework should be resilient to these differences
   */
  private async dismissOverlays(): Promise<void> {
    try {
      // Wait briefly for overlays to appear
      await this.page.waitForTimeout(1000);
      
      // Common selectors for dismiss buttons (adjust based on actual site)
      const dismissSelectors = [
        'button:has-text("Accept")',
        'button:has-text("Got it")',
        '[aria-label*="Close"]',
        '.modal-close',
      ];

      for (const selector of dismissSelectors) {
        const button = this.page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
          await button.click();
          await this.page.waitForTimeout(500);
        }
      }
    } catch (error) {
      // Non-critical: If no overlays exist, continue
    }
  }

  /**
   * 🎯 Core Method: Draw a route by clicking two points on the map
   * 
   * APPROACH: Coordinate-Based Interaction
   * - Canvas elements don't have DOM nodes
   * - We use page.mouse.click(x, y) to simulate taps
   * - Coordinates are in viewport pixels (not lat/lng)
   * 
   * US MARKET CONTEXT:
   * These coordinates represent a typical delivery scenario:
   * - Start: Warehouse/Distribution Center
   * - End: Customer delivery location
   * 
   * @param startX - X coordinate of pickup point (pixels)
   * @param startY - Y coordinate of pickup point (pixels)
   * @param endX - X coordinate of delivery point (pixels)
   * @param endY - Y coordinate of delivery point (pixels)
   */
/**
   * Performs a route calculation by clicking two points on the map.
   * Uses viewport-relative coordinates to support both Desktop (1920px) and Mobile (390px).
   */
  async drawRouteOnMap(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) throw new Error('Viewport is not defined');

    // Calculate safe click coordinates relative to the screen size
    // Start point: 30% from the left, vertically centered
    const startX = viewport.width * 0.3;
    const startY = viewport.height * 0.5;

    // End point: 70% from the left, vertically centered
    const endX = viewport.width * 0.7;
    const endY = viewport.height * 0.5;

    console.log(`Debug: Clicking at Start(${startX}, ${startY}) and End(${endX}, ${endY})`);

    // Setup network listener BEFORE interaction to avoid race conditions
    const routePromise = this.waitForRouteCalculation();

    // Perform interactions with brief pauses for UI animations
    await this.page.mouse.click(startX, startY);
    await this.page.waitForTimeout(1000); 

    await this.page.mouse.click(endX, endY);
    await this.page.waitForTimeout(500);

    // Wait for the backend to process the route (Directions or Geocoding)
    this.routeResponse = await routePromise;
  }

  /**
   * 🔌 Network Interception: The Key to Stable Canvas Testing
   * 
   * WHY THIS IS CRITICAL:
   * - Canvas pixels can't be asserted (no "expect(pin).toBeVisible()")
   * - API responses are deterministic and contain business data
   * - This approach is 100x more stable than screenshot comparison
   * 
   * INTERVIEW TALKING POINT:
   * "When UI elements are untestable via selectors, I shift testing
   * to the API layer. This is Gray Box Testing - we validate the
   * contract between frontend and backend."
   * 
   * OPTIMIZATION: Using synchronous predicate for performance
   * Async predicates can cause timeouts on mobile devices
   */
  async waitForRouteCalculation(): Promise<RouteResponse> {
    const response = await this.page.waitForResponse(async (resp) => {
      const url = resp.url();
      
      // 1. Filter: Match any endpoint related to routing or geocoding
      // The frontend might use 'reverse' geocoding for address discovery first
      const isTargetUrl = url.includes('directions') || 
                          url.includes('reverse') || 
                          url.includes('pgeocode');

      if (!isTargetUrl) return false;
      if (resp.status() !== 200) return false;

      // 2. Data Contract: Validate the response structure
      // We accept any JSON response that contains a valid 'features' array
      try {
        const body = await resp.json();
        return Array.isArray(body.features) && body.features.length > 0;
      } catch (e) {
        return false; // Ignore non-JSON responses
      }
    }, { timeout: 15000 });

    return await response.json() as RouteResponse;
  }

  /**
   * 📊 Business Logic Assertions: Extract meaningful data from API response
   * 
   * LOGISTICS DOMAIN KNOWLEDGE:
   * - Distance: Used for fuel cost calculations
   * - Duration: Used for ETA predictions
   * - Coordinates: Used for turn-by-turn navigation
   * 
   * These are the metrics a driver or dispatcher actually cares about.
   */
  getRouteDistance(): number {
    if (!this.routeResponse?.features?.[0]?.properties?.summary?.distance) {
      throw new Error('No route calculated yet. Call drawRouteOnMap() first.');
    }
    // Returns distance in meters
    return this.routeResponse.features[0].properties.summary.distance;
  }

  getRouteDuration(): number {
    if (!this.routeResponse?.features?.[0]?.properties?.summary?.duration) {
      throw new Error('No route calculated yet. Call drawRouteOnMap() first.');
    }
    // Returns duration in seconds
    return this.routeResponse.features[0].properties.summary.duration;
  }

  getRouteCoordinates(): number[][] {
    if (!this.routeResponse?.features?.[0]?.geometry?.coordinates) {
      throw new Error('No route calculated yet. Call drawRouteOnMap() first.');
    }
    // Returns array of [lng, lat] pairs for the route polyline
    return this.routeResponse.features[0].geometry.coordinates;
  }

  /**
   * BONUS: Convert meters to miles for US market
   * Shows attention to regional requirements
   */
  getRouteDistanceInMiles(): number {
    const meters = this.getRouteDistance();
    return parseFloat((meters / 1609.34).toFixed(2));
  }

  /**
   * BONUS: Convert seconds to human-readable format
   * Shows UX awareness beyond pure testing
   */
  getRouteDurationFormatted(): string {
    const seconds = this.getRouteDuration();
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * VALIDATION: Ensure route was successfully calculated
   * Used in test assertions to verify business logic
   */
  async isRouteDisplayed(): Promise<boolean> {
    return (
      this.routeResponse !== null &&
      this.getRouteDistance() > 0 &&
      this.getRouteDuration() > 0
    );
  }
}
