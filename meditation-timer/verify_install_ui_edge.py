from playwright.sync_api import sync_playwright, expect

def verify_install_dialog_edge():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mock User Agent to look like Edge
        edge_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
        context = browser.new_context(user_agent=edge_ua)
        page = context.new_page()

        # Navigate to the app (assuming it's running on localhost:4200)
        page.goto("http://localhost:4200")

        # Wait for app to load
        page.wait_for_load_state("networkidle")

        # Scroll to footer
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

        # Find the Install button (we added it to footer)
        install_btn = page.locator("button[aria-label='Install App']")
        expect(install_btn).to_be_visible()

        # Click it
        install_btn.click()

        # Verify Dialog appears
        dialog = page.locator("mat-dialog-container")
        expect(dialog).to_be_visible()

        # Check for Edge specific text
        # "Click the menu icon (…), go to Apps, and select Install Meditation Timer."
        expect(page.get_by_text("Click the menu icon (…), go to Apps, and select Install Meditation Timer.")).to_be_visible()

        # Take screenshot of the dialog
        page.screenshot(path="/home/jules/verification/install_dialog_edge.png")

        browser.close()

if __name__ == "__main__":
    verify_install_dialog_edge()
