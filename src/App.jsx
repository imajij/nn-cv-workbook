import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import content from './content.json'

const TOPICS = content.topics

// Shared markdown renderer (GFM + KaTeX math)
function MD({ children }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

// ---- localStorage helpers (persist quiz selections + revealed answers) ----
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

function Notes({ topic }) {
  return (
    <div className="stack">
      {topic.notes.map((n, i) => (
        <section className="card note" key={i}>
          <h3>{n.heading}</h3>
          <MD>{n.body}</MD>
        </section>
      ))}
    </div>
  )
}

function Quiz({ topic, tag }) {
  // picks[i] = chosen option index (or undefined)
  const [picks, setPicks] = usePersist(`quiz:${tag}`, {})
  const answered = Object.keys(picks).length
  const correct = topic.quiz.reduce(
    (acc, q, i) => acc + (picks[i] === q.answer ? 1 : 0),
    0
  )

  return (
    <div className="stack">
      <div className="quiz-bar">
        <span>
          Answered <strong>{answered}</strong>/{topic.quiz.length}
        </span>
        <span>
          Score <strong>{correct}</strong>/{topic.quiz.length}
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
            </div>
            <div className="options">
              {q.options.map((opt, oi) => {
                let cls = 'option'
                if (done) {
                  if (oi === q.answer) cls += ' correct'
                  else if (oi === pick) cls += ' wrong'
                  else cls += ' dim'
                }
                return (
                  <button
                    key={oi}
                    className={cls}
                    disabled={done}
                    onClick={() => setPicks({ ...picks, [i]: oi })}
                  >
                    <span className="opt-letter">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="opt-body">
                      <MD>{opt}</MD>
                    </span>
                  </button>
                )
              })}
            </div>
            {done && (
              <div
                className={
                  'explain ' + (pick === q.answer ? 'ok' : 'no')
                }
              >
                <strong>{pick === q.answer ? 'Correct.' : 'Not quite.'}</strong>{' '}
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
            </div>
            <button
              className="ghost reveal"
              onClick={() => setOpen({ ...open, [i]: !shown })}
            >
              {shown ? 'Hide model answer' : 'Show model answer'}
            </button>
            {shown && (
              <div className="answer">
                <MD>{d.answer}</MD>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState(TOPICS[0].tag)
  const [tab, setTab] = useState('notes')
  const [navOpen, setNavOpen] = useState(false)
  const topic = useMemo(() => TOPICS.find((t) => t.tag === active), [active])

  // group topics by week for the sidebar
  const groups = useMemo(() => {
    const m = new Map()
    for (const t of TOPICS) {
      const week = t.week.split('·')[0].trim()
      if (!m.has(week)) m.set(week, [])
      m.get(week).push(t)
    }
    return [...m.entries()]
  }, [])

  const tabs = [
    ['notes', 'Notes', topic.notes.length],
    ['quiz', 'Quiz', topic.quiz.length],
    ['descriptive', 'Descriptive', topic.descriptive.length],
  ]

  return (
    <div className="app">
      <aside className={'sidebar' + (navOpen ? ' open' : '')}>
        <div className="brand">
          <div className="brand-title">Deep Learning &amp; Neural Networks</div>
          <div className="brand-sub">Practice Workbook · {TOPICS.length} sessions</div>
        </div>
        <nav>
          {groups.map(([week, items]) => (
            <div className="nav-group" key={week}>
              <div className="nav-week">{week}</div>
              {items.map((t) => (
                <button
                  key={t.tag}
                  className={'nav-item' + (t.tag === active ? ' sel' : '')}
                  onClick={() => {
                    setActive(t.tag)
                    setTab('notes')
                    setNavOpen(false)
                    window.scrollTo(0, 0)
                  }}
                >
                  <span className="nav-sess">{t.week.split('·')[1]?.trim()}</span>
                  <span className="nav-name">{t.title.replace(/^Hands-on:\s*/, '')}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="src-note">
          Built from the SST “Deep Learning I” course handouts.
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setNavOpen((o) => !o)}>
            ☰
          </button>
          <div>
            <div className="crumb">{topic.week}</div>
            <h1>{topic.title}</h1>
          </div>
        </header>

        <p className="summary">{topic.summary}</p>

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
          {tab === 'descriptive' && (
            <Descriptive topic={topic} tag={topic.tag} />
          )}
        </div>
      </main>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
    </div>
  )
}
