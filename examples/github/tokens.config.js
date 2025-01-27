import pluginCSS from '@cobalt-ui/plugin-css';
import pluginSass from '@cobalt-ui/plugin-sass';
import pluginJSON from '@cobalt-ui/plugin-json';
import pluginTS from '@cobalt-ui/plugin-ts';

/** @type import('@cobalt-ui/core').Config */
export default {
  plugins: [
    pluginCSS({
      modeSelectors: {
        'color#light': ['[data-color-theme="light"]'],
        'color#light_colorblind': ['[data-color-theme="light-colorblind"]'],
        'color#light_low_contrast': ['[data-color-theme="light-low-contrast"]'],
        'font.size#desktop': ['@media (min-width: 600px)'],
      },
    }),
    pluginSass(),
    pluginJSON(),
    pluginTS(),
  ],
};
