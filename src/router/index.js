import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import DrawGuess from "../views/DrawGuess.vue";
import Charades from "../views/Charades.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/draw-guess",
    name: "DrawGuess",
    component: DrawGuess
  },
  {
    path: "/charades",
    name: "Charades",
    component: Charades
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
