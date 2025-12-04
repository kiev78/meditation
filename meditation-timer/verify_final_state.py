from playwright.sync_api import Page, expect, sync_playwright

def verify_final_state(page: Page):
    print("Verifying Timer Page...")
    # 1. Check Timer Page
    page.goto("http://localhost:4200/")

    # Verify Timer Setup is back with Duration/Delay/Intervals
    expect(page.get_by_text("Timer Setup")).to_be_visible()
    expect(page.get_by_text("Duration (min)")).to_be_visible()
    expect(page.get_by_text("Delay (sec)")).to_be_visible()
    expect(page.get_by_text("Interval Bells (min)")).to_be_visible()

    # Verify Start/End Bells are NOT on Timer Page
    expect(page.get_by_text("Start Bells")).not_to_be_visible()
    expect(page.get_by_text("End Bells")).not_to_be_visible()

    page.screenshot(path="/home/jules/verification/final_timer_page.png")
    print("Timer Page Verified.")

    print("Verifying Settings Page...")
    # 2. Check Settings Page
    page.goto("http://localhost:4200/settings")

    # Verify Bell Configuration and Background Image
    expect(page.get_by_text("Bell Configuration")).to_be_visible()
    expect(page.get_by_text("Start Bells")).to_be_visible()
    expect(page.get_by_text("End Bells")).to_be_visible()
    expect(page.get_by_text("Background Image")).to_be_visible()

    # Verify Timer Setup fields are NOT on Settings Page
    expect(page.get_by_text("Duration (min)")).not_to_be_visible()
    expect(page.get_by_text("Delay (sec)")).not_to_be_visible()

    page.screenshot(path="/home/jules/verification/final_settings_page.png")
    print("Settings Page Verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_final_state(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/final_verification_error.png")
        finally:
            browser.close()
