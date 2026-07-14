import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Atom, BookOpen, Clock3, Code2, Compass, Dices, ExternalLink, FlaskConical, History, KeyRound, LoaderCircle, Map, Radio, RefreshCw, SlidersHorizontal, Sparkles, WandSparkles, X } from 'lucide-react';

type Category = 'Obvious Next' | 'Hidden Cousins' | 'Fringe/Spice' | 'Hands-On';
type OutputMode = 'explorer' | 'builder' | 'archivist' | 'feral';
type Depth = 'surface' | 'deep';

type Resource = { label: string; title: string; url: string };
type CuriosityItem = {
  id: string;
  category: Category;
  title: string;
  whyForYou: string;
  summary: string;
  starter: Resource;
  deepCut: Resource;
  handsOn: { label: string; title: string; url: string; instructions: string; codeLanguage?: string; codeSnippet?: string };
  hiddenDoor: string;
};

type Bundle = { bundleTitle: string; intro: string; mapNote: string; items: CuriosityItem[] };
type HistoryEntry = { id: string; interests: string[]; personality: string; timestamp: number; bundleTitle: string };

type Settings = {
  obscurity: number;
  orthogonality: number;
  rigor: number;
  actionability: number;
  horizon: string;
  mode: OutputMode;
};

const personalities: Record<string, Settings> = {
  'Balanced Explorer': { obscurity: 4, orthogonality: 5, rigor: 4, actionability: 5, horizon: 'mixed', mode: 'explorer' },
  'Deep Scholar': { obscurity: 5, orthogonality: 3, rigor: 9, actionability: 3, horizon: 'ancient', mode: 'archivist' },
  'Mad Scientist': { obscurity: 8, orthogonality: 9, rigor: 6, actionability: 7, horizon: 'preprint', mode: 'feral' },
  "Builder's Bench": { obscurity: 3, orthogonality: 4, rigor: 5, actionability: 9, horizon: 'today', mode: 'builder' },
  'Dream Cartographer': { obscurity: 9, orthogonality: 10, rigor: 4, actionability: 2, horizon: 'prehistoric', mode: 'explorer' },
  'Data Diver': { obscurity: 6, orthogonality: 5, rigor: 8, actionability: 8, horizon: 'today', mode: 'builder' },
  'History Hacker': { obscurity: 7, orthogonality: 7, rigor: 7, actionability: 6, horizon: '19th century', mode: 'archivist' },
};

const categoryMeta: Record<Category, { icon: typeof Compass; note: string; className: string }> = {
  'Obvious Next': { icon: Compass, note: 'The front door, but with better wallpaper.', className: 'category-obvious' },
  'Hidden Cousins': { icon: Map, note: 'Strong connections wearing fake mustaches.', className: 'category-hidden' },
  'Fringe/Spice': { icon: FlaskConical, note: 'This one is a secret tunnel.', className: 'category-fringe' },
  'Hands-On': { icon: Code2, note: 'Touch the weird machine. See what happens.', className: 'category-hands' },
};

const loadingMessages = [
  'Consulting the suspiciously well-read oracle…',
  'Opening fourteen trapdoors and one filing cabinet…',
  'Crossbreeding your interests in an unsupervised laboratory…',
  'Looking for the good weird, not the algorithmic oatmeal…',
];

function parseInterests(value: string) {
  return value.split(/\n|,|\s\+\s/g).map((part) => part.trim()).filter(Boolean).slice(0, 6);
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem('curio-history') || '[]') as HistoryEntry[]; } catch { return []; }
}

