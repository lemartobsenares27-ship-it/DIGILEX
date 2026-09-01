import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Two independent apps ship from this repo:
//   index.html         -> Digilex Financial Control Center
//   jnt-vip/index.html -> J&T VIP Reconciliation (separate app, separate database)
// They share components and utilities but nothing at runtime.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        jntvip: resolve(__dirname, 'jnt-vip/index.html'),
      },
    },
  },
})
