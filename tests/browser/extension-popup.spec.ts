import { expect, test } from "@playwright/test";

const targets = ["chrome", "firefox", "safari"];

for (const target of targets) {
  test(`built ${target} popup stores and reads records`, async ({ browserName, page }) => {
    await page.goto(`/examples/extensions/dist/${target}/popup.html`);

    await expect(page.getByRole("heading", { name: "WebExtension DB" })).toBeVisible();

    await page.locator("#databaseName").fill(`popup-${target}-${browserName}`);
    await page.locator("#backend").selectOption("indexeddb");
    await page.locator("#storageArea").selectOption("default");
    await page.locator("#tableName").fill("settings");
    await page.locator("#recordKey").fill("theme");
    await page.locator("#recordValue").fill('{"mode":"light","sync":false}');

    await page.locator("#writeRecord").click();

    await expect(page.locator("#status")).toHaveText("Written");
    await expect(page.locator("#activeBackend")).toHaveText("indexeddb / readwrite");

    await page.locator("#readRecord").click();

    await expect(page.locator("#status")).toHaveText("Read");
    await expect(page.locator("#result")).toContainText('"mode": "light"');

    await page.locator("#queryFilter").fill('{"mode":"light"}');
    await page.locator("#countRecords").click();

    await expect(page.locator("#status")).toHaveText("Counted");
    await expect(page.locator("#result")).toContainText('"count": 1');

    await page.locator("#destroyDatabase").click();

    await expect(page.locator("#status")).toHaveText("Destroyed");
  });
}
