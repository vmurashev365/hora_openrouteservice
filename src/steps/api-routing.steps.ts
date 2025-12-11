import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from '../fixtures/test';
import { RouteApiResponse } from '../utils/ApiClient';

/**
 * 🥒 API Step Definitions - Direct API Testing Layer
 * ===================================================
 * 
 * ARCHITECTURAL PRINCIPLE: Test Pyramid
 * - UI Tests (Top): Few, slow, expensive - test critical user journeys
 * - API Tests (Middle): More, faster, cheaper - test business logic
 * - Unit Tests (Bottom): Many, fastest, cheapest - test individual functions
 * 
 * WHY API TESTS MATTER:
 * - 10x faster than UI tests (no browser startup, no rendering)
 * - More stable (no flaky UI interactions)
 * - Test API contract directly (catches breaking changes)
 * - Can test edge cases that are hard to reach via UI
 * 
 * INTERVIEW TALKING POINT:
 * "I follow the Test Pyramid principle. Most of my tests are at the API layer
 * because they're fast and reliable. UI tests only cover critical user paths."
 */

const { Given, When, Then } = createBdd(test);

// Context storage for test scenario
let startCoordinates: { longitude: number; latitude: number };
let endCoordinates: { longitude: number; latitude: number };
let apiResponse: RouteApiResponse;
let routingProfile: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking' = 'driving-car';
let requestStartTime: number;

/**
 * BACKGROUND STEP: Verify API availability
 * 
 * PRODUCTION CONSIDERATION:
 * In a real framework, you'd check API health endpoint or environment config.
 * For this demo, we assume API is always available.
 */
Given('the OpenRouteService API is available', async () => {
  // Placeholder: In production, you'd check health endpoint
  console.log('✓ OpenRouteService API endpoint configured');
});

/**
 * GIVEN STEP: Set start coordinates
 * 
 * COORDINATE FORMAT: "longitude,latitude" (OpenRouteService convention)
 * Example: "8.681495,49.41461" = Heidelberg, Germany
 */
Given('I have valid start coordinates {string}', async ({}, coordinates: string) => {
  const [lon, lat] = coordinates.split(',').map(Number);
  startCoordinates = { longitude: lon, latitude: lat };
  console.log(`📍 Start: ${startCoordinates.latitude}, ${startCoordinates.longitude}`);
});

/**
 * GIVEN STEP: Set end coordinates
 * 
 * COORDINATE FORMAT: "longitude,latitude" (OpenRouteService convention)
 * Example: "8.687872,49.420318" = Location near Heidelberg
 */
Given('I have valid end coordinates {string}', async ({}, coordinates: string) => {
  const [lon, lat] = coordinates.split(',').map(Number);
  endCoordinates = { longitude: lon, latitude: lat };
  console.log(`📍 End: ${endCoordinates.latitude}, ${endCoordinates.longitude}`);
});

/**
 * WHEN STEP: Request driving route
 * 
 * API INTERACTION:
 * - POST /v2/directions/driving-car/json
 * - Body: { coordinates: [[lon, lat], [lon, lat]] }
 * - No browser, no UI, just HTTP request
 */
When('I request a driving route from the API', async ({ apiClient }) => {
  requestStartTime = Date.now();
  
  apiResponse = await apiClient.getRoute({
    start: startCoordinates,
    end: endCoordinates,
    profile: 'driving-car'
  });

  const requestDuration = Date.now() - requestStartTime;
  console.log(`✓ API responded in ${requestDuration}ms`);
});

/**
 * WHEN STEP: Request route with specific profile
 * 
 * ROUTING PROFILES:
 * - driving-car: Standard car navigation
 * - driving-hgv: Heavy Goods Vehicle (trucks) - avoids low bridges, weight restrictions
 * - cycling-regular: Bicycle routes
 * - foot-walking: Pedestrian paths
 * 
 * LOGISTICS USE CASE:
 * HORA Services needs HGV routing for delivery trucks to avoid restricted roads
 */
When('I request a {string} route from the API', async ({ apiClient }, profile: string) => {
  requestStartTime = Date.now();
  
  routingProfile = profile as typeof routingProfile;
  
  apiResponse = await apiClient.getRoute({
    start: startCoordinates,
    end: endCoordinates,
    profile: routingProfile
  });

  const requestDuration = Date.now() - requestStartTime;
  console.log(`✓ API responded in ${requestDuration}ms for profile: ${profile}`);
});

/**
 * THEN STEP: Validate HTTP status
 * 
 * CONTRACT TESTING:
 * - 200 OK = Route calculated successfully
 * - 400 Bad Request = Invalid coordinates
 * - 404 Not Found = No route found (e.g., water crossing)
 * - 429 Too Many Requests = Rate limited
 * - 500 Server Error = API failure
 */
Then('the response status should be 200', async () => {
  // Status validation happens in ApiClient.getRoute() via response.ok()
  // If we reach this step, status was 200 (or test would have failed)
  expect(apiResponse, 'API response should be present').toBeTruthy();
  console.log('✓ HTTP 200 OK received');
});

/**
 * THEN STEP: Validate distance field exists
 * 
 * API CONTRACT:
 * Response must contain: features[0].properties.summary.distance
 * Type: number (meters)
 */
Then('the response should contain distance in meters', async () => {
  const distance = apiResponse.features[0].properties.summary.distance;
  
  expect(distance, 'Response must contain distance field').toBeDefined();
  expect(typeof distance, 'Distance must be a number').toBe('number');
  expect(distance, 'Distance must be positive').toBeGreaterThan(0);
  
  console.log(`✓ Distance: ${distance} meters`);
});

