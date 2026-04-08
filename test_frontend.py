from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:5173')
        page.wait_for_selector('text=Доменный светофор')

        page.click('button[aria-label="Toggle theme"]')

        page.wait_for_timeout(1000)

        # Scroll down to mid page
        page.evaluate("window.scrollTo(0, document.body.scrollHeight / 3)")
        page.wait_for_timeout(1000)
        page.screenshot(path='test_white_theme.png', full_page=True)

        browser.close()

if __name__ == '__main__':
    run()
