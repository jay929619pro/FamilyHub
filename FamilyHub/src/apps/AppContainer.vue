<template>
  <div class="relative w-full h-screen overflow-hidden bg-family-warm">
    <GlobalHeader />

    <main class="w-full h-full pt-16">
      <router-view v-slot="{ Component }">
        <transition
          @before-enter="onBeforeEnter"
          @enter="onEnter"
          @leave="onLeave"
          mode="out-in"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { gsap } from "gsap";
import GlobalHeader from "../components/GlobalHeader.vue";

// GSAP Transitions
const onBeforeEnter = (el) => {
  gsap.set(el, { opacity: 0, y: 20 });
};

const onEnter = (el, done) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 0.4,
    ease: "power2.out",
    onComplete: done,
  });
};

const onLeave = (el, done) => {
  gsap.to(el, {
    opacity: 0,
    y: -20,
    duration: 0.3,
    ease: "power2.in",
    onComplete: done,
  });
};
</script>
