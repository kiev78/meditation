from playwright.sync_api import sync_playwright, expect

def verify_install_dialog():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to the app (assuming it's running on localhost:4200)
        page.goto("http://localhost:4200")

        # Wait for app to load
        page.wait_for_load_state("networkidle")

        # Scroll to footer
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

        # Find the Install button (we added it to footer)
        # It has aria-label="Install App"
        install_btn = page.locator("button[aria-label='Install App']")
        expect(install_btn).to_be_visible()

        # Click it
        install_btn.click()

        # Verify Dialog appears
        dialog = page.locator("mat-dialog-container")
        expect(dialog).to_be_visible()
        expect(page.get_by_text("Install Meditation Timer")).to_be_visible()
        expect(page.get_by_text("Works offline")).to_be_visible()

        # Take screenshot of the dialog
        page.screenshot(path="/home/jules/verification/install_dialog.png")

        browser.close()

if __name__ == "__main__":
    verify_install_dialog()
