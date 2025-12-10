/** Generated from: src\features\routing.feature */
import { test } from "../../../src/fixtures/test.ts";

test.describe("Route Calculation for Delivery Drivers", () => {

  test.beforeEach(async ({ Given, mapPage }) => {
    await Given("I have opened the route planning map", null, { mapPage });
  });

  test("Driver calculates a route for a delivery", { tag: ["@logistics", "@routing", "@smoke", "@mobile", "@critical"] }, async ({ When, mapPage, page, And, Then }) => {
    await When("I select a pickup location on the map", null, { mapPage, page });
    await And("I select a delivery destination on the map", null, { mapPage });
    await Then("a valid route should be calculated", null, { mapPage });
    await And("the route distance should be greater than zero", null, { mapPage });
    await And("the route duration should be greater than zero", null, { mapPage });
    await And("the route should contain navigation waypoints", null, { mapPage });
  });

  test("Route calculation completes within acceptable time", { tag: ["@logistics", "@routing", "@regression", "@performance"] }, async ({ When, mapPage, page, And, Then }) => {
    await When("I select a pickup location on the map", null, { mapPage, page });
    await And("I select a delivery destination on the map", null, { mapPage });
    await Then("the route should be calculated within 10 seconds", null, { mapPage });
  });

  test("Route provides accurate distance metrics for fuel calculations", { tag: ["@logistics", "@routing", "@regression", "@data-validation"] }, async ({ When, mapPage, page, And, Then }) => {
    await When("I select a pickup location on the map", null, { mapPage, page });
    await And("I select a delivery destination on the map", null, { mapPage });
    await Then("the route distance should be reported in meters", null, { mapPage });
    await And("the distance should be convertible to miles for US market", null, { mapPage });
  });

  test("Driver attempts to calculate route with same start and end point", { tag: ["@logistics", "@routing", "@edge-case", "@mobile"] }, async ({ When, mapPage, page, And, Then }) => {
    await When("I select a pickup location on the map", null, { mapPage, page });
    await And("I select the same location as delivery destination", null, { mapPage });
    await Then("the system should handle the edge case gracefully", null, { mapPage });
  });

});

// == technical section ==

test.use({
  $test: ({}, use) => use(test),
  $uri: ({}, use) => use("src\\features\\routing.feature"),
  $bddFileMeta: ({}, use) => use(bddFileMeta),
});

const bddFileMeta = {
  "Driver calculates a route for a delivery": {"pickleLocation":"13:3","tags":["@logistics","@routing","@smoke","@mobile","@critical"],"ownTags":["@critical","@mobile","@smoke"]},
  "Route calculation completes within acceptable time": {"pickleLocation":"22:3","tags":["@logistics","@routing","@regression","@performance"],"ownTags":["@performance","@regression"]},
  "Route provides accurate distance metrics for fuel calculations": {"pickleLocation":"28:3","tags":["@logistics","@routing","@regression","@data-validation"],"ownTags":["@data-validation","@regression"]},
  "Driver attempts to calculate route with same start and end point": {"pickleLocation":"35:3","tags":["@logistics","@routing","@edge-case","@mobile"],"ownTags":["@mobile","@edge-case"]},
};