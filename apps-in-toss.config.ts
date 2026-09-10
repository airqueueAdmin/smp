import { defineConfig } from '@apps-in-toss/web-framework/config'

export default defineConfig({
  appName: 'summer-ping',
  brand: {
    primaryColor: '#6f3a3f',
  },
  webView: {
    pullToRefreshEnabled: false,
    overScrollMode: 'never',
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
    withTitle: true,
  },
  permissions: [
    { name: 'camera', access: 'access' },
    { name: 'photos', access: 'read' },
  ],
  webBundleDir: 'dist',
})
