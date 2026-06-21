import { expect, test } from "@playwright/test";

test("uses the default IndexedDB backend in a browser engine", async ({ browserName, page }) => {
  await page.goto(`/tests/browser/indexeddb.html?engine=${browserName}`);

  const result = page.locator("#result");

  await expect(result).toHaveAttribute("data-status", "ok");
  await expect(result).toContainText(browserName);
  await expect(result).toContainText('"backend":"indexeddb"');
  await expect(result).toContainText('"key":"ada"');
  await expect(result).toContainText('"tables":["users"]');
});