function App() {
  const [interestText, setInterestText] = useState('');
  const [personality, setPersonality] = useState('Balanced Explorer');
  const [settings, setSettings] = useState<Settings>(personalities['Balanced Explorer']);
  const [depth, setDepth] = useState<Depth>('surface');
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [apiKey, setApiKey] = useState('');

  const interests = useMemo(() => parseInterests(interestText), [interestText]);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setLoadingIndex((value) => (value + 1) % loadingMessages.length), 2200);
    return () => window.clearInterval(timer);
  }, [loading]);

  function choosePersonality(name: string) {
    if (name === 'Random') {
      const names = Object.keys(personalities);
      const randomName = names[Math.floor(Math.random() * names.length)];
      setPersonality(randomName);
      setSettings(personalities[randomName]);
      return;
    }
    setPersonality(name);
    setSettings(personalities[name]);
  }

  function tweak(command: 'weirder' | 'hands' | 'rigorous' | 'less-obscure') {
    setSettings((current) => {
      if (command === 'weirder') return { ...current, obscurity: Math.min(10, current.obscurity + 2), orthogonality: Math.min(10, current.orthogonality + 2), mode: 'feral' };
      if (command === 'hands') return { ...current, actionability: Math.min(10, current.actionability + 3), mode: 'builder' };
      if (command === 'rigorous') return { ...current, rigor: Math.min(10, current.rigor + 3), mode: 'archivist' };
      return { ...current, obscurity: Math.max(0, current.obscurity - 3) };
    });
    setPersonality('Custom Mutant');
  }

  async function generate(serendipity = false) {
    if (!serendipity && interests.length === 0) {
      setErrorMessage('Give me at least one curiosity to chew on. “Mushrooms + topology” counts. “Stuff” does not.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setBundle(null);
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: serendipity ? [] : interests,
          serendipity,
          personality,
          settings,
          depth,
          apiKey: apiKey.trim() || undefined,
          previousQueries: history.slice(0, 8).map((entry) => entry.interests),
        }),
      });
      const responseBody = await response.json().catch(() => null) as Bundle | { message?: string } | null;
      if (!response.ok) {
        throw new Error(responseBody && 'message' in responseBody && responseBody.message
          ? responseBody.message
          : `Recommendation request failed (${response.status})`);
      }
      const nextBundle = responseBody as Bundle;
      setBundle(nextBundle);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        interests: serendipity ? ['serendipity mode'] : interests,
        personality,
        timestamp: Date.now(),
        bundleTitle: nextBundle.bundleTitle,
      };
      const nextHistory = [entry, ...history].slice(0, 24);
      setHistory(nextHistory);
      localStorage.setItem('curio-history', JSON.stringify(nextHistory));
      window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The curiosity engine coughed up a hairball.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  function followDoor(topic: string) {
    setInterestText(topic);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const grouped = useMemo(() => {
    const groups: Record<Category, CuriosityItem[]> = { 'Obvious Next': [], 'Hidden Cousins': [], 'Fringe/Spice': [], 'Hands-On': [] };
    bundle?.items.forEach((item) => groups[item.category].push(item));
    return groups;
  }, [bundle]);

  return (
    <main className={`app-shell mode-${settings.mode}`}>
      <div className="noise-layer" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-orbit"><Atom size={25} /></div>
          <div><p className="eyebrow">CURIO.EXE // PERSONAL INTERNET RABBIT-HOLE MACHINE</p><h1>Curiosity Amplifier</h1></div>
        </div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => setHistoryOpen(true)} aria-label="Open curiosity history"><History size={20} /><span>History</span></button>
          <div className="status-pill"><Radio size={14} /> LIVE WEIRDNESS</div>
        </div>
      </header>

      <div className="marquee"><div>✦ NO ALGORITHMIC OATMEAL ✦ SECRET TUNNELS OPEN 24/7 ✦ HYBRID CURIOSITIES ENCOURAGED ✦ PLEASE DO NOT LICK THE PREPRINTS ✦</div></div>

      <section className="hero-grid">
        <div className="intro-panel window-panel">
          <div className="window-chrome"><span>new_curiosity.message</span><div><i /><i /><i /></div></div>
          <div className="intro-copy">
            <p className="kicker">WHAT ARE WE OBSESSING OVER?</p>
            <h2>Feed it an interest. Get back the adjacent, diagonal, underground, and gloriously sideways.</h2>
            <p>Use commas or a plus sign to blend multiple interests. The machine remembers earlier tunnels in this browser and points out where the new ones intersect.</p>
            <label htmlFor="interest-input">Your current brain-worm(s)</label>
            <textarea id="interest-input" value={interestText} onChange={(event) => setInterestText(event.target.value)} placeholder="examples: slime molds + urban planning, datamoshing, medieval marginalia, weird geometry…" />
            <div className="input-footer"><span>{interests.length ? `${interests.length} interest${interests.length === 1 ? '' : 's'} detected` : 'Waiting for a delicious little obsession'}</span><span>up to 6</span></div>
            {errorMessage && <div className="error-banner"><X size={18} />{errorMessage}</div>}
            <div className="primary-actions">
              <button className="primary-button" disabled={loading} onClick={() => generate(false)}>{loading ? <LoaderCircle className="spin" size={20} /> : <WandSparkles size={20} />} OPEN THE TRAPDOOR</button>
              <button className="secondary-button" disabled={loading} onClick={() => generate(true)}><Dices size={19} /> SERENDIPITY ME</button>
            </div>
            <div className="quick-tweaks">
              <button onClick={() => tweak('weirder')}>Weirder please</button><button onClick={() => tweak('hands')}>More hands-on</button><button onClick={() => tweak('rigorous')}>Make it rigorous</button><button onClick={() => tweak('less-obscure')}>Dial down obscurity</button>
            </div>
          </div>
        </div>

        <aside className={`control-panel window-panel ${controlsOpen ? '' : 'collapsed'}`}>
          <div className="window-chrome"><span>personality_mixer.exe</span><button onClick={() => setControlsOpen((value) => !value)}>{controlsOpen ? 'MINIMIZE' : 'RESTORE'}</button></div>
          {controlsOpen && <div className="control-content">
            <div className="section-label"><Sparkles size={16} /> AUTO-SLIDER PERSONALITY</div>
            <div className="personality-grid">
              {[...Object.keys(personalities), 'Random'].map((name) => <button key={name} className={personality === name ? 'active' : ''} onClick={() => choosePersonality(name)}>{name}</button>)}
            </div>
            <div className="section-label"><SlidersHorizontal size={16} /> MANUAL MUTATION</div>
            {(['obscurity', 'orthogonality', 'rigor', 'actionability'] as const).map((key) => <label className="range-row" key={key}><span><b>{key}</b><em>{settings[key]}</em></span><input type="range" min="0" max="10" value={settings[key]} onChange={(event) => { setPersonality('Custom Mutant'); setSettings((current) => ({ ...current, [key]: Number(event.target.value) })); }} /></label>)}
            <div className="two-column-controls">
              <label><span>Time horizon</span><select value={settings.horizon} onChange={(event) => setSettings((current) => ({ ...current, horizon: event.target.value }))}><option>mixed</option><option>prehistoric</option><option>ancient</option><option>19th century</option><option>today</option><option>preprint</option></select></label>
              <label><span>Output depth</span><select value={depth} onChange={(event) => setDepth(event.target.value as Depth)}><option value="surface">surface scan</option><option value="deep">deep dive</option></select></label>
            </div>
            <label className="api-key-control">
              <span><KeyRound size={15} /> OpenAI API key <em>optional fallback</em></span>
              <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-…" autoComplete="off" spellCheck={false} />
              <small>Used only for this browser session and sent only when you generate.</small>
            </label>
            <div className="mode-switch"><span>VOICE</span>{(['explorer', 'builder', 'archivist', 'feral'] as OutputMode[]).map((mode) => <button className={settings.mode === mode ? 'active' : ''} key={mode} onClick={() => setSettings((current) => ({ ...current, mode }))}>{mode}</button>)}</div>
          </div>}
        </aside>
      </section>

      {loading && <section className="loading-stage"><div className="loader-portal"><div /><div /><div /><Atom size={42} /></div><h2>{loadingMessages[loadingIndex]}</h2><p>Building 15 doors: 3 obvious, 5 hidden, 3 spicy, 4 playable.</p></section>}

      {bundle && <section id="results" className="results-section">
        <div className="results-heading"><div><p className="eyebrow">YOUR NEW INTERNET NEIGHBORHOOD</p><h2>{bundle.bundleTitle}</h2><p>{bundle.intro}</p></div><button className="reroll-button" onClick={() => generate(false)}><RefreshCw size={17} /> Reroll same settings</button></div>
        <div className="map-strip"><div className="map-icon"><Map size={24} /></div><div><strong>Curiosity map update</strong><p>{bundle.mapNote}</p></div><div className="map-nodes">{interests.map((interest, index) => <span key={interest}>{index > 0 && <ArrowRight size={13} />}{interest}</span>)}</div></div>
        {(Object.keys(grouped) as Category[]).map((category) => {
          const meta = categoryMeta[category]; const Icon = meta.icon;
          return <section className={`category-section ${meta.className}`} key={category}>
            <div className="category-heading"><div className="category-icon"><Icon size={23} /></div><div><h3>{category}</h3><p>{meta.note}</p></div><span>{grouped[category].length} doors</span></div>
            <div className="card-stack">{grouped[category].map((item, index) => <article className="curiosity-card" key={item.id}>
              <div className="card-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="card-main">
                <div className="card-title-row"><div><p className="tiny-label">{item.category}</p><h4>{item.title}</h4></div>{item.category === 'Fringe/Spice' && <span className="secret-badge">SECRET TUNNEL</span>}</div>
                <div className="why-box"><strong>Why for you</strong><p>{item.whyForYou}</p></div>
                {depth === 'deep' && <p className="summary-copy">{item.summary}</p>}
                <div className="resource-grid">
                  <a href={item.starter.url} target="_blank" rel="noreferrer"><BookOpen size={17} /><span><small>{item.starter.label} Starter resource</small><b>{item.starter.title}</b></span><ExternalLink size={15} /></a>
                  <a href={item.deepCut.url} target="_blank" rel="noreferrer"><Atom size={17} /><span><small>{item.deepCut.label} Deep cut</small><b>{item.deepCut.title}</b></span><ExternalLink size={15} /></a>
                  <a href={item.handsOn.url} target="_blank" rel="noreferrer"><Code2 size={17} /><span><small>{item.handsOn.label} Hands-on</small><b>{item.handsOn.title}</b></span><ExternalLink size={15} /></a>
                </div>
                {depth === 'deep' && <div className="hands-copy"><strong>Try it:</strong> {item.handsOn.instructions}</div>}
                {depth === 'deep' && item.handsOn.codeSnippet && <pre><div><span>{item.handsOn.codeLanguage || 'code'}</span><button onClick={() => navigator.clipboard.writeText(item.handsOn.codeSnippet || '')}>copy</button></div><code>{item.handsOn.codeSnippet}</code></pre>}
                <button className="breadcrumb" onClick={() => followDoor(item.hiddenDoor)}>If this sparks you, next knock on → <b>{item.hiddenDoor}</b></button>
              </div>
            </article>)}</div>
          </section>;
        })}
      </section>}

      <footer><div><Clock3 size={16} /> This browser remembers your last 24 rabbit holes. No account, no feed, no engagement-farming sludge.</div><span>CURIO.EXE © THE PRESENT MOMENT</span></footer>

      {historyOpen && <div className="drawer-scrim" onClick={() => setHistoryOpen(false)}><aside className="history-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div><p className="eyebrow">LOCAL BRAIN TRAIL</p><h2>Curiosity history</h2></div><button className="icon-button" onClick={() => setHistoryOpen(false)}><X size={20} /></button></div>{history.length === 0 ? <div className="empty-history"><History size={36} /><p>No tunnels yet. Go bother the universe.</p></div> : <div className="history-list">{history.map((entry) => <button key={entry.id} onClick={() => { setInterestText(entry.interests.join(' + ')); setHistoryOpen(false); }}><span>{new Date(entry.timestamp).toLocaleDateString()}</span><strong>{entry.bundleTitle}</strong><em>{entry.interests.join(' + ')}</em></button>)}</div>}<button className="clear-history" onClick={() => { setHistory([]); localStorage.removeItem('curio-history'); }}>Erase the evidence</button></aside></div>}
    </main>
  );
}

export default App;
