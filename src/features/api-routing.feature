@api
Feature: OpenRouteService API - Direct Route Calculation
  As a HORA Services backend developer
  I want to test OpenRouteService routing API directly
  So that I can validate API contract without UI layer overhead

  Background:
    Given the OpenRouteService API is available

  @smoke @api
  Scenario: API returns valid route between two coordinates
    Given I have valid start coordinates "8.681495,49.41461"
    And I have valid end coordinates "8.687872,49.420318"
    When I request a driving route from the API
    Then the response status should be 200
    And the response should contain distance in meters
    And the response should contain duration in seconds
    And the response should contain route geometry

  @api @units
  Scenario: API distance is returned in meters (not kilometers)
    Given I have valid start coordinates "8.681495,49.41461"
    And I have valid end coordinates "8.687872,49.420318"
    When I request a driving route from the API
    Then the distance should be greater than 100 meters
    And the distance should be less than 500000 meters
    And the distance should be convertible to miles

  @api @performance
  Scenario: API responds within acceptable time for production use
    Given I have valid start coordinates "8.681495,49.41461"
    And I have valid end coordinates "8.687872,49.420318"
    When I request a driving route from the API
    Then the API should respond within 5 seconds

  @api @validation
  Scenario: API returns multiple waypoints for turn-by-turn navigation
    Given I have valid start coordinates "8.681495,49.41461"
    And I have valid end coordinates "8.687872,49.420318"
    When I request a driving route from the API
    Then the route should contain at least 2 waypoints
    And each waypoint should have longitude and latitude

  @api @profiles
  Scenario Outline: API supports different routing profiles
    Given I have valid start coordinates "8.681495,49.41461"
    And I have valid end coordinates "8.687872,49.420318"
    When I request a "<profile>" route from the API
    Then the response status should be 200
    And the response should contain distance in meters

    Examples:
      | profile           |
      | driving-car       |
      | driving-hgv       |
      | cycling-regular   |
      | foot-walking      |
