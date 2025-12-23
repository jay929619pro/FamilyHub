<script setup>
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <div class="h-screen flex flex-col items-center justify-center bg-purple-50">
    <var-app-bar title="你比我猜" color="#8b5cf6" :safe-area-top="true">
      <template #left>
        <var-button round text color="transparent" text-color="#fff" @click="router.back()">
          <var-icon name="chevron-left" size="24" />
        </var-button>
      </template>
    </var-app-bar>

    <div class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <var-icon name="hammer" size="64" color="#ddd" class="mb-4" />
      <h2 class="text-xl font-bold text-gray-400">正在施工中...</h2>
      <p class="text-gray-400 mt-2 text-sm">敬请期待下一个家庭欢乐时刻！</p>
    </div>
  </div>
</template>
