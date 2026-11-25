import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import JavaScriptObfuscator from 'javascript-obfuscator';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/** The built-in cards and the helpers they run while loading: everything that holds card text. */
const CARD_DATA_MODULES = /[\/]src[\/](data[\/](cards|expansionCards)|utils[\/](positionStarMigration|cardFrames))\.ts$/;
/** Libraries change far less often than the game, so they get a file browsers can keep. */
const VENDOR_MODULES = /[\/]node_modules[\/](react|react-dom|scheduler|motion|motion-dom|motion-utils|framer-motion)[\/]/;
const CARD_DATA_CHUNK = 'card-data';

/**
 * Scrambles the card copy so it cannot be read straight from the page source. Only the
 * chunk with the card data goes through it: scrambled code runs several times slower,
 * and doing it to React and motion made every tap wait 0.1 s and more.
 */
const obfuscateCardData = (): Plugin => ({
  name: 'obfuscate-card-data',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const chunk = Object.values(bundle).find((item) => item.type === 'chunk' && item.name === CARD_DATA_CHUNK);
    // A renamed file must not quietly ship readable cards.
    if (chunk?.type !== 'chunk') this.error(`Chunk "${CARD_DATA_CHUNK}" is missing: the card data would ship unobfuscated.`);
    else {
      chunk.code = JavaScriptObfuscator.obfuscate(chunk.code, {
        compact: true,
        sourceType: 'module',
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayRotate: true,
        stringArrayThreshold: 1,
        selfDefending: false,
        controlFlowFlattening: false,
        deadCodeInjection: false,
      }).getObfuscatedCode();
    }
  },
});

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      obfuscateCardData(),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (CARD_DATA_MODULES.test(id)) return CARD_DATA_CHUNK;
            return VENDOR_MODULES.test(id) ? 'vendor' : undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled in constrained development environments.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
