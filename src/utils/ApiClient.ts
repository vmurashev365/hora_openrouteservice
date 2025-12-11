import { APIRequestContext } from '@playwright/test';

/**
 * 🌐 OpenRouteService API Client
 * ================================
 * 
 * PURPOSE:
 * Direct API testing without UI layer - follows the Test Pyramid principle.
 * API tests are faster, more stable, and easier to maintain than UI tests.
 * 
 * ARCHITECTURE:
 * - UI Tests (Top): Test user workflows with browser (slow, expensive)
 * - API Tests (Middle): Test business logic via HTTP (fast, reliable)
 * - Unit Tests (Bottom): Test individual functions (fastest, cheapest)
 * 
 * This client enables the "API Tests" layer for OpenRouteService integration.
 */

export interface Coordinates {
  longitude: number;
  latitude: number;
}

export interface RouteRequest {
  start: Coordinates;
  end: Coordinates;
  profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';
}

export interface RouteApiResponse {
  features: Array<{
    properties: {
      summary: {
        distance: number;  // in meters
        duration: number;  // in seconds
      };
    };
    geometry: {
      coordinates: number[][];
      type: string;
    };
  }>;
  metadata: {
    query: {
      coordinates: number[][];
      profile: string;
    };
  };
}

/**
 * ApiClient - HTTP Client for OpenRouteService Directions API
 * 
 * USAGE:
 * ```typescript
 * const client = new ApiClient(request);
 * const response = await client.getRoute({
 *   start: { longitude: 8.681495, latitude: 49.41461 },
 *   end: { longitude: 8.687872, latitude: 49.420318 }
 * });
 * ```
 */
export class ApiClient {
  private readonly request: APIRequestContext;
  private readonly baseUrl = 'https://openrouteservice.org';

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Get driving route between two coordinates
   * 
   * @param routeRequest - Start and end coordinates with optional profile
   * @returns API response with route details
   * 
   * API CONTRACT:
   * POST /v2/directions/{profile}/json
   * Body: { coordinates: [[lon, lat], [lon, lat]] }
   * 
   * IMPORTANT: OpenRouteService uses [longitude, latitude] order (NOT lat/lon)
   */
  async getRoute(routeRequest: RouteRequest): Promise<RouteApiResponse> {
    const profile = routeRequest.profile || 'driving-car';
    
    const response = await this.request.post(
      `${this.baseUrl}/v2/directions/${profile}/json`,
      {
        data: {
          coordinates: [
            [routeRequest.start.longitude, routeRequest.start.latitude],
            [routeRequest.end.longitude, routeRequest.end.latitude]
          ]
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouteService API returned ${response.status()}: ${errorText}`
      );
    }

    return await response.json();
  }

  /**
   * Validate route response structure
   * 
   * @param response - API response to validate
   * @returns true if response has valid route structure
   * 
   * CONTRACT VALIDATION:
   * Ensures API response matches expected schema.
   * If OpenRouteService changes their API, this will catch it.
   */
  validateRouteResponse(response: RouteApiResponse): boolean {
    return !!(
      response.features &&
      response.features.length > 0 &&
      response.features[0].properties?.summary?.distance !== undefined &&
      response.features[0].properties?.summary?.duration !== undefined &&
      response.features[0].geometry?.coordinates?.length > 0
    );
  }

  /**
   * Convert meters to miles for US market
   * 
   * @param meters - Distance in meters
   * @returns Distance in miles (rounded to 2 decimals)
   */
  metersToMiles(meters: number): number {
    return Math.round((meters / 1609.34) * 100) / 100;
  }

  /**
   * Convert seconds to human-readable duration
   * 
   * @param seconds - Duration in seconds
   * @returns Formatted string (e.g., "5m 30s" or "1h 15m")
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}
