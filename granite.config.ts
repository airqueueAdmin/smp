import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'summer-ping',
  brand: {
    displayName: '썸머핑',
    primaryColor: '#1b64da',
    icon: 'https://static.toss.im/appsintoss/55493/71db40ed-66b3-4fba-ab49-81c33fa423e0.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  webViewProps: {
    type: 'partner',
    pullToRefreshEnabled: false,
    overScrollMode: 'never',
  },
  permissions: [{ name: 'camera', access: 'access' }],
  outdir: 'dist',
})
