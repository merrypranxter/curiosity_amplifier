import { ai } from '@appdeploy/sdk';

type Category = 'Obvious Next' | 'Hidden Cousins' | 'Fringe/Spice' | 'Hands-On';
type RawItem = { category: Category; title: string; why_for_you: string; summary: string; starter_query: string; deep_query: string; hands_on_query: string; hands_on_title: string; hands_on_instructions: string; code_language?: string; code_snippet?: string; hidden_door: string };
type RecommendInput = { interests?: string[]; serendipity?: boolean; personality?: string; settings?: { obscurity?: number; orthogonality?: number; rigor?: number; actionability?: number; horizon?: string; mode?: string }; depth?: string; previousQueries?: string[][] };

const expectedCategories: Category[] = ['Obvious Next','Obvious Next','Obvious Next','Hidden Cousins','Hidden Cousins','Hidden Cousins','Hidden Cousins','Hidden Cousins','Fringe/Spice','Fringe/Spice','Fringe/Spice','Hands-On','Hands-On','Hands-On','Hands-On'];

const schema = {
  type: 'object',
  properties: {
    bundle_title: { type: 'string' },
    intro: { type: 'string' },
    map_note: { type: 'string' },
    items: {
      type: 'array', minItems: 15, maxItems: 15,
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['Obvious Next','Hidden Cousins','Fringe/Spice','Hands-On'] },
          title: { type: 'string' }, why_for_you: { type: 'string' }, summary: { type: 'string' }, starter_query: { type: 'string' }, deep_query: { type: 'string' }, hands_on_query: { type: 'string' }, hands_on_title: { type: 'string' }, hands_on_instructions: { type: 'string' }, code_language: { type: 'string' }, code_snippet: { type: 'string' }, hidden_door: { type: 'string' }
        },
        required: ['category','title','why_for_you','summary','starter_query','deep_query','hands_on_query','hands_on_title','hands_on_instructions','hidden_door']
      }
    }
  },
  required: ['bundle_title','intro','map_note','items']
};

function clean(value: unknown, max = 500) { return String(value || '').trim().slice(0, max); }
function searchUrl(base: string, query: string) { return base + encodeURIComponent(query); }

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'CuriosityAmplifier/1.0' } });
    if (!response.ok) return null;
    return await response.json() as Record<string, any>;
  } catch { return null; } finally { clearTimeout(timer); }
}

async function starterResource(query: string) {
  const data = await fetchJson('https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=' + encodeURIComponent(query));
  const title = clean(data?.query?.search?.[0]?.title, 180);
  return title ? { label: '[Reference]', title, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')) } : { label: '[Reference]', title: 'Search Wikipedia for ' + query, url: searchUrl('https://en.wikipedia.org/w/index.php?search=', query) };
}

async function deepResource(query: string) {
  const data = await fetchJson('https://api.openalex.org/works?per-page=1&search=' + encodeURIComponent(query));
  const work = data?.results?.[0];
  if (work?.display_name) return { label: work.type === 'preprint' ? '[Preprint]' : '[Peer-Reviewed]', title: clean(work.display_name, 220), url: clean(work.doi || work.id, 500) };
  return { label: '[Research Index]', title: 'Search OpenAlex for ' + query, url: searchUrl('https://openalex.org/works?search=', query) };
}

export async function recommend(input: RecommendInput) {
  const interests = Array.isArray(input.interests) ? input.interests.map((item) => clean(item, 100)).filter(Boolean).slice(0, 6) : [];
  const serendipity = Boolean(input.serendipity) || interests.length === 0;
  const settings = input.settings || {};
  const history = Array.isArray(input.previousQueries) ? input.previousQueries.slice(0, 8).map((group) => group.join(' + ')) : [];
  const subject = serendipity ? 'Choose a wild but coherent bundle of 2-3 seed interests yourself. Avoid generic productivity, finance, celebrity, and wellness topics.' : interests.join(' + ');
  const prompt = `Create a curiosity recommendation bundle for: ${subject}.
Personality: ${clean(input.personality, 80)}. Voice mode: ${clean(settings.mode, 30)}. Depth: ${clean(input.depth, 20)}.
Sliders: obscurity ${settings.obscurity ?? 4}/10, orthogonality ${settings.orthogonality ?? 5}/10, rigor ${settings.rigor ?? 4}/10, actionability ${settings.actionability ?? 5}/10. Time horizon: ${clean(settings.horizon || 'mixed', 30)}.
Previous rabbit holes: ${history.length ? history.join(' | ') : 'none yet'}.
Return EXACTLY 15 items in this exact order: 3 Obvious Next, 5 Hidden Cousins, 3 Fringe/Spice, 4 Hands-On. Every item must be specific, non-repetitive, and meaningfully connected. If multiple interests were supplied, blend them often instead of treating them separately.
Write punchy titles. why_for_you should explicitly connect the item to the stated interest. summary should be 2-3 useful sentences, not hype. starter_query should be a precise encyclopedic search phrase. deep_query should be a precise academic-paper search phrase. hands_on_query should be a useful GitHub repository search phrase. hands_on_title and instructions should describe a concrete experiment, dataset, simulation, or small build. Include a short runnable Python or JavaScript code_snippet where genuinely relevant; otherwise use an empty string. hidden_door is the next related topic breadcrumb.
Tone by mode: explorer=adventurous/open; builder=practical/structured; archivist=scholarly/sourced; feral=chaotic brilliance but still accurate. Playful microcopy is welcome, generic fluff is forbidden. The map_note must explain one connection to earlier rabbit holes when history exists, otherwise explain the strongest internal connection in this bundle.`;

  const result = await ai.extract({ prompt, schema, maxRetries: 2, maxTokens: 8192, temperature: settings.mode === 'feral' ? 0.95 : 0.72, thinkingMode: settings.rigor && settings.rigor >= 8 ? 'DEEP' : 'FAST' });
  const data = result.data as { bundle_title?: string; intro?: string; map_note?: string; items?: RawItem[] };
  if (!Array.isArray(data.items) || data.items.length < 15) throw new Error('The recommendation engine returned an incomplete bundle.');
  const rawItems = data.items.slice(0, 15);
  const enriched = await Promise.all(rawItems.map(async (item, index) => {
    const title = clean(item.title, 120) || 'Untitled secret tunnel';
    const starterQuery = clean(item.starter_query, 160) || title;
    const deepQuery = clean(item.deep_query, 180) || title;
    const [starter, deepCut] = await Promise.all([starterResource(starterQuery), deepResource(deepQuery)]);
    const handsQuery = clean(item.hands_on_query, 160) || title;
    return {
      id: `door-${index + 1}`,
      category: expectedCategories[index],
      title,
      whyForYou: clean(item.why_for_you, 700),
      summary: clean(item.summary, 1000),
      starter,
      deepCut,
      handsOn: {
        label: '[Repo Search]',
        title: clean(item.hands_on_title, 180) || 'Find something runnable',
        url: searchUrl('https://github.com/search?q=', handsQuery + '&type=repositories'),
        instructions: clean(item.hands_on_instructions, 800),
        codeLanguage: clean(item.code_language, 30),
        codeSnippet: clean(item.code_snippet, 1800),
      },
      hiddenDoor: clean(item.hidden_door, 120) || title,
    };
  }));
  return { bundleTitle: clean(data.bundle_title, 180) || 'A suspiciously connected bundle', intro: clean(data.intro, 900), mapNote: clean(data.map_note, 900), items: enriched };
}
