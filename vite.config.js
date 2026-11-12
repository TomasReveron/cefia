import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase-core',
              test: /[\\/]node_modules[\\/](@firebase[\\/](app|component|logger|util)|firebase[\\/]app|tslib)/,
              priority: 30,
            },
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 25,
            },
            {
              name: 'firebase-auth',
              test: /[\\/]node_modules[\\/](@firebase[\\/]auth|firebase[\\/]auth)[\\/]/,
              priority: 20,
            },
            {
              name: 'firebase-firestore',
              test: /[\\/]node_modules[\\/](@firebase[\\/](firestore|webchannel-wrapper)|firebase[\\/]firestore|idb)[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
})
