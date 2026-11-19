import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 40 },
            { name: 'vendor-flow', test: /node_modules[\\/](@xyflow|d3-|zustand|use-sync-external-store)[\\/]/, priority: 30 },
            { name: 'vendor-zod', test: /node_modules[\\/]zod[\\/]/, priority: 25 },
            { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
});
