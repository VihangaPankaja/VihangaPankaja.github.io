"""Independent numerical and browser checks for the concise NNFL revision pass."""
from pathlib import Path
import math
import re
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class RevisionChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.page = self.browser.new_page(viewport={"width": 390, "height": 900})

    def tearDown(self):
        self.page.close()

    def visit(self, slug, explorer):
        self.page.goto((ROOT / (slug + ".html")).as_uri())
        self.assertEqual(self.page.locator(f'[data-explorer="{explorer}"]').count(), 1)
        self.page.evaluate("document.fonts.ready")

    def value(self, field, value):
        self.page.locator(f'#{field}').evaluate("""(element, value) => {
            element.value = value;
            element.dispatchEvent(new Event('input', {bubbles:true}));
        }""", str(value))

    def metric(self, name):
        return float(self.page.locator(f'[data-metric="{name}"]').get_attribute("data-number"))

    def test_binary_boundary_including_zero_weights(self):
        self.visit("perceptron", "boundary")
        self.assertEqual(self.metric("boundary-correct"), 4)
        self.page.select_option("#boundary-target", "xor")
        self.value("boundary-bias", -0.5)
        self.assertEqual(self.metric("boundary-correct"), 3)
        self.value("boundary-w2", 0)
        self.assertEqual(self.page.locator('[data-line="boundary"]').get_attribute('d'), 'M170,24V276')
        self.value("boundary-w1", 0)
        self.value("boundary-w2", 0)
        self.value("boundary-bias", 0)
        self.assertEqual(self.metric("boundary-correct"), 2)
        self.assertIn("all outputs are 1", self.page.locator('[data-result="boundary"]').inner_text())
        self.assertNotIn("NaN", self.page.locator('[data-explorer="boundary"]').inner_text())

    def test_adaline_uses_linear_error_even_when_class_is_correct(self):
        self.visit("adaptive-linear", "adaline")
        self.assertAlmostEqual(self.metric("adaline-error"), 0.7)
        self.assertAlmostEqual(self.metric("adaline-loss"), 0.245)
        self.assertAlmostEqual(self.metric("adaline-next"), 0.44)
        self.assertIn("class is correct", self.page.locator('[data-result="adaline"]').inner_text())
        self.value("adaline-rate", 1.2)
        self.assertGreater(self.metric("adaline-next-loss"), self.metric("adaline-loss"))
        self.value("adaline-rate", 0)
        self.assertAlmostEqual(self.metric("adaline-next"), 0.3)
        self.value("adaline-weight", 1)
        self.assertEqual(self.metric("adaline-error"), 0)
        self.assertEqual(self.metric("adaline-next-loss"), 0)

    def test_backprop_gradients_against_independent_finite_differences(self):
        self.visit("backpropagation", "gradient")
        for v, w, target in [(0.2, 0.4, 1), (-1, 1.5, 0), (0.5, 0, 1)]:
            self.value("gradient-v", v)
            self.value("gradient-w", w)
            self.page.select_option("#gradient-target", str(target))
            parameters = [v, 0.0, w, 0.0]

            def loss(values):
                hidden = 1 / (1 + math.exp(-(values[0] + values[1])))
                output = 1 / (1 + math.exp(-(values[2] * hidden + values[3])))
                return (target - output) ** 2 / 2

            for index, name in enumerate(["v", "bh", "w", "bo"]):
                plus = parameters.copy()
                minus = parameters.copy()
                plus[index] += 1e-5
                minus[index] -= 1e-5
                numerical = (loss(plus) - loss(minus)) / 2e-5
                self.assertAlmostEqual(self.metric("gradient-" + name), numerical, places=6)
            self.assertLessEqual(self.metric("gradient-next-loss"), loss(parameters) + 1e-12)

    def test_asymmetric_clipping_scaling_matches_numerical_integration(self):
        self.visit("fuzzy-systems", "clipping")
        for alpha in [0.1, 0.4, 1.0]:
            self.value("clip-alpha", alpha)
            # Midpoint quadrature independently checks both area and first moment.
            count = 10000
            for mode in ["clip", "scale"]:
                area = moment = 0.0
                for i in range(count):
                    x = (i + 0.5) * 10 / count
                    grade = x / 3 if x <= 3 else (10 - x) / 7
                    grade = min(alpha, grade) if mode == "clip" else alpha * grade
                    area += grade * 10 / count
                    moment += x * grade * 10 / count
                self.assertAlmostEqual(self.metric(mode + "-area"), area, places=5)
                self.assertAlmostEqual(self.metric(mode + "-centroid"), moment / area, places=5)
        self.value("clip-alpha", 0)
        self.assertIn("undefined", self.page.locator('[data-result="clipping"]').inner_text())

    def test_tsk_operator_presets_and_no_rule_firing(self):
        self.visit("fuzzy-systems", "tsk")
        self.assertAlmostEqual(self.metric("tsk-result"), 24)
        self.page.locator('[data-preset="product"]').click()
        self.assertAlmostEqual(self.metric("tsk-result"), (0.48 * 20 + 0.2 * 30) / 0.68)
        self.value("tsk-first", 0)
        self.value("tsk-second", 1)
        self.assertEqual(self.metric("tsk-result"), 30)
        self.value("tsk-second", 0)
        self.assertIn("undefined", self.page.locator('[data-result="tsk"]').inner_text())

    def test_both_short_notes_end_their_streams_and_work_offline(self):
        self.page.goto((ROOT / "index.html").as_uri())
        for slug in ["neural-revision", "fuzzy-revision"]:
            link = self.page.locator(f'#sidebar a[href="{slug}.html"]')
            self.assertEqual(link.count(), 1)
            link.evaluate("element => element.click()")
            self.assertIn("Short note", self.page.locator("h1").inner_text())
            self.assertLess(len(self.page.locator("article").inner_text().split()), 650)
            self.assertGreaterEqual(self.page.locator("article details").count(), 3)
        self.page.go_back()
        self.assertIn("Neural networks", self.page.locator("h1").inner_text())
        self.page.goto((ROOT / "fuzzy-sets.html").as_uri())
        previous = self.page.locator('.pager a').first
        self.assertEqual(previous.get_attribute('href'), 'neural-revision.html')
        self.assertNotIn('Probabilistic', previous.inner_text())

    def test_published_numerical_corrections(self):
        self.page.goto((ROOT / "training-variants.html").as_uri())
        self.assertEqual(self.page.get_by_text('This local factor explains', exact=False).count(), 0)
        self.assertEqual(self.page.locator('[data-check="momentum-counterfactual"]').count(), 1)
        weight = bias = 0.0
        changes = []
        for _ in range(3):
            change = 0.1 * (2 - weight - bias)
            changes.append(change)
            weight += change
            bias += change
        text = self.page.locator('[data-check="momentum-counterfactual"]').text_content()
        self.assertIn(str(round(changes[-1], 3)), text)
        self.assertIn(str(round(weight, 3)), text)
        self.assertAlmostEqual(float(self.page.locator('[data-check="depth-loss"]').get_attribute('data-initial-loss')), (1 - 0.04) ** 2 / 2)
        content = (ROOT / "training-variants.html").read_text(encoding="utf-8")
        self.assertIsNone(re.search(r'<msup>\s*<mi>e</mi>\s*<mo[^>]*>\(', content))

    def test_fuzzy_mom_and_implication_semantics(self):
        self.page.goto((ROOT / "membership.html").as_uri())
        self.assertEqual(self.page.get_by_text('Do not report MOM as unique', exact=False).count(), 0)
        self.assertEqual(self.page.locator('[data-check="mom-result"]').count(), 1)
        # The isolated maximizer at 6 has zero measure; continuous MOM is the plateau mean.
        self.assertEqual(float(self.page.locator('[data-check="mom-result"]').get_attribute('data-number')), (2 + 4) / 2)
        self.page.goto((ROOT / "logic-language.html").as_uri())
        statement = self.page.locator('[data-check="zadeh-meaning"]').text_content()
        self.assertIn('(A AND B) OR NOT A', statement)
        self.assertIn('0.5', statement)

    def test_implications_differ_on_partial_grades_but_global_forms_match_crisp_logic(self):
        self.visit("logic-language", "implication")
        self.assertEqual(self.metric("implication-dienes"), 1)
        self.assertEqual(self.metric("implication-zadeh"), 0.5)
        for a, b in [(0, 0), (0, 1), (1, 0), (1, 1)]:
            self.value("implication-a", a)
            self.value("implication-b", b)
            expected = int(not a or b)
            for name in ["dienes", "zadeh", "lukasiewicz", "godel"]:
                self.assertEqual(self.metric("implication-" + name), expected)
            self.assertEqual(self.metric("implication-min"), min(a, b))


if __name__ == "__main__":
    unittest.main(verbosity=2)
