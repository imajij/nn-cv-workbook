import { useState, useEffect, useMemo, Fragment } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import content from './content.json'
import figures from './figures.json'

const TOPICS = content.topics

/* ------------------------------------------------------------------ */
/*  Callout support: turn  > [!TYPE] Title  blockquotes into boxes     */
/* ------------------------------------------------------------------ */
const CALLOUT_LABELS = {
  intuition: 'Intuition',
  analogy: 'Analogy',
  key: 'Key idea',
  math: 'The math, in plain words',
  example: 'Worked example',
  warning: 'Watch out',
  pitfall: 'Common pitfall',
  exam: 'Exam tip',
  note: 'Note',
}

function remarkCallouts() {
  const walk = (node) => {
    if (!node || !node.children) return
    for (const child of node.children) {
      if (child.type === 'blockquote') {
        const first = child.children?.[0]
        const textNode = first?.type === 'paragraph' ? first.children?.[0] : null
        if (textNode?.type === 'text') {
          const nl = textNode.value.indexOf('\n')
          const firstLine = nl === -1 ? textNode.value : textNode.value.slice(0, nl)
          const m = firstLine.match(/^\s*\[!(\w+)\]\s*(.*)$/)
          if (m) {
            const type = m[1].toLowerCase()
            const title = m[2].trim()
            const base = CALLOUT_LABELS[type] || type
            textNode.value = nl === -1 ? '' : textNode.value.slice(nl + 1)
            child.data = child.data || {}
            child.data.hName = 'div'
            child.data.hProperties = { className: ['callout', 'callout-' + type] }
            child.children.unshift({
              type: 'paragraph',
              data: { hName: 'div', hProperties: { className: ['callout-label'] } },
              children: [{ type: 'text', value: title ? `${base} — ${title}` : base }],
            })
          }
        }
      }
      walk(child)
    }
  }
  return (tree) => walk(tree)
}

const MD_REMARK = [remarkMath, remarkGfm, remarkCallouts]
const MD_REHYPE = [rehypeKatex]

