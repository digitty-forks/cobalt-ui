import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [vue()],
  site: `https://drwpow.github.io`,
  base: '/cobalt-ui',
});
