const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const root = path.resolve(__dirname, '..');

// Keep the calendar's existing utility classes without resetting the site theme.
const config = {
  content: [path.join(root, 'content/eventlist/index.html'), path.join(root, 'content/eventlist/script.js')],
  darkMode: 'class',
  important: '#schedule-page',
  corePlugins: { preflight: false },
};
const scopeDefaults = {
  postcssPlugin: 'scope-calendar-defaults',
  OnceExit(css) {
    css.walkRules(rule => {
      if (rule.selector === '*, ::before, ::after') {
        rule.selector = '#schedule-page, #schedule-page *, #schedule-page ::before, #schedule-page ::after';
      } else if (rule.selector === '::backdrop') {
        rule.selector = '#schedule-page ::backdrop';
      }
    });
  },
};
postcss([tailwindcss(config), scopeDefaults])
  .process('@tailwind base;\n@tailwind utilities;', { from: undefined })
  .then(result => fs.writeFileSync(path.join(root, 'content/eventlist/utilities.css'), result.css + '\n'))
  .catch(error => { console.error(error); process.exitCode = 1; });
