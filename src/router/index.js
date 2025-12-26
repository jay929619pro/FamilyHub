import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import DrawGuess from "../views/DrawGuess.vue";
import Charades from "../views/Charades.vue";
import Sudoku from "../views/Sudoku.vue";

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
  },
  {
    path: "/sudoku",
    name: "Sudoku",
    component: Sudoku
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
