import { test, expect } from "@playwright/test";

test.describe("Edit Campaign Metadata", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => {
      if (
        err.message.includes("ChunkLoadError") ||
        err.message.includes("Load failed") ||
        err.message.includes("access control checks")
      ) {
        return;
      }
      throw new Error(`Uncaught page error: ${err.message}`);
    });
    // Dismiss the onboarding tour so it doesn't intercept pointer events
    await page.addInitScript(() => {
      localStorage.setItem("onboarding_tour_dismissed", "1");
    });
    // Ensure we are in mock mode; wait for the locale redirect to settle
    await page.goto("/");

    // 1. Connect wallet
    const connectButton = page.getByRole("button", { name: /Connect Wallet/i }).first();
    await connectButton.click();
    await expect(page.getByText(/Connected/i).first()).toBeVisible();

    // 2. Create a new campaign (so we are the creator and can edit it)
    await page.goto("/en/causes/new");

    // Fill out the creation form
    await page.getByLabel(/Campaign Title/i).fill("My E2E Cause");
    await page.getByLabel(/Description/i).fill("Original description for this cause.");
    await page.getByLabel(/Funding Goal/i).fill("1000");
    await page.getByLabel(/Duration/i).fill("15");

    // Proceed to review
    await page.getByRole("button", { name: /Review Details/i }).click();
    await expect(page.getByText(/Review Your Cause/i)).toBeVisible();

    // Confirm and create
    await page.getByRole("button", { name: /Confirm & Create/i }).click();

    // Wait for creation success (redirects to the dashboard or shows success)
    await expect(
      page.getByText(/Cause created successfully|Submitted Campaigns/i).first(),
    ).toBeVisible({ timeout: 15000 });

    // 3. Navigate to dashboard to find our created campaign
    await page.goto("/en/dashboard");

    // Find the campaign link and click it
    const campaignLink = page.getByRole("link", { name: /My E2E Cause/i }).first();
    await expect(campaignLink).toBeVisible({ timeout: 10000 });
    await campaignLink.click();

    // Wait for Cause Detail page to load
    await expect(page.getByRole("button", { name: /Edit metadata/i })).toBeVisible({ timeout: 10000 });
  });

  test("should block invalid image URL", async ({ page }) => {
    const editButton = page.getByRole("button", { name: /Edit metadata/i });
    await editButton.click();

    // Scope to the edit metadata panel by going up to the parent container
    const editPanel = editButton.locator("..");

    // Assert an invalid image URL blocks submission with a visible error
    const coverImageInput = editPanel.getByLabel(/Cover Image URL/i);
    await coverImageInput.fill("http://invalid-url.com/image.png");

    const saveButton = editPanel.getByRole("button", { name: /Save/i });
    await saveButton.click();

    // Error should be visible
    await expect(
      page.getByText(/Image domain not allowed|Image URL must use HTTPS/i),
    ).toBeVisible();
  });

  test("should successfully edit description", async ({ page }) => {
    const editButton = page.getByRole("button", { name: /Edit metadata/i });
    await editButton.click();

    // Scope to the edit metadata panel by going up to the parent container
    const editPanel = editButton.locator("..");

    // Fix the image URL (if it was invalid) and update the description
    const coverImageInput = editPanel.getByLabel(/Cover Image URL/i);
    await coverImageInput.fill("https://images.unsplash.com/photo-1500000000000-000000000000");

    // Scope description field to the edit panel
    const metadataDescription = editPanel.getByLabel(/Description/i);
    await metadataDescription.fill("Updated description for this cause.");

    const saveButton = editPanel.getByRole("button", { name: /Save/i });
    await saveButton.click();

    // The edit panel error should go away, and updated description should appear on the cause detail page.
    await expect(page.getByText(/Updated description for this cause./i)).toBeVisible();
  });
});
