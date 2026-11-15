# VihangaPankaja.github.io

The published study guide is [Neural Networks and Fuzzy Logic](https://vihangapankaja.github.io/study-guides/nn/).

Start with the [calculation workbook](study-guides/nn/workbook.html), or use the course topic menu for the full lecture explanations. Every workbook problem has explained solution steps and a follow-up question with its own solution. Long derivations open on demand, and topic links open the relevant section automatically.

The guide works as local HTML, including topic navigation, diagrams, interactive calculations and themes. Other course copies are kept locally in ignored folders and are excluded from GitHub Pages.

After editing a topic, refresh the offline cache and run the checks:

```sh
python study-guides/nn/checks/build_cache.py
python -m unittest discover -s study-guides/nn/checks -p 'test_*.py'
python study-guides/nn/checks/verify.py
```

The checks use Python and Playwright. Install Chromium once with `python -m playwright install chromium`.
