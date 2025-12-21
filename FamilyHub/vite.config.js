import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 80,
    host: '0.0.0.0',
    open: true
  },
  plugins: [
    vue(),
    Components({
      resolvers: [VantResolver()],
    }),
  ],
})