function MD({ children }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={MD_REMARK} rehypePlugins={MD_REHYPE}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Figure: render an SVG diagram from figures.json by id             */
/* ------------------------------------------------------------------ */
function Figure({ id, captionOverride }) {
  const fig = figures[id]
  if (!fig) return <div className="diagram-missing">missing figure: {id}</div>
  const caption = captionOverride || fig.caption
  return (
    <figure className="diagram">
      <div className="dg" dangerouslySetInnerHTML={{ __html: fig.svg }} />
      {caption && (
        <figcaption>
          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
            {caption}
          </ReactMarkdown>
        </figcaption>
      )}
    </figure>
  )
}

/* Split a markdown body on  [[fig:id]]  /  [[fig:id|caption]]  tokens */
const FIG_RE = /\[\[fig:([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g
function RichText({ text }) {
  if (!text) return null
  const segments = []
  let last = 0
  let m
  FIG_RE.lastIndex = 0
  while ((m = FIG_RE.exec(text)) !== null) {
    if (m.index > last) segments.push({ t: 'md', v: text.slice(last, m.index) })
    segments.push({ t: 'fig', id: m[1], cap: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ t: 'md', v: text.slice(last) })
  return (
    <>
      {segments.map((s, i) =>
        s.t === 'fig' ? (
          <Figure key={i} id={s.id} captionOverride={s.cap} />
        ) : (
          s.v.trim() && <MD key={i}>{s.v}</MD>
        )
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */
function usePersist(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val))
    } catch {
      /* ignore */
    }
  }, [key, val])
  return [val, setVal]
}

function useTheme() {
  const [theme, setTheme] = usePersist('theme', 'light')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return [theme, setTheme]
}

/* ------------------------------------------------------------------ */
/*  Panels                                                             */
/* ------------------------------------------------------------------ */
function Notes({ topic }) {
  return (
    <div className="stack">
      {topic.notes.map((n, i) => (
        <section className="card note" key={i}>
          <h3>
            <span className="note-idx">{i + 1}</span>
            {n.heading}
          </h3>
          <div className="note-body">
            <RichText text={n.body} />
          </div>
        </section>
      ))}
    </div>
  )
}

function Quiz({ topic, tag }) {
  const [picks, setPicks] = usePersist(`quiz:${tag}`, {})
  const answered = Object.keys(picks).length
  const correct = topic.quiz.reduce((acc, q, i) => acc + (picks[i] === q.answer ? 1 : 0), 0)

  return (
    <div className="stack">
      <div className="quiz-bar">
        <span>
          Answered <strong>{answered}</strong>/{topic.quiz.length}
        </span>
        <span className="score-pill">
          Score {correct}/{answered || 0}
        </span>
        <button className="ghost" onClick={() => setPicks({})}>
          Reset
        </button>
      </div>

      {topic.quiz.map((q, i) => {
        const pick = picks[i]
        const done = pick !== undefined
        return (
          <section className="card" key={i}>
            <div className="q-head">
              <span className="q-num">Q{i + 1}</span>
              <div className="q-text">
                <MD>{q.q}</MD>
              </div>
              {q.tag && <span className="q-tag">{q.tag}</span>}
            </div>
            <div className="options">
              {q.options.map((opt, oi) => {
                let cls = 'option'
                let mark = ''
                if (done) {
                  if (oi === q.answer) {
                    cls += ' correct'
                    mark = '✓'
                  } else if (oi === pick) {
                    cls += ' wrong'
                    mark = '✗'
                  } else cls += ' dim'
                }
                return (
                  <button
                    key={oi}
                    className={cls}
                    disabled={done}
                    onClick={() => setPicks({ ...picks, [i]: oi })}
                  >
                    <span className="opt-letter">{String.fromCharCode(65 + oi)}</span>
                    <span className="opt-body">
                      <MD>{opt}</MD>
                    </span>
                    {mark && <span className="opt-mark">{mark}</span>}
                  </button>
                )
              })}
            </div>
            {done && (
              <div className={'explain ' + (pick === q.answer ? 'ok' : 'no')}>
                <span className="verdict">
                  {pick === q.answer ? 'Correct. ' : 'Not quite. '}
                </span>
                <MD>{q.explanation}</MD>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function Descriptive({ topic, tag }) {
  const [open, setOpen] = usePersist(`desc:${tag}`, {})
  return (
    <div className="stack">
      {topic.descriptive.map((d, i) => {
        const shown = open[i]
        return (
          <section className="card" key={i}>
            <div className="q-head">
              <span className="q-num">Q{i + 1}</span>
              <div className="q-text">
                <MD>{d.q}</MD>
              </div>
              {d.tag && <span className="q-tag">{d.tag}</span>}
            </div>
            <button className="ghost reveal" onClick={() => setOpen({ ...open, [i]: !shown })}>
              {shown ? 'Hide model answer' : 'Show model answer'}
            </button>
            {shown && (
              <div className="answer">
                <RichText text={d.answer} />
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

/* Shared, theme-aware arrowhead markers referenced by every diagram   */
function SvgDefs() {
  const mk = (id, cls) => (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8.4"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" className={cls} />
    </marker>
  )
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {mk('dg-arrow', 'dg-mk-line')}
        {mk('dg-arrow-accent', 'dg-mk-accent')}
        {mk('dg-arrow-accent2', 'dg-mk-accent2')}
        {mk('dg-arrow-ok', 'dg-mk-ok')}
        {mk('dg-arrow-bad', 'dg-mk-bad')}
      </defs>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  const [theme, setTheme] = useTheme()
  const [active, setActive] = useState(TOPICS[0].tag)
  const [tab, setTab] = useState('notes')
  const [navOpen, setNavOpen] = useState(false)
  const topic = useMemo(() => TOPICS.find((t) => t.tag === active), [active])

  // track which sessions have a fully-answered quiz (for sidebar ticks + progress)
  const [doneMap, setDoneMap] = useState({})
  useEffect(() => {
    const m = {}
    for (const t of TOPICS) {
      try {
        const raw = localStorage.getItem(`quiz:${t.tag}`)
        const picks = raw ? JSON.parse(raw) : {}
        if (Object.keys(picks).length >= t.quiz.length && t.quiz.length > 0) m[t.tag] = true
      } catch {
        /* ignore */
      }
    }
    setDoneMap(m)
  }, [tab, active])

  const groups = useMemo(() => {
    const m = new Map()
    for (const t of TOPICS) {
      const week = t.week.split('·')[0].trim()
      if (!m.has(week)) m.set(week, [])
      m.get(week).push(t)
    }
    return [...m.entries()]
  }, [])

  const doneCount = Object.keys(doneMap).length
  const pct = Math.round((doneCount / TOPICS.length) * 100)

  const tabs = [
    ['notes', 'Notes', topic.notes.length],
    ['quiz', 'Quiz', topic.quiz.length],
    ['descriptive', 'Descriptive', topic.descriptive.length],
  ]

  return (
    <div className="app">
      <SvgDefs />
      <aside className={'sidebar' + (navOpen ? ' open' : '')}>
        <div className="brand">
          <div className="brand-row">
            <div className="brand-mark">DL</div>
            <div>
              <div className="brand-title">Deep Learning &amp; Neural Networks</div>
              <div className="brand-sub">Practice Workbook · {TOPICS.length} sessions</div>
            </div>
          </div>
          <div className="progress-wrap">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: pct + '%' }} />
            </div>
            <div className="progress-label">
              <span>Quizzes completed</span>
              <span>
                {doneCount}/{TOPICS.length}
              </span>
            </div>
          </div>
        </div>
        <nav>
          {groups.map(([week, items]) => (
            <div className="nav-group" key={week}>
              <div className="nav-week">{week}</div>
              {items.map((t) => (
                <button
                  key={t.tag}
                  className={
                    'nav-item' + (t.tag === active ? ' sel' : '') + (doneMap[t.tag] ? ' done' : '')
                  }
                  onClick={() => {
                    setActive(t.tag)
                    setTab('notes')
                    setNavOpen(false)
                    window.scrollTo(0, 0)
                  }}
                >
                  <span className="nav-dot">{t.week.split('·')[1]?.replace(/\D/g, '') || '•'}</span>
                  <span className="nav-name">{t.title.replace(/^Hands-on:\s*/, '')}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="src-note">
          Built from the Scaler School of Technology “Deep Learning I: Neural Networks” lecture decks
          by Priyansh Saxena.
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
          <div>
            <div className="crumb">{topic.week}</div>
          </div>
          <div className="spacer" />
          <button
            className="theme-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>

        <h1>{topic.title}</h1>
        <div className="summary">
          <MD>{topic.summary}</MD>
        </div>

        <div className="tabs">
          {tabs.map(([id, label, n]) => (
            <button
              key={id}
              className={'tab' + (tab === id ? ' active' : '')}
              onClick={() => setTab(id)}
            >
              {label} <span className="count">{n}</span>
            </button>
          ))}
        </div>

        <div className="content">
          {tab === 'notes' && <Notes topic={topic} />}
          {tab === 'quiz' && <Quiz topic={topic} tag={topic.tag} />}
          {tab === 'descriptive' && <Descriptive topic={topic} tag={topic.tag} />}
        </div>
      </main>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
    </div>
  )
}
