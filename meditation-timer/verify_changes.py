from playwright.sync_api import Page, expect, sync_playwright

def verify_video_call_and_background(page: Page):
    # 1. Arrange: Go to the app
    page.goto("http://localhost:4200")

    # Wait for app to load
    page.wait_for_timeout(3000)

    # 2. Check for Config Link (should be present by default from config.json)
    # The config.json has "https://meet.google.com/test-link-123"
    # We look for the video call icon button.
    # It's an anchor tag with mat-mini-fab class and aria-label "Join Video Call"
    video_btn = page.locator("a[aria-label='Join Video Call']")
    expect(video_btn).to_be_visible()
    expect(video_btn).to_have_attribute("href", "https://meet.google.com/test-link-123")

    # 3. Test Override: Open Settings Panel
    # Click 'Meditation Options' expansion panel header
    # It might be collapsed.
    options_panel = page.get_by_text("Meditation Options")
    options_panel.click()

    # Wait for expansion
    page.wait_for_timeout(1000)

    # 4. Enter new video call link
    # Label "Video Call Link"
    video_input = page.get_by_label("Video Call Link")
    video_input.fill("https://zoom.us/my-override")

    # Wait for debounce/state update
    page.wait_for_timeout(1000)

    # Verify footer link updated
    expect(video_btn).to_have_attribute("href", "https://zoom.us/my-override")

    # 5. Test Background Image Override
    # Label "Background Image URL"
    # Use a dummy placeholder image
    bg_input = page.get_by_label("Background Image URL")
    bg_url = "https://via.placeholder.com/1920x1080.png?text=Background"
    bg_input.fill(bg_url)

    page.wait_for_timeout(1000)

    # Verify background style on .timer-page
    timer_page = page.locator(".timer-page")
    expect(timer_page).to_have_css("background-image", f'url("{bg_url}")')

    # 6. Test Disable Link
    video_input.fill("") # Empty string
    page.wait_for_timeout(1000)

    # Should disappear (because override is empty string which means disabled)
    expect(video_btn).not_to_be_visible()

    # 7. Screenshot
    # Restore link for screenshot
    video_input.fill("https://zoom.us/final-check")
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_video_call_and_background(page)
        finally:
            browser.close()
