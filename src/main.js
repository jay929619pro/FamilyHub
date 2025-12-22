import { createApp } from "vue";
import { createPinia } from "pinia";
import Varlet from "@varlet/ui";

import "./style.css";
import "@varlet/ui/es/style";

import App from "./App.vue";

const app = createApp(App);

app.use(createPinia());
app.use(Varlet);

app.mount("#app");
