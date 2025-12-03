<script setup>
import { invoke } from "@tauri-apps/api/core";
import { toRaw, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { createTOCView } from "./libs/ui/tree.js";
import EventBus from "./common/EventBus";
import Header from "./components/Header.vue";
import TxtEditor from "./components/TxtEditor.vue";
import Popovers from "./components/Popovers.vue";
import { useAppStore } from "./store/appStore";
import { useBookStore } from "./store/bookStore";

const { addTocByHref, moveToc } = useBookStore();
const { curChapter, metaData, toc } = storeToRefs(useBookStore());
const { hideEditView, hideCtxMenu } = useAppStore();

let tocView;
const updateTocView = (curhref) => {
  const _book = {
    id: metaData.value.bookId,
    toc: toRaw(toc.value),
  };
  invoke("update_toc", { id: _book.id, toc: JSON.stringify(_book.toc) });
  tocView = null;
  tocView = createTOCView(
    toc.value,
    (href) => {
      updateCurChapter(href);
    },
    (href, event) => {
      updateCurChapter(href);
      showContextMenu(event, href);
    },
    (fromHref, toHref) => {
      onDrop(fromHref, toHref);
    }
  );
  const tocViewElement = window.$("#toc-view");
  tocViewElement.innerHTML = "";
  tocViewElement.append(tocView.element);
  tocView.setCurrentHref(curhref);
  updateCurChapter(curhref);
};

const onDrop = (fromHref, toHref) => {
  moveToc(fromHref, toHref);
};
const showContextMenu = (event, href) => {
  event.preventDefault();
  setTimeout(() => {
    //初始化菜单数据
    EventBus.emit("commonCtxMenu-init", 0);
    //显示菜单
    EventBus.emit("commonCtxMenu-show", event);
  }, 99);
};
const updateCurChapter = (href) => {
  invoke("get_chapter", {
    id: String(href),
  }).then((res) => {
    if (res.success) {
      curChapter.value = res.data[0];
      tocView.setCurrentHref(href);
    } else {
      console.log("获取章节失败", res.message);
    }
  });
};

EventBus.on("addChapter", (res) => {
  addTocByHref(res.href, res.chapter); //添加到数据库
});

EventBus.on("updateToc", (href) => {
  if (href) {
    updateTocView(href);
  } else {
    //清空目录视图
    const tocViewElement = window.$("#toc-view");
    tocViewElement.innerHTML = "";
  }
});

onMounted(() => {
  document.addEventListener("click", (event) => {
    // 若点击源不是 Popovers 组件，隐藏菜单和编辑视图
    if (!event.target.closest("#popovers")) {
      hideCtxMenu();
      hideEditView();
    }
  });
});
</script>

<template>
  <div>
    <Popovers @click.stop></Popovers>
    <Header></Header>
    <div class="content">
      <div id="leftMenu">
        <div id="side-bar-header">
          <img id="side-bar-cover" />
          <div>
            <h1 id="side-bar-title"></h1>
            <p id="side-bar-author"></p>
          </div>
        </div>
        <div id="toc-view"></div>
      </div>
      <TxtEditor />
    </div>
  </div>
</template>

<style>
html {
  height: 100%;
}

body {
  margin: 0 auto;
  height: 100%;
  font: menu;
  font-family: system-ui, sans-serif;
}
.content {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100vh - 120px);
  background-color: #add8e6;
  box-sizing: border-box !important;
}
.footbar {
  height: 20px;
  width: 100%;
  background-color: #87ceeb;
  text-align: left;
  line-height: 20px;
}

#leftMenu {
  width: 200px;
  height: 100%;
  background-color: #f0f0f0;
  border-right: 1px solid #add8e6;
  overflow-y: auto;
  overflow-x: hidden;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#leftMenu div {
  padding: 0;
  cursor: pointer;
  transition: all 0.3s ease;
  text-overflow: ellipsis;
}

#side-bar-header {
  padding: 1rem;
  display: flex;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  align-items: center;
  padding: 5px;
}

#side-bar-cover {
  height: 10vh;
  min-height: 60px;
  max-height: 180px;
  border-radius: 3px;
  border: 0;
  background: lightgray;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.1), 0 0 16px rgba(0, 0, 0, 0.1);
  margin-inline-end: 1rem;
}

#side-bar-cover:not([src]) {
  display: none;
}

#side-bar-title {
  margin: 0.5rem 0;
  font-size: inherit;
}

#side-bar-author {
  margin: 0.5rem 0;
  font-size: small;
  color: GrayText;
}

#toc-view {
  padding: 0.5rem;
  overflow-y: scroll;
}

#toc-view li,
#toc-view ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

#toc-view a,
#toc-view span {
  display: block;
  border-radius: 6px;
  padding: 8px;
  margin: 2px 0;
}

#toc-view a {
  color: CanvasText;
  text-decoration: none;
}

#toc-view a:hover {
  background: #ccc;
}

#toc-view span {
  color: GrayText;
}

#toc-view svg {
  margin-inline-start: -24px;
  padding-inline-start: 5px;
  padding-inline-end: 6px;
  fill: CanvasText;
  cursor: default;
  transition: transform 0.2s ease;
  opacity: 0.5;
}

#toc-view svg:hover {
  opacity: 1;
}

#toc-view [aria-current] {
  font-weight: bold;
  background: #ccc;
}

#toc-view [aria-expanded="false"] svg {
  transform: rotate(-90deg);
}

#toc-view [aria-expanded="false"] + [role="group"] {
  display: none;
}
</style>
