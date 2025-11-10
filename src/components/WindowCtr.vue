<script setup>
import { getCurrentWindow } from "@tauri-apps/api/window";

// 窗口控制函数
const minimizeApp = async () => {
  try {
    const window = getCurrentWindow();
    await window.minimize();
  } catch (error) {
    console.error("最小化失败:", error);
  }
};

const maximizeApp = async () => {
  try {
    const window = getCurrentWindow();
    const isMaximized = await window.isMaximized();
    if (isMaximized) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
  } catch (error) {
    console.error("最大化失败:", error);
  }
};

const closeApp = async () => {
  try {
    const window = getCurrentWindow();
    await window.close();
  } catch (error) {
    console.error("关闭失败:", error);
  }
};
</script>

<template>
  <div class="tool">
    <span class="iconfont icon-zuixiaohua" @click="minimizeApp"></span>
    <span class="iconfont icon-zuidahua_huaban1" @click="maximizeApp"></span>
    <span class="iconfont icon-guanbi" @click="closeApp"></span>
  </div>
</template>

<style>
.tool {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding-right: 20px;
  gap: 10px;
}
.tool span {
  font-size: 18px;
  padding: 5px;
}

.tool span:hover {
  font-size: 18px;
  cursor: pointer;
  background-color: antiquewhite;
}
</style>
