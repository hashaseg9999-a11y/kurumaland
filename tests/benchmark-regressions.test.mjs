import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

// Node 22.13+; no extra test dependency or production bundle changes.
const root = resolve(import.meta.dirname, '..');
const moduleUrls = new Map();
function moduleUrl(relativePath) {
  const path = resolve(root, relativePath);
  if (moduleUrls.has(path)) return moduleUrls.get(path);
  const source = stripTypeScriptTypes(readFileSync(path, 'utf8'), { mode: 'transform' });
  const code = source.replace(/from\s+(['"])(\.[^'"]+)\1/g, (_match, _quote, specifier) =>
    `from ${JSON.stringify(moduleUrl(resolve(dirname(path), `${specifier}.ts`)))}`);
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  moduleUrls.set(path, url);
  return url;
}
const load = (path) => import(moduleUrl(path));

function installGlobals(t, values) {
  for (const [name, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, name, old) : delete globalThis[name]);
  }
}

function speechFixture(t, langMode = 'rotate') {
  const spoken = [];
  const voices = ['ja-JP', 'en-US', 'th-TH'].map((lang) => ({ lang }));
  const synthesis = {
    getVoices: () => voices,
    addEventListener() {},
    cancel() { spoken.length = 0; },
    speak(utterance) { spoken.push(utterance); },
  };
  class Utterance { constructor(text) { this.text = text; } }
  installGlobals(t, { window: { speechSynthesis: synthesis }, SpeechSynthesisUtterance: Utterance });
  return { settings: { langMode, endTimerMinutes: null }, spoken, synthesis, voices };
}

test('UI reads preserve rotation, including switching modes without speaking', async (t) => {
  const fixture = speechFixture(t);
  const { createSpeechService } = await load('src/core/speech.ts');
  const speech = createSpeechService(fixture.settings);
  speech.unlock();
  for (const language of ['ja-JP', 'en-US', 'th-TH', 'ja-JP']) {
    const next = speech.getLanguage();
    assert.equal(speech.getLanguage(), next);
    speech.speak('car');
    assert.equal(fixture.spoken.at(-1).lang, language);
  }
  fixture.settings.langMode = 'en';
  assert.equal(speech.getLanguage(), 'en');
  fixture.settings.langMode = 'rotate';
  assert.equal(speech.getLanguage(), 'ja');
  speech.speak('car');
  assert.equal(fixture.spoken.at(-1).lang, 'ja-JP');
});

test('all signal vehicles and existing main phrases retain translated vocabulary', async (t) => {
  const fixture = speechFixture(t, 'en');
  const { createSpeechService, resolvePhraseKey } = await load('src/core/speech.ts');
  const { VOCAB } = await load('src/core/vocab.ts');
  const speech = createSpeechService(fixture.settings);
  speech.unlock();
  for (const [phrase, key] of [
    ['あお！ しょうぼうしゃ、ごー！', 'goFireTruck'],
    ['あお！ きゅうきゅうしゃ、ごー！', 'goAmbulance'],
    ['あお！ パトカー、ごー！', 'goPoliceCar'],
    ['あお！ ぱとかー、ごー！', 'goPoliceCar'],
    ['よくできたね！', 'wellDone'],
    ['れっしゃ しゅっぱつ！', 'trainDepart'],
    ['やったー！ ぼーなす！', 'bonus'],
  ]) {
    assert.equal(resolvePhraseKey(phrase), key);
    for (const lang of ['ja', 'en', 'th']) {
      fixture.settings.langMode = lang;
      speech.speakDirect(phrase);
      assert.equal(fixture.spoken.at(-1).text, VOCAB[key][lang]);
      assert.equal(fixture.spoken.at(-1).lang, { ja: 'ja-JP', en: 'en-US', th: 'th-TH' }[lang]);
    }
  }
});

test('a superseded request cannot enqueue after a newer direct utterance', async (t) => {
  const fixture = speechFixture(t, 'en');
  const { createSpeechService } = await load('src/core/speech.ts');
  const speech = createSpeechService(fixture.settings);
  speech.unlock();
  let reenter = true;
  fixture.synthesis.getVoices = () => {
    if (reenter) { reenter = false; speech.speakDirect('latest custom phrase'); }
    return fixture.voices;
  };
  speech.speak('car');
  assert.deepEqual(fixture.spoken.map((utterance) => utterance.text), ['latest custom phrase']);
});

// A deliberately small DOM fixture exercises settings change handlers, not layout.
class Element extends EventTarget {
  children = [];
  style = { removeProperty() {} };
  classList = { add() {}, remove() {} };
  constructor(tagName) { super(); this.tagName = tagName; }
  setAttribute() {}
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); }
  get options() { return { item: (index) => this.children[index] ?? null }; }
}
function find(rootElement, id) {
  if (rootElement.id === id) return rootElement;
  for (const child of rootElement.children) { const found = find(child, id); if (found) return found; }
}

