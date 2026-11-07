const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
export const preferredBasemap = () => read('presence-basemap') === 'satellite' ? 'satellite' : 'map';

const icons = {
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
  satellite: '<path d="m13 7 4-4 4 4-4 4M7 13l-4 4 4 4 4-4M10 8l6 6-2 2-6-6zM3 3l4 4m-4 3a7 7 0 0 1 7-7"/>',
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  dark: '<path d="M20.9 13.3A9 9 0 0 1 10.7 3.1a9 9 0 1 0 10.2 10.2Z"/>'
};

export function mapSettingsControl({onBasemapChange, onThemeChange, canSatellite = true, iconButtons = false}) {
  let node, basemap, appearance, observer;
  let selectedBasemap = canSatellite ? preferredBasemap() : 'map';
  const currentTheme = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light';

  function syncControl(control, value, enabledValue, nextTitle) {
    if (!iconButtons) {
      control.value = value;
      return;
    }
    control.setAttribute('aria-pressed', String(value === enabledValue));
    control.title = nextTitle;
    control.querySelector('svg').innerHTML = icons[value];
  }

  function syncTheme() {
    const value = currentTheme();
    syncControl(appearance, value, 'dark', value === 'dark' ? 'ライトに切り替え' : 'ダークに切り替え');
  }

  function setTheme(value) {
    write('appearance', value);
    document.documentElement.classList.toggle('dark', value === 'dark');
    syncTheme();
    onThemeChange?.();
  }

  function setBasemap(value) {
    selectedBasemap = canSatellite ? value : 'map';
    if (basemap) {
      syncControl(basemap, selectedBasemap, 'satellite',
        selectedBasemap === 'satellite' ? '通常地図に切り替え' : '衛星写真に切り替え');
    }
    onBasemapChange(selectedBasemap);
  }

  function storage(event) {
    if (event.key === 'appearance') {
      const preference = read('appearance');
      document.documentElement.classList.toggle('dark',
        preference === 'dark' || preference === null && matchMedia('(prefers-color-scheme: dark)').matches);
      syncTheme();
      onThemeChange?.();
    } else if (event.key === 'presence-basemap' && canSatellite) {
      setBasemap(preferredBasemap());
    }
  }

  function select(label, options, change) {
    const control = document.createElement('select');
    control.setAttribute('aria-label', label);
    control.title = label;
    for (const [value, text] of options) {
      control.append(Object.assign(document.createElement('option'), {value, textContent: text}));
    }
    control.onchange = () => change(control.value);
    node.append(control);
    return control;
  }

  function button(label, click) {
    const control = document.createElement('button');
    control.type = 'button';
    control.setAttribute('aria-label', label);
    control.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg>';
    control.onclick = click;
    node.append(control);
    return control;
  }

  function chooseBasemap(value) {
    write('presence-basemap', value);
    setBasemap(value);
  }

  return {
    onAdd() {
      node = document.createElement('div');
      node.className = 'maplibregl-ctrl tt-map-settings';
      if (iconButtons) {
        node.classList.add('tt-map-settings--icons');
        if (canSatellite) {
          basemap = button('衛星写真', () => chooseBasemap(selectedBasemap === 'satellite' ? 'map' : 'satellite'));
        }
        appearance = button('ダーク表示', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
      } else {
        basemap = select('背景地図', [['map', '通常地図'], ...(canSatellite ? [['satellite', '衛星写真']] : [])], chooseBasemap);
        appearance = select('配色', [['light', 'ライト'], ['dark', 'ダーク']], setTheme);
      }
      if (basemap) syncControl(basemap, selectedBasemap, 'satellite',
        selectedBasemap === 'satellite' ? '通常地図に切り替え' : '衛星写真に切り替え');
      syncTheme();
      observer = new MutationObserver(syncTheme);
      observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
      window.addEventListener('storage', storage);
      return node;
    },
    onRemove() {
      observer?.disconnect();
      window.removeEventListener('storage', storage);
      node?.remove();
    }
  };
}
