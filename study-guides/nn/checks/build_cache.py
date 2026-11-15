"""Rebuild the offline topic cache from the published HTML, without a server."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def build():
    pages = {}
    for path in sorted(ROOT.glob("*.html")):
        text = path.read_text(encoding="utf-8")
        main = re.search(r"<main\b[^>]*>(.*?)</main>", text, re.S)
        title = re.search(r"<title>(.*?)</title>", text, re.S)
        description = re.search(r'<meta content="([^"]*)" name="description"', text)
        if not all([main, title, description]):
            raise ValueError(f"Missing page metadata: {path.name}")
        pages[path.stem] = {
            "title": title.group(1),
            "description": description.group(1),
            "content": main.group(1),
        }
    (ROOT / "pages-data.js").write_text(
        "window.NN_PAGES=" + json.dumps(pages, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Updated offline cache for {len(pages)} pages")


if __name__ == "__main__":
    build()
