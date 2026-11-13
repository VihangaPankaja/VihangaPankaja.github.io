# OBM checks

Run `python study-guides/ob/checks/test_activities.py` from the repository root. This uses Python, Beautiful Soup and Playwright with Chromium. It checks the teaching cases, each model branch, revision links, source corrections, local references and the offline content cache.

The November 2026 revision was checked against copies of the course decks and assigned readings. Original course files were read only. Hash comparisons matched all 13 copied documents to their originals after editing.

## Corrections and source locators

| Correction | Course source |
| --- | --- |
| Social psychology connects to the Group unit in the lecture map; sociology connects to Group and Organization system. | Lesson 1, slide 14 diagram |
| The general behavioural component includes intention, but the promotion case describes actions. All six relationships in its diagram are reciprocal. | Lesson 2, slides 24 and 27 |
| The image-labeling experiment and the study reporting 24% faster work and 43% less downtime are separate examples. | *Why Your Values Belong at Work*, page 3 |
| Goleman's matrix is on slide 53; the separate abilities/cascade material follows. | Lesson 4, slides 53–54 |
| The interview's roughly 80% figure concerns giving advice/problem-solving, not a preference for receiving advice. | *The Right Way to Manage Emotions on Your Team*, Christina Bradley's discussion of the default response |
| Distinctiveness needs observations in other situations. Normal punctuality alone supports a comparison over time. Both lateness cases now supply the missing evidence. | Lesson 5, slides 23–25 |
| The slide examples use “faultline”; the opening definition contains the “faultiness” typo too. | Lesson 6, slides 68–69 |

Personality follows physical Lecture 3 slides 1–57; values follows slides 58–76. Keep these topic boundaries when revising. National-culture dimensions describe aggregate patterns, not individual personality.

## Browser verification

Author QA covered all 13 pages at 320, 390, 900 and 1440 pixels in both Light and Dark: 104 layout cases. The actual document theme was asserted. Details were expanded and every activity was exercised. No page-wide overflow or JavaScript errors were found. Overflowing table and diagram regions supported keyboard panning.

File/offline and HTTP routing were exercised through the mobile topic menu, including new activities after navigation, theme retention, heading position, Back navigation, short-note search and empty search results. Representative screenshots were inspected for typography, dark colors, feedback, revision notes and the corrected diagram. Long comparison tables use labeled rows on phones.

Source review and author browser QA are separate evidence. Course models and practitioner examples remain qualified; reported study outcomes are not individual predictions. Underlying research was not independently replicated, and linked videos were not reviewed.
