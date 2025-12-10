# language: en

@logistics @routing
Feature: Route Calculation for Delivery Drivers
  As a delivery driver for HORA Services
  I need to calculate optimal routes between locations
  So that I can plan efficient deliveries and provide accurate ETAs to customers

  Background:
    Given I have opened the route planning map

  @smoke @mobile @critical
  Scenario: Driver calculates a route for a delivery
    When I select a pickup location on the map
    And I select a delivery destination on the map
    Then a valid route should be calculated
    And the route distance should be greater than zero
    And the route duration should be greater than zero
    And the route should contain navigation waypoints

  @regression @performance
  Scenario: Route calculation completes within acceptable time
    When I select a pickup location on the map
    And I select a delivery destination on the map
    Then the route should be calculated within 10 seconds

  @regression @data-validation
  Scenario: Route provides accurate distance metrics for fuel calculations
    When I select a pickup location on the map
    And I select a delivery destination on the map
    Then the route distance should be reported in meters
    And the distance should be convertible to miles for US market

  @edge-case @mobile
  Scenario: Driver attempts to calculate route with same start and end point
    When I select a pickup location on the map
    And I select the same location as delivery destination
    Then the system should handle the edge case gracefully
    # Note: Actual behavior depends on OpenRouteService API response
    # This scenario documents expected system behavior for edge cases
