"""Check the teaching arithmetic and real offline study interactions independently."""
from pathlib import Path
import math
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class WorkbookChecks(unittest.TestCase):
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
        self.page.goto((ROOT / "workbook.html").as_uri())

    def tearDown(self):
        self.page.close()

    def section_has(self, slug, *values):
        text = self.page.locator(f"#{slug}").text_content()
        for value in values:
            self.assertIn(str(value), text, slug)

    def test_neuron_and_perceptron_arithmetic(self):
        net = sum(x * w for x, w in zip([2, -1], [.4, .6])) + .1
        self.assertAlmostEqual(net, .3)
        self.section_has("neuron", f"{1 / (1 + math.exp(-net)):.6f}", "0.425557")
        weights, bias = [-.2, .1], 0
        for inputs, target in [([1, 1], 1), ([1, 0], 0)]:
            prediction = int(sum(x * w for x, w in zip(inputs, weights)) + bias >= 0)
            error = target - prediction
            weights = [w + .5 * error * x for w, x in zip(weights, inputs)]
            bias += .5 * error
        self.assertAlmostEqual(weights[0], -.2)
        self.assertAlmostEqual(weights[1], .6)
        self.assertEqual(bias, 0)
        self.section_has("perceptron", "1.4", "(−0.2, 0.6)")

    def test_adaline_and_lms_keep_their_loss_conventions(self):
        x, weights, bias = [1, 2], [.1, .1], 0
        error = 1 - sum(a * b for a, b in zip(x, weights))
        weights = [w + .1 * error * a for w, a in zip(weights, x)]
        bias += .1 * error
        response = sum(a * b for a, b in zip(x, weights)) + bias
        self.assertAlmostEqual(response, .72)
        self.assertAlmostEqual((1 - response) ** 2 / 2, .0392)
        self.section_has("adaline", "0.0392", "−0.48", "0.1352")
        weight = bias = 0
        for x, target in [(-1, -1), (1, 1)]:
            error = target - weight * x - bias
            weight += 2 * .1 * error * x
            bias += 2 * .1 * error
        self.assertAlmostEqual(weight, .4)
        self.assertAlmostEqual(bias, 0)
        self.assertAlmostEqual((1 - weight) ** 2 + bias ** 2, .36)
        self.section_has("lms", "0.36", "(0.2, 0)", "(−4, 0)")

    def test_two_output_gradient_against_finite_differences(self):
        solution = self.page.locator("#backprop details.solution")
        solution.evaluate("element => element.open = true")
        sigmoid = lambda a: 1 / (1 + math.exp(-a))
        for weight, target in [(-.3, 0), (.8, 0), (-2, 1), (0, 1)]:
            self.page.locator("#branches-weight").evaluate("""(element, value) => {
                element.value = value;
                element.dispatchEvent(new Event('input', {bubbles:true}));
            }""", str(weight))
            self.page.select_option("#branches-target", str(target))

            def loss(v):
                z = sigmoid(v)
                return ((1 - sigmoid(.4 * z)) ** 2 +
                        (target - sigmoid(weight * z)) ** 2) / 2

            numerical = (loss(.2 + 1e-5) - loss(.2 - 1e-5)) / 2e-5
            hidden = float(self.page.locator('[data-metric="branches-hidden"]').get_attribute("data-number"))
            self.assertAlmostEqual(hidden, -numerical, places=8)
            if weight == .8 and target == 0:
                self.assertLess(hidden, 0, "Second output must be able to reverse the hidden correction")
        z = sigmoid(.2)
        y1, y2 = sigmoid(.4 * z), sigmoid(-.3 * z)
        d1, d2 = (1 - y1) * y1 * (1 - y1), -y2 * y2 * (1 - y2)
        dh = z * (1 - z) * (.4 * d1 - .3 * d2)
        zn = sigmoid(.2 + dh)  # v and hidden bias each receive 0.5 * dh.
        outputs = [sigmoid((w + .5 * d * z) * zn + .5 * d) for w, d in [(.4, d1), (-.3, d2)]]
        after = ((1 - outputs[0]) ** 2 + outputs[1] ** 2) / 2
        self.section_has("backprop", f"{dh:.6f}", f"{after:.6f}", "0.1925")

    def test_momentum_and_pnn_decisions(self):
        w, change = 0, .1
        for gradient in [-.4, .2]:
            change = -.2 * gradient + .5 * change
            w += change
        self.assertAlmostEqual(w, .155)
        self.section_has("momentum", "0.155", "0.48", "−0.14")
        normalizer = 1 / math.sqrt(2 * math.pi)
        density = lambda values: sum(normalizer * math.exp(-v * v / 2) for v in values) / len(values)
        a, b = density([-1, 1]), density([0, 3])
        self.assertGreater(a, b)
        self.assertLess(.3 * a, .7 * b)
        self.section_has("pnn", f"{a:.6f}", f"{b:.6f}", f"{.7 * b:.6f}")

    def test_fuzzy_sets_relations_and_implications(self):
        a, b = [.2, .7, 1], [.6, .4, .5]
        self.assertEqual([max(x, y) for x, y in zip(a, b)], [.6, .7, 1])
        self.assertEqual([min(x, y) for x, y in zip(a, b)], [.2, .4, .5])
        self.section_has("sets", "(0.04, 0.49, 1)", "{u₂, u₃}", "{u₃}")
        r, s = [[.2, .8], [.6, .4]], [[.9, .3], [.5, .7]]
        result = [[max(min(r[i][k], s[k][j]) for k in range(2)) for j in range(2)] for i in range(2)]
        self.assertEqual(result, [[.5, .7], [.6, .4]])
        self.section_has("relations", "T₁₁ = 0.4", "T₂₂ = 0.28")
        self.assertAlmostEqual(max(1 - .4, .8), .8)
        self.assertAlmostEqual(max(min(.4, .8), 1 - .4), .6)
        self.section_has("logic", "0.8", "0.6", "0.3", "0.2")

    def test_continuous_centroid_by_independent_quadrature(self):
        count, area, moment = 60000, 0.0, 0.0
        for i in range(count):
            x = (i + .5) * 6 / count
            grade = x / 2 if x <= 2 else (6 - x) / 4
            area += grade * 6 / count
            moment += x * grade * 6 / count
        self.assertAlmostEqual(area, 3, places=7)
        self.assertAlmostEqual(moment, 8, places=7)
        self.assertAlmostEqual(moment / area, 8 / 3, places=7)
        self.section_has("membership", "2.666667", "[1, 4]", "(1, 4)")

    def test_rule_outputs_and_zero_firing(self):
        strengths, outputs = [.6, .3], [5, 8]
        result = sum(a * f for a, f in zip(strengths, outputs)) / sum(strengths)
        self.assertAlmostEqual(result, 6)
        tsukamoto = (.6 * 6 + .3 * 14) / .9
        self.assertAlmostEqual(tsukamoto, 26 / 3)
        product = (.48 * 5 + .15 * 8) / (.48 + .15)
        self.assertAlmostEqual(product, 40 / 7)
        self.section_has("systems", "8.666667", "5.714286", "undefined")

    def test_workbook_routes_and_reference_anchors_work_offline(self):
        self.assertEqual(self.page.locator(".workbook-problem").count(), 12)
        self.assertEqual(self.page.locator(".practice-answer").count(), 12)
        solution = self.page.locator("#neuron details.solution")
        solution.evaluate("element => element.open = true")
        solution.locator('[data-action="all"]').click()
        self.assertEqual(solution.locator('output').inner_text(), "All 3 steps")
        solution.locator('[data-action="all"]').click()
        self.assertEqual(solution.locator('output').inner_text(), "Step 1 of 3")
        self.page.locator('#sidebar a[href="lms.html"]').evaluate("element => element.click()")
        reference = self.page.locator("details.study-reference").first
        self.assertFalse(reference.evaluate("element => element.open"))
        self.page.locator('details.contents').evaluate("element => element.open = true")
        self.page.locator('nav.on-page a[href="#section-3"]').click()
        self.assertTrue(self.page.locator("details.study-reference").first.evaluate("element => element.open"))
        self.page.locator('.study-actions a[href="workbook.html#lms"]').click()
        self.assertIn("Calculation workbook", self.page.locator("h1").inner_text())
        self.assertTrue(self.page.locator("#lms").is_visible())
        self.page.go_back()
        self.assertIn("Widrow-Hoff", self.page.locator("h1").inner_text())


if __name__ == "__main__":
    unittest.main(verbosity=2)
