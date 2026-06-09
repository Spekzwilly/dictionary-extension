import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Dictionary',
    description: 'Look up English words while reading and save them to your vocab bank.',
    permissions: ['storage', 'activeTab', 'identity'],
    host_permissions: ['*://*/*'],
    oauth2: {
      client_id: '972529476069-g3278atkm9miijauqpv4p8a9vpuvll12.apps.googleusercontent.com',
      scopes: ['openid', 'email', 'profile'],
    },
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    action: {
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
    },
  },
})
