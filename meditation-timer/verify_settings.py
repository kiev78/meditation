from playwright.sync_api import Page, expect, sync_playwright

def verify_settings_page(page: Page):
    # Navigate directly to settings
    page.goto("http://localhost:4200/settings")

    # Wait a bit or wait for a specific element that definitely exists
    # "Settings" h2 header
    expect(page.get_by_role("heading", name="Settings")).to_be_visible()

    # Take a screenshot to see what's there
    page.screenshot(path="/home/jules/verification/2_settings_debug.png")

    # Now try to find the Bell Configuration section
    # Using a more generic locator if text fails
    expect(page.get_by_text("Bell Configuration")).to_be_visible()

    # Verify sliders
    expect(page.get_by_text("Start Bells")).to_be_visible()
    expect(page.locator("app-settings mat-slider").first).to_be_visible()

    page.screenshot(path="/home/jules/verification/3_settings_verified.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_settings_page(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/settings_error.png")
        finally:
            browser.close()