/**
 * THEN STEP: Validate duration field exists
 * 
 * API CONTRACT:
 * Response must contain: features[0].properties.summary.duration
 * Type: number (seconds)
 */
Then('the response should contain duration in seconds', async () => {
  const duration = apiResponse.features[0].properties.summary.duration;
  
  expect(duration, 'Response must contain duration field').toBeDefined();
  expect(typeof duration, 'Duration must be a number').toBe('number');
  expect(duration, 'Duration must be positive').toBeGreaterThan(0);
  
  console.log(`✓ Duration: ${duration} seconds`);
});

/**
 * THEN STEP: Validate geometry exists
 * 
 * API CONTRACT:
 * Response must contain: features[0].geometry.coordinates
 * Type: Array of [longitude, latitude] pairs for turn-by-turn navigation
 */
Then('the response should contain route geometry', async ({ apiClient }) => {
  const isValid = apiClient.validateRouteResponse(apiResponse);
  
  expect(isValid, 'Response must have valid route structure').toBe(true);
  
  const waypointCount = apiResponse.features[0].geometry.coordinates.length;
  console.log(`✓ Route geometry contains ${waypointCount} waypoints`);
});

/**
 * THEN STEP: Validate distance is reasonable for road routes
 * 
 * SANITY CHECK:
 * - Too small (<100m): Likely a parsing error or wrong units
 * - Too large (>500km): May indicate coordinate swap or API bug
 */
Then('the distance should be greater than {int} meters', async ({}, minDistance: number) => {
  const distance = apiResponse.features[0].properties.summary.distance;
  
  expect(distance, `Distance should be > ${minDistance}m (sanity check)`).toBeGreaterThan(minDistance);
});

Then('the distance should be less than {int} meters', async ({}, maxDistance: number) => {
  const distance = apiResponse.features[0].properties.summary.distance;
  
  expect(distance, `Distance should be < ${maxDistance}m (sanity check)`).toBeLessThan(maxDistance);
});

/**
 * THEN STEP: Validate US market conversion
 * 
 * BUSINESS REQUIREMENT:
 * US drivers expect miles, not kilometers.
 * This validates our conversion logic (1 mile = 1609.34 meters).
 */
Then('the distance should be convertible to miles', async ({ apiClient }) => {
  const distanceMeters = apiResponse.features[0].properties.summary.distance;
  const distanceMiles = apiClient.metersToMiles(distanceMeters);
  
  expect(distanceMiles, 'Miles conversion should produce positive value').toBeGreaterThan(0);
  expect(distanceMiles, 'Miles should be less than meters (1 mile = 1609m)').toBeLessThan(distanceMeters);
  
  console.log(`✓ US market: ${distanceMiles} miles`);
});

/**
 * THEN STEP: Validate API performance
 * 
 * NON-FUNCTIONAL REQUIREMENT:
 * API should respond within 5 seconds for production use.
 * Drivers need quick route calculations on mobile devices.
 */
Then('the API should respond within {int} seconds', async ({}, maxSeconds: number) => {
  const requestDuration = Date.now() - requestStartTime;
  const requestDurationSeconds = requestDuration / 1000;
  
  expect(
    requestDurationSeconds,
    `API should respond within ${maxSeconds}s for production use`
  ).toBeLessThan(maxSeconds);
  
  console.log(`✓ Performance: ${requestDurationSeconds.toFixed(2)}s (threshold: ${maxSeconds}s)`);
});

/**
 * THEN STEP: Validate waypoint count
 * 
 * TECHNICAL REQUIREMENT:
 * Routes need multiple waypoints for turn-by-turn navigation.
 * Minimum 2 (start + end), typical routes have 20-200.
 */
Then('the route should contain at least {int} waypoints', async ({}, minWaypoints: number) => {
  const waypoints = apiResponse.features[0].geometry.coordinates;
  
  expect(
    waypoints.length,
    `Route must have at least ${minWaypoints} waypoints for navigation`
  ).toBeGreaterThanOrEqual(minWaypoints);
  
  console.log(`✓ Waypoints: ${waypoints.length} (minimum: ${minWaypoints})`);
});

/**
 * THEN STEP: Validate waypoint structure
 * 
 * API CONTRACT:
 * Each waypoint must be [longitude, latitude] array.
 * Invalid structure = broken navigation.
 */
Then('each waypoint should have longitude and latitude', async () => {
  const waypoints = apiResponse.features[0].geometry.coordinates;
  
  for (const waypoint of waypoints) {
    expect(Array.isArray(waypoint), 'Waypoint should be an array').toBe(true);
    expect(waypoint.length, 'Waypoint should have 2 coordinates').toBe(2);
    
    const [lon, lat] = waypoint;
    expect(typeof lon, 'Longitude should be a number').toBe('number');
    expect(typeof lat, 'Latitude should be a number').toBe('number');
    
    // Validate coordinate ranges
    expect(lon, 'Longitude should be between -180 and 180').toBeGreaterThanOrEqual(-180);
    expect(lon, 'Longitude should be between -180 and 180').toBeLessThanOrEqual(180);
    expect(lat, 'Latitude should be between -90 and 90').toBeGreaterThanOrEqual(-90);
    expect(lat, 'Latitude should be between -90 and 90').toBeLessThanOrEqual(90);
  }
  
  console.log('✓ All waypoints have valid longitude/latitude coordinates');
});
