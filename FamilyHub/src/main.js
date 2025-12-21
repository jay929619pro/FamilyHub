import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css' // Tailwind & Global Styles
import App from './App.vue'
import router from './router'

// Vant styles are auto-imported by unplugin-vue-components for components,
// but we might want to ensure basic resets or base styles if Vant requires them.
// Typically Vant works fine with auto-import.

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
