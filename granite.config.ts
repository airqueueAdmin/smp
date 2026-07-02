import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'summer-ping',
  brand: {
    displayName: 'Summer Ping',
    primaryColor: '#1b64da',
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [{ name: 'camera', access: 'access' }],
  outdir: 'dist',
})
