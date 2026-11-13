"""Run with Python and Playwright: python study-guides/ob/checks/test_activities.py."""
from pathlib import Path
import json
import unittest
from urllib.parse import urlparse, unquote
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SLUGS = {
    'attitudes': 'lecture-2-work-attitudes-and-job-satisfaction',
    'personality': 'lecture-3-personality-at-work',
    'values': 'lecture-3-values-culture-and-person-environment-fit',
    'emotions': 'lecture-4-emotions-and-moods',
    'perception': 'lecture-6-perception-and-individual-decision-making',
    'structure': 'lecture-7-group-structure-and-behaviour',
    'decisions': 'lecture-7-group-decision-making',
    'teams': 'lecture-8-work-teams-and-effectiveness',
}


class ActivityChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime = sync_playwright().start()
        cls.browser = cls.runtime.chromium.launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()

    def setUp(self):
        self.page = self.browser.new_page(viewport={'width': 390, 'height': 900})

    def tearDown(self):
        self.page.close()

    def visit(self, topic, activity):
        self.page.goto((ROOT / (SLUGS[topic] + '.html')).as_uri())
        region = self.page.locator(f'[data-activity="{activity}"]')
        self.assertEqual(region.count(), 1)
        self.page.evaluate('document.fonts.ready')
        return region

    def answer(self, region, case, answer):
        region.locator('[data-case]').select_option(case)
        region.locator(f'[data-answer="{answer}"]').click()
        self.assertEqual(region.locator('[data-feedback]').get_attribute('data-correct'), 'true')

    def test_attitude_components_and_observed_action(self):
        region = self.visit('attitudes', 'components')
        for case, answer in [('belief', 'cognition'), ('feeling', 'affect'), ('plan', 'intention'), ('action', 'behaviour')]:
            self.answer(region, case, answer)
        region.locator('[data-case]').select_option('belief')
        self.assertEqual(region.locator('[data-feedback]').inner_text(), '')
        region.locator('[data-answer="affect"]').click()
        self.assertEqual(region.locator('[data-feedback]').get_attribute('data-correct'), 'false')
        self.assertIn('Cognition', region.locator('[data-feedback]').inner_text())

    def test_all_four_evln_cells(self):
        region = self.visit('attitudes', 'evln')
        for action, direction, expected in [('active', 'constructive', 'Voice'), ('active', 'destructive', 'Exit'),
                                            ('passive', 'constructive', 'Loyalty'), ('passive', 'destructive', 'Neglect')]:
            region.locator('[data-input="action"]').select_option(action)
            region.locator('[data-input="direction"]').select_option(direction)
            self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), expected)
            self.assertEqual(region.locator('[aria-current="true"]').count(), 1)

    def test_personality_evidence_is_not_a_diagnosis(self):
        region = self.visit('personality', 'person-situation')
        for case, answer in [('rules', 'strength'), ('cue', 'activation'), ('single', 'insufficient'), ('pattern', 'trait')]:
            self.answer(region, case, answer)

    def test_fit_has_two_different_targets(self):
        region = self.visit('values', 'fit')
        self.answer(region, 'tasks', 'job')
        self.answer(region, 'culture', 'organization')
        self.answer(region, 'both', 'separate')

    def test_emotional_labour_names_the_strategy_or_mismatch(self):
        region = self.visit('emotions', 'emotional-labour')
        for case, answer in [('display', 'surface'), ('reframe', 'deep'), ('mismatch', 'dissonance')]:
            self.answer(region, case, answer)

    def test_attribution_requires_separate_evidence_for_each_cue(self):
        region = self.visit('perception', 'attribution')
        self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), 'Insufficient evidence')
        for name, value in [('consensus', 'low'), ('distinctiveness', 'low'), ('consistency', 'high')]:
            region.locator(f'[data-input="{name}"]').select_option(value)
        self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), 'Internal attribution suggested')
        for name in ['consensus', 'distinctiveness']:
            region.locator(f'[data-input="{name}"]').select_option('high')
        self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), 'External attribution suggested')
        region.locator('[data-input="consistency"]').select_option('low')
        self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), 'Check temporary circumstances')
        region.locator('[data-input="distinctiveness"]').select_option('unknown')
        self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), 'Insufficient evidence')
        region.locator('[data-input="distinctiveness"]').select_option('low')
        region.locator('[data-input="consistency"]').select_option('high')
        self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), 'Mixed evidence')

    def test_cohesion_does_not_always_mean_high_productivity(self):
        region = self.visit('structure', 'cohesion')
        for norms, cohesion, expected in [('high', 'high', 'High productivity'), ('low', 'high', 'Low productivity'),
                                         ('high', 'low', 'Productivity rises, but less'), ('low', 'low', 'Low-to-moderate productivity')]:
            region.locator('[data-input="norms"]').select_option(norms)
            region.locator('[data-input="cohesion"]').select_option(cohesion)
            self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), expected)

    def test_decision_techniques_keep_their_defining_processes(self):
        region = self.visit('decisions', 'techniques')
        for case, answer in [('free', 'brainstorming'), ('silent', 'ngt'), ('discussion', 'interacting')]:
            self.answer(region, case, answer)

    def test_team_check_is_a_conditional_guide_not_a_score(self):
        region = self.visit('teams', 'team-check')
        self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), 'Consider a team')
        for name in ['better', 'purpose', 'interdependence']:
            region.locator(f'[data-input="{name}"]').select_option('no')
            self.assertEqual(region.locator('[data-result]').get_attribute('data-label'), 'Reconsider the team design')
            region.locator(f'[data-input="{name}"]').select_option('yes')
        self.assertNotIn('%', region.locator('[data-result]').inner_text())

    def test_offline_cache_metadata_links_and_anchors_match_the_pages(self):
        entries = json.loads((ROOT / 'page-index.json').read_text(encoding='utf-8'))
        cache = json.loads((ROOT / 'pages-data.js').read_text(encoding='utf-8')
                           .removeprefix('window.OB_PAGES=').strip().removesuffix(';'))
        for entry in entries:
            path = ROOT / (entry['slug'] + '.html')
            soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
            self.assertEqual(soup.main.decode_contents(), cache[entry['slug']]['content'])
            self.assertEqual(soup.title.get_text(), cache[entry['slug']]['title'])
            self.assertEqual(soup.select_one('meta[name=description]')['content'], entry['lead'])
            ids = [element['id'] for element in soup.select('[id]')]
            self.assertEqual(len(ids), len(set(ids)), path.name)
            for element in soup.select('[href],[src]'):
                link = element.get('href', element.get('src', ''))
                url = urlparse(link)
                if url.scheme or url.netloc:
                    continue
                target = (path.parent / unquote(url.path)).resolve() if url.path else path
                self.assertTrue(target.exists(), f'{path.name}: {link}')
                if url.fragment and target.suffix == '.html':
                    other = soup if target == path else BeautifulSoup(target.read_text(encoding='utf-8'), 'html.parser')
                    self.assertIsNotNone(other.find(id=unquote(url.fragment)), f'{path.name}: {link}')

    def test_revision_pages_are_linked_and_available_offline(self):
        self.page.goto((ROOT / 'index.html').as_uri())
        for slug in ['individual-revision', 'groups-revision']:
            link = self.page.locator(f'#sidebar a[href="{slug}.html"]')
            self.assertEqual(link.count(), 1)
            link.evaluate('element=>element.click()')
            self.assertIn('Short note', self.page.locator('h1').inner_text())
            self.assertLess(len(self.page.locator('article').inner_text().split()), 650)
            self.assertGreaterEqual(self.page.locator('article details').count(), 3)

    def test_source_map_and_reciprocal_promotion_diagram(self):
        self.page.goto((ROOT / 'lecture-1-organizational-behaviour-foundations.html').as_uri())
        row = self.page.locator('tr').filter(has_text='Social psychology')
        self.assertEqual(row.locator('td').last.inner_text(), 'Group')
        self.page.goto((ROOT / (SLUGS['attitudes'] + '.html')).as_uri())
        diagram = self.page.locator('svg[data-figure="promotion"]')
        self.assertEqual(diagram.count(), 1)
        self.assertIn('Behavioural response/action', diagram.text_content())
        self.assertEqual(diagram.locator('path[marker-start][marker-end]').count(), 6)

    def test_attribution_case_contains_evidence_across_situations(self):
        self.page.goto((ROOT / (SLUGS['perception'] + '.html')).as_uri())
        self.assertGreater(self.page.get_by_text('punctual for other kinds of commitments', exact=False).count(), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
