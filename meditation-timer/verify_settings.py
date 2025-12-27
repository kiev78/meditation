from playwright.sync_api import Page, expect, sync_playwright

def verify_settings_changes(page: Page):
    # 1. Arrange: Go to the app
    page.goto("http://localhost:4200")

    # Wait for app to load
    page.wait_for_timeout(3000)

    # 2. Go to Settings
    # Click 'Meditation Options' expansion panel header to expand it
    # Then find the Settings button inside it.
    # Wait, the settings button is inside the expansion panel in TimerSetupComponent.
    options_panel = page.get_by_text("Meditation Options")
    options_panel.click()
    page.wait_for_timeout(500)

    # Click Settings icon button (tooltip 'Settings (s)')
    settings_btn = page.locator("button[matTooltip='Settings (s)']")
    settings_btn.click()

    # Wait for navigation to /settings
    page.wait_for_url("**/settings")
    page.wait_for_timeout(1000)

    # 3. Verify New Inputs
    # Check for "Video Call Link" input
    video_input = page.get_by_label("Video Call Link")
    expect(video_input).to_be_visible()

    # Check for "Background Image" section
    # Just verify "Image URL" input exists if "URL" mode is selected (default)
    bg_input = page.get_by_label("Image URL")
    expect(bg_input).to_be_visible()

    # 4. Test Override
    video_input.fill("https://zoom.us/settings-override")
    save_btn = page.locator("button", has_text="Save Link")
    save_btn.click()

    # Wait a bit
    page.wait_for_timeout(500)

    # 5. Screenshot of Settings
    page.screenshot(path="verification/verification_settings.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_settings_changes(page)
        finally:
            browser.close()