test('timer options update in place through Japanese, English and Thai and persist all choices', async (t) => {
  const saved = new Map();
  const document = new EventTarget();
  document.createElement = (tag) => new Element(tag);
  const localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  installGlobals(t, { document, window: { localStorage } });
  const { mountParentalSettingsGate } = await load('src/core/gate.ts');
  const { loadSettings } = await load('src/core/settings.ts');
  const settings = { langMode: 'ja', endTimerMinutes: null };
  const rootElement = new Element('div');
  const unmount = mountParentalSettingsGate({
    root: rootElement, settings, speech: { getLanguage: () => settings.langMode },
  });
  const language = find(rootElement, 'settings-language-mode');
  const timer = find(rootElement, 'settings-end-timer');
  timer.value = '5';
  timer.dispatchEvent(new Event('change'));
  for (const [lang, labels] of [
    ['ja', ['なし', '5分', '10分', '20分', '30分']],
    ['en', ['None', '5 min', '10 min', '20 min', '30 min']],
    ['th', ['ไม่มี', '5 นาที', '10 นาที', '20 นาที', '30 นาที']],
  ]) {
    language.value = lang;
    language.dispatchEvent(new Event('change'));
    assert.deepEqual(timer.children.map((option) => option.textContent), labels);
    assert.equal(timer.value, '5');
    assert.equal(loadSettings().langMode, lang);
  }
  for (const [value, minutes] of [['none', null], ['5', 5], ['10', 10], ['20', 20], ['30', 30]]) {
    timer.value = value;
    timer.dispatchEvent(new Event('change'));
    assert.equal(settings.endTimerMinutes, minutes);
    assert.equal(loadSettings().endTimerMinutes, minutes);
  }
  unmount();
});

test('all timer durations, including five minutes and none, retain scheduling behavior', async (t) => {
  const scheduled = new Map();
  let nextId = 0;
  installGlobals(t, { window: {
    setTimeout: (callback, delay) => { const id = ++nextId; scheduled.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => scheduled.delete(id),
  } });
  const { EndSessionController } = await load('src/core/endSession.ts');
  const controller = new EndSessionController({ onEnd() {} });
  for (const minutes of [5, 10, 20, 30]) {
    controller.configure(minutes);
    assert.deepEqual([...scheduled.values()].map(({ delay }) => delay), [minutes * 60_000]);
  }
  controller.configure(null);
  assert.equal(scheduled.size, 0);
  controller.destroy();
});

test('shared cleanup preserves callback and resource order and empties callbacks', async () => {
  const { releaseGameBase } = await load('src/three/gameLifecycle.ts');
  const order = [];
  const callbacks = [() => order.push('event'), () => order.push('update')];
  const resources = ['hud', 'particles', 'camera'].map((name) => ({ dispose: () => order.push(name) }));
  releaseGameBase(callbacks, ...resources);
  assert.deepEqual(order, ['event', 'update', 'hud', 'particles', 'camera']);
  assert.equal(callbacks.length, 0);
});

// Evaluate only the arithmetic subset used by the source CSS. This is a geometry
// regression test, not a substitute for browser/Safari visual validation.
function cssNumber(expression, declarations, width, height) {
  const expanded = expression
    .replace(/var\((--[\w-]+)\)/g, (_, name) => `(${cssNumber(declarations[name], declarations, width, height)})`)
    .replace(/([\d.]+)(px|vw|vh)/g, (_, value, unit) => String(Number(value) * (unit === 'vw' ? width / 100 : unit === 'vh' ? height / 100 : 1)))
    .replace(/calc\(/g, '(');
  assert.match(expanded.replace(/\b(?:min|max|clamp)\b/g, ''), /^[\d\s.+*/(),-]+$/);
  return Function('min', 'max', 'clamp', `return (${expanded});`)(Math.min, Math.max, (low, value, high) => Math.max(low, Math.min(value, high)));
}
const declarations = (body) => Object.fromEntries([...body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2]]));

test('car wash fits above the tray on short-wide screens and preserves 4:3 geometry', () => {
  const source = readFileSync(resolve(root, 'src/activities/carWash.ts'), 'utf8');
  const base = declarations(source.match(/\.kl-wash__bay\s*\{([^}]+)\}/)[1]);
  const media = source.match(/@media\s*\(min-aspect-ratio:\s*(\d+)\s*\/\s*(\d+)\)\s*\{\s*\.kl-wash__bay\s*\{([^}]+)\}/);
  const wide = declarations(media[3]);
  const tray = declarations(source.match(/\.kl-wash__tray\s*\{([^}]+)\}/)[1]);
  for (const [width, height] of [[1280, 620], [1280, 640], [1280, 720], [1920, 1080], [1024, 768]]) {
    const active = width / height >= Number(media[1]) / Number(media[2]) ? { ...base, ...wide } : base;
    const bayWidth = cssNumber(active.width, active, width, height);
    const bayTop = cssNumber(active.top, active, width, height);
    const trayHeight = cssNumber(tray.height, tray, width, height);
    if (width / height >= 16 / 9) {
      const trayTop = height - 14 - trayHeight; // desktop fixture, no safe-area inset
      assert.ok(bayTop + bayWidth * 3 / 4 <= trayTop, `${width}×${height}: bay must not overlap tray`);
    } else {
      assert.equal(bayTop, 61.44);
      assert.equal(bayWidth, 655.36);
    }
  }
});
