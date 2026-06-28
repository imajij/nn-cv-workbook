# Deep Learning & Neural Networks — Practice Workbook

An interactive study workbook for the **Scaler School of Technology "Deep Learning I: Neural Networks"**
course, rebuilt for readability and real understanding. Content is grounded in the instructor's actual
lecture decks and modelled on the course's proctored assessments.

**20 sessions** (Weeks 1–7 lectures + a 6-session hands-on project week). Each session has:

- **Notes** — plain-language explanations written for readers who aren't fluent in math notation:
  intuition and analogies first, every symbol glossed, with **60 custom diagrams** (perceptron,
  backprop graph, LSTM cell, attention, the full Transformer, LoRA …) and callout boxes
  (Intuition · Analogy · Key idea · The math in words · Worked example · Watch out · Exam tip).
- **Quiz** — 12 single-correct MCQs per session, exam-style and challenging, with explanations.
  Correct answers are evenly spread across A/B/C/D (3 of each per session) — no answer-key shortcuts.
- **Descriptive** — 6 deeper open-response questions per session with full model answers.

Math is rendered with KaTeX. Diagrams are inline SVG that adapt to the theme. A **light/dark toggle**
(light by default) and your quiz/answer progress persist in `localStorage`.

Totals: ~240 MCQs · ~120 descriptive Q&A · ~140 note sections · 60 diagrams — in `src/content.json`
and `src/figures.json`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build -> dist/
npm run preview  # serve the build
```

## Structure

- `src/content.json` — all session notes & questions.
- `src/figures.json` — the SVG diagram library, keyed by id; notes reference them via `[[fig:id]]`.
- `src/App.jsx` — renderer (react-markdown + KaTeX, callout/figure support, theme toggle).
- `src/index.css` — the light/dark reading theme and diagram color contract.
