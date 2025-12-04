from playwright.sync_api import Page, expect, sync_playwright

def verify_timer_and_settings(page: Page):
    # 1. Navigate to the app
    page.goto("http://localhost:4200")

    # Wait for the app to load
    expect(page.get_by_text("Timer Setup")).to_be_visible()

    # 2. Verify Timer Setup Controls (Duration, Delay, Intervals)
    # Check that duration slider exists (mat-slider)
    expect(page.locator("app-timer-setup mat-slider").first).to_be_visible()

    # Screenshot Timer Setup
    page.screenshot(path="/home/jules/verification/1_timer_setup.png")

    # 3. Navigate to Settings
    # Assuming there's a link or button to settings.
    # Based on previous exploration, it might be in the header or via URL.
    page.goto("http://localhost:4200/settings")

    # 4. Verify Settings Page content
    expect(page.get_by_text("Bell Configuration")).to_be_visible()

    # Verify Start Bells Slider exists
    expect(page.get_by_text("Start Bells").first).to_be_visible()
    expect(page.locator("app-settings mat-slider").first).to_be_visible()

    # Screenshot Settings Page
    page.screenshot(path="/home/jules/verification/2_settings_page.png")

    # 5. Change a setting and verify persistence/state
    # (Optional, but good for robust check if time permits)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_timer_and_settings(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
