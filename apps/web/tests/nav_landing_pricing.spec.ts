import { test, expect } from "@playwright/test";

test.describe("PianoFlow AI — Milestone M.2: Global Navigation, Landing & Pricing Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept service worker and dev HMR traffic to avoid flaky timeouts
    await page.route("**/sw.js", (route) => route.abort());
    await page.route("**/workbox-*.js", (route) => route.abort());
  });

  test("Test 1: Navbar highlights active route dynamically as user navigates", async ({
    page,
  }) => {
    // 1. Visit Home Route
    await page.goto("/");
    const desktopNav = page.locator('nav[aria-label="Desktop navigation"]');
    await expect(desktopNav).toBeVisible();

    // Verify Home link is active
    const homeLink = page.getByTestId("nav-link-home");
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute("data-active", "true");
    await expect(homeLink).toHaveClass(/bg-white\/10/);

    // Non-active links
    const demoLink = page.getByTestId("nav-link-demo");
    const pricingLink = page.getByTestId("nav-link-pricing");
    await expect(demoLink).toHaveAttribute("data-active", "false");
    await expect(pricingLink).toHaveAttribute("data-active", "false");

    // Persistent streak badge in navbar
    const streakPill = page.getByTestId("navbar-streak-pill");
    await expect(streakPill).toBeVisible();
    await expect(streakPill).toContainText("🔥");
    await expect(streakPill).toContainText("d");
    await expect(streakPill).toHaveAttribute("href", "/projects");

    // CTA Button
    const ctaBtn = page.getByTestId("navbar-cta-button");
    await expect(ctaBtn).toBeVisible();
    await expect(ctaBtn).toHaveClass(/btn-tactile/);

    // 2. Navigate to Demo Route
    await page.goto("/demo");
    await expect(demoLink).toHaveAttribute("data-active", "true");
    await expect(demoLink).toHaveClass(/bg-white\/10/);
    await expect(homeLink).toHaveAttribute("data-active", "false");

    // 3. Navigate to Pricing Route
    await page.goto("/pricing");
    await expect(pricingLink).toHaveAttribute("data-active", "true");
    await expect(pricingLink).toHaveClass(/bg-white\/10/);
    await expect(demoLink).toHaveAttribute("data-active", "false");
  });

  test("Test 2: Landing page renders hero badges, primary CTA, and feature grid", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Hero Badge chip
    const heroBadge = page.getByText(
      "Next-Gen Piano Learning & Transcription"
    );
    await expect(heroBadge).toBeVisible();

    // 2. High-contrast headline
    const headline = page.getByRole("heading", {
      name: /Master Any Song on Piano with AI-Powered 60 FPS Visuals/i,
    });
    await expect(headline).toBeVisible();

    // 3. Subtitle
    const subtitle = page.getByText(
      /Transform any YouTube video, MP3 audio, or MIDI into interactive Synthesia-style tutorials/i
    );
    await expect(subtitle).toBeVisible();

    // 4. Primary action row
    const ctaStart = page.getByRole("link", {
      name: "Start Practicing Free",
    }).first();
    await expect(ctaStart).toBeVisible();
    await expect(ctaStart).toHaveAttribute("href", "/create");

    const ctaDemo = page.getByRole("link", {
      name: /Explore Classical Demo/i,
    }).first();
    await expect(ctaDemo).toBeVisible();
    await expect(ctaDemo).toHaveAttribute("href", "/demo");

    // 5. Interactive falling note teaser card linking to /demo
    const teaserCard = page.locator('a[href="/demo"]').filter({
      hasText: /Für Elise — Ludwig van Beethoven/i,
    });
    await expect(teaserCard).toBeVisible();
    await expect(
      teaserCard.getByText("60 FPS WebGL Engine")
    ).toBeVisible();

    // 6. Feature Grid cards
    await expect(
      page.getByRole("heading", {
        name: "Interactive Web MIDI Practice",
      })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Professional Vector Grand Staff Sheet Music",
      })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "AI Coaching & Rushing/Dragging Analytics",
      })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: "Audio-to-MIDI Transcription Engine",
      })
    ).toBeVisible();

    // 7. Telemetry Stats
    await expect(page.getByText("88.4%")).toBeVisible();
    await expect(page.getByText("60 FPS", { exact: true })).toBeVisible();
    await expect(page.getByText("<15ms")).toBeVisible();
  });

  test("Test 3: Pricing page toggles between Monthly and Annual pricing and updates prices", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // 1. Initial State (Monthly billing)
    const toggleMonthly = page.getByTestId("billing-toggle-monthly");
    const toggleAnnual = page.getByTestId("billing-toggle-annual");
    await expect(toggleMonthly).toBeVisible();
    await expect(toggleAnnual).toBeVisible();

    const priceFree = page.getByTestId("price-free");
    const pricePro = page.getByTestId("price-pro");
    const priceStudio = page.getByTestId("price-studio");

    await expect(priceFree).toHaveText("$0");
    await expect(pricePro).toHaveText("$12");
    await expect(priceStudio).toHaveText("$29");

    // 2. Toggle to Annual Billing
    await toggleAnnual.click();
    await expect(priceFree).toHaveText("$0");
    await expect(pricePro).toHaveText("$9.99");
    await expect(priceStudio).toHaveText("$24");

    // 3. Toggle back to Monthly Billing
    await toggleMonthly.click();
    await expect(pricePro).toHaveText("$12");
    await expect(priceStudio).toHaveText("$29");

    // 4. Comparison Matrix Table
    const matrixTable = page.getByTestId("comparison-matrix-table");
    await expect(matrixTable).toBeVisible();
    await expect(
      matrixTable.getByText("MIDI File Upload Size")
    ).toBeVisible();
    await expect(
      matrixTable.getByText("AI Audio & Video Transcription")
    ).toBeVisible();
    await expect(
      matrixTable.getByText("Interactive Web MIDI Practice")
    ).toBeVisible();

    // 5. FAQ Accordion interaction
    const faqContainer = page.getByTestId("faq-accordion");
    await expect(faqContainer).toBeVisible();

    const firstQuestionBtn = faqContainer.getByRole("button", {
      name: /Do I need a physical MIDI keyboard to use PianoFlow AI\?/i,
    });
    await expect(firstQuestionBtn).toBeVisible();

    // Click to expand FAQ
    await firstQuestionBtn.click();
    await expect(
      page.getByText(
        /No! You can practice using your standard computer keyboard/i
      )
    ).toBeVisible();

    // Click again to collapse
    await firstQuestionBtn.click();
    await expect(
      page.getByText(
        /No! You can practice using your standard computer keyboard/i
      )
    ).not.toBeVisible();
  });

  test("Test 4: Login page displays glassmorphic auth card and inputs", async ({
    page,
  }) => {
    await page.goto("/login");

    // 1. Glassmorphic Card Shell
    const authCard = page.getByTestId("auth-card");
    await expect(authCard).toBeVisible();
    await expect(authCard).toHaveClass(/backdrop-blur-xl/);

    // 2. Form Inputs
    const emailInput = page.getByTestId("input-email");
    const passwordInput = page.getByTestId("input-password");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // 3. Gradient Submit Button
    const submitBtn = page.getByTestId("auth-submit-btn");
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText("Sign In to Studio");
    await expect(submitBtn).toHaveClass(/bg-gradient-to-r/);

    // 4. Mode Toggle to Signup
    const signupTab = page.getByTestId("auth-tab-signup");
    await signupTab.click();
    await expect(submitBtn).toHaveText("Create Free Account");

    const loginTab = page.getByTestId("auth-tab-login");
    await loginTab.click();
    await expect(submitBtn).toHaveText("Sign In to Studio");

    // 5. Social Auth Buttons
    const googleBtn = page.getByTestId("oauth-google-btn");
    const githubBtn = page.getByTestId("oauth-github-btn");
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toContainText("Continue with Google");
    await expect(githubBtn).toBeVisible();
    await expect(githubBtn).toContainText("Continue with GitHub");

    // 6. Security Reassurance Footer
    await expect(
      page.getByText(/Protected by Supabase Auth with end-to-end encryption/i)
    ).toBeVisible();
  });
});
