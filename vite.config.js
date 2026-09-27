import { defineConfig } from 'vite';

export default defineConfig({
  build: { chunkSizeWarningLimit: 1000 },
  // Pre-bundle three's add-ons so the dev server doesn't need a reload on first visit
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/geometries/RoundedBoxGeometry.js',
      'three/examples/jsm/postprocessing/EffectComposer.js',
      'three/examples/jsm/postprocessing/RenderPass.js',
      'three/examples/jsm/postprocessing/UnrealBloomPass.js',
      'three/examples/jsm/postprocessing/OutputPass.js',
    ],
  },
});
