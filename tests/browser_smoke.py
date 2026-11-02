"""Optional mobile/desktop smoke check. Run: python -m tests.browser_smoke.

Requires Playwright and its Chromium installation. All writes use the isolated
web integration fixture, never the catalog or image assets in this checkout.
"""
import json
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

from tests.test_web import WebIntegrationTests


def main():
    WebIntegrationTests.setUpClass()
    results = []
    errors = []
    output = Path(tempfile.mkdtemp(prefix="boardgame-browser-"))
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            for width in (390, 768, 1280):
                page = browser.new_page(viewport={"width": width, "height": 844})
                page.on("pageerror", lambda error: errors.append(str(error)))
                for route in ("/", "/images", "/master-list", "/contribute"):
                    page.goto(WebIntegrationTests.url + route)
                    page.wait_for_load_state("networkidle")
                    overflow = page.evaluate("document.documentElement.scrollWidth > innerWidth")
                    results.append({"width": width, "route": route, "horizontal_overflow": overflow})
                    page.screenshot(path=str(output / f"{width}-{route.strip('/') or 'games'}.png"), full_page=True)
                    if overflow:
                        print(page.evaluate("Array.from(document.querySelectorAll('body *')).filter(e => e.getBoundingClientRect().right > innerWidth).slice(0,15).map(e=>({tag:e.tagName,classes:e.className,width:e.getBoundingClientRect().width}))"))
                        print(f"Screenshots: {output}")
                    assert not overflow, f"Horizontal overflow at {width}px on {route}"
                page.goto(WebIntegrationTests.url)
                page.locator('.game-card-item').first.wait_for()
                # A shared text-search URL must remain text when rendered as a chip.
                from urllib.parse import urlencode
                attack = '<img src=x onerror="window.filterChipInjected=1">'
                page.goto(WebIntegrationTests.url + '/?' + urlencode({'q': attack}))
                page.wait_for_load_state('networkidle')
                assert page.locator('.filter-chip-value').inner_text() == attack
                assert page.evaluate('window.filterChipInjected') is None
                page.goto(WebIntegrationTests.url)
                page.locator('.game-card-item').first.wait_for()
                page.get_by_role('button', name='Share a laugh', exact=True).click()
                page.wait_for_function("document.querySelectorAll('.game-card-item').length === 1")
                assert 'Acquisitions' in page.locator('.game-card-item').inner_text()
                assert 'Humor' in page.url
                page.locator('.game-card-item').first.click()
                page.get_by_role('link', name='Suggest a correction').click()
                assert page.locator('#game-id').input_value()
                assert page.locator('#kind').input_value() == 'correction'
                page.locator('#message').fill('Please check this game’s player-count description.')
                page.get_by_role('button', name='Send for review').click()
                page.wait_for_function("document.getElementById('receipt').textContent.includes('Saved for review')")
                page.close()
            browser.close()
        assert not errors, errors
        print(json.dumps({"results": results, "page_errors": errors, "screenshots": str(output)}, indent=2))
    finally:
        WebIntegrationTests.tearDownClass()


if __name__ == '__main__':
    main()
