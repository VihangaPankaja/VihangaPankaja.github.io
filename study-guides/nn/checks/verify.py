"""Run with Python and Playwright installed: python study-guides/nn/checks/verify.py.

Install the browser once with: python -m playwright install chromium.
Uses local files, so no server or access to the original lecture folder is needed.
"""
from pathlib import Path
import json
import re

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def check():
    cache = json.loads((ROOT / "pages-data.js").read_text(encoding="utf-8")
                       .removeprefix("window.NN_PAGES=").rstrip(";\n"))
    for file in ROOT.glob("*.html"):
        content = re.search(r"<main\b[^>]*>(.*?)</main>",
                            file.read_text(encoding="utf-8"), re.S).group(1)
        normalize = lambda value: re.sub(r">\s+<", "><", value)
        assert normalize(content) == normalize(cache[file.stem]["content"]), file.name

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 900})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))

        def visit(slug):
            page.goto((ROOT / (slug + ".html")).as_uri())
            page.evaluate("document.fonts.ready")

        def set_value(selector, value):
            page.locator(selector).evaluate("""(element, value) => {
                element.value = value;
                element.dispatchEvent(new Event('input', {bubbles: true}));
            }""", value)

        visit("foundations")
        assert "-2.5 → output 0" in page.locator("[data-result=neuron]").inner_text()
        set_value("#neuron-bias", "3.5")
        assert "0 → output 1" in page.locator("[data-result=neuron]").inner_text()

        visit("pnn")
        assert "0.6065" in page.locator("[data-result=kernel]").inner_text()
        set_value("#kernel-sigma", "2")
        assert "0.8825" in page.locator("[data-result=kernel]").inner_text()

        visit("membership")
        assert page.locator("[data-result=cut]").inner_text() == "Weak cut = {3, 4}"
        page.select_option("#cut-kind", "strong")
        assert page.locator("[data-result=cut]").inner_text() == "Strong cut = {4}"
        set_value("#cut-level", "0")
        assert page.locator("[data-result=cut]").inner_text() == "Strong cut = {2, 3, 4}"
        page.select_option("#cut-kind", "weak")
        assert page.locator("[data-result=cut]").inner_text() == "Weak cut = {1, 2, 3, 4}"

        visit("fuzzy-relations")
        for method, answers in [("min", [0.7, 0.6, 0.8, 0.6]),
                                ("product", [0.63, 0.42, 0.72, 0.48])]:
            page.select_option("#relation-method", method)
            for cell, answer in zip(["0,0", "0,1", "1,0", "1,1"], answers):
                page.select_option("#relation-cell", cell)
                assert page.locator("[data-result=relation]").inner_text().endswith("= " + str(answer))

        visit("logic-language")
        set_value("#hedge-grade", "0.8")
        assert [row.locator("td").last.inner_text() for row in
                page.locator("[data-result=hedge] tr").all()] == ["0.8", "0.64", "0.8944", "0.4096"]

        for file in ROOT.glob("*.html"):
            visit(file.stem)
            page.locator("details").evaluate_all("items => items.forEach(item => item.open = true)")
            for walk in page.locator(".walk").all():
                steps = walk.locator(":scope > .step").count()
                walk.locator("[data-action=all]").click()
                assert walk.locator(".step:visible").count() == steps
                assert walk.locator(".step[aria-hidden=true]").count() == 0
                walk.locator("[data-action=all]").click()
                assert walk.locator(".step:visible").count() == 1
                walk.locator("[data-action=next]").click()
                assert walk.locator("output").inner_text() == f"Step 2 of {steps}"
                walk.locator("[data-action=reset]").click()
                assert walk.locator("output").inner_text() == f"Step 1 of {steps}"
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), file.name

        visit("index")
        page.get_by_role("link", name="What does one neuron actually calculate?", exact=True).click()
        assert page.locator("[data-result=neuron]").count() == 1
        page.go_back()
        page.get_by_role("link", name="How do we go between numbers and fuzzy sets?", exact=True).click()
        assert page.locator("[data-result=cut]").inner_text() == "Weak cut = {3, 4}"
        assert not errors, errors
        browser.close()
    print("PASS: offline cache, five experiments, training controls and topic navigation")


if __name__ == "__main__":
    check()
