<script setup>
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { join, appDataDir } from "@tauri-apps/api/path";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { relaunch } from "@tauri-apps/plugin-process";
import { ref, reactive, onMounted, toRaw, nextTick } from "vue";
import { storeToRefs } from "pinia";
import * as OpenCC from "opencc-js";
import WindowCtr from "./WindowCtr.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import EventBus from "../common/EventBus";
import { openFile } from "../libs/parseBook.js";
import { getChapters } from "../common/funs.js";
import { createEpub, createTxt, createHtml } from "../common/createFile.js";
import { readTxtFile, getTextFromHTML } from "../common/utils";
import { useBookStore } from "../store/bookStore";
import { useAppStore } from "../store/appStore";

const { curChapter, metaData, isFirst, toc, isAllEdit, isTitleIn } =
  storeToRefs(useBookStore());
const { setMetaData, setFirst, setIsAllEdit, setTitleIn, setToc } =
  useBookStore();
const {
  showHistoryView,
  showNewBook,
  showAbout,
  showFileList,
  setFileListData,
} = useAppStore();

const { fileListData, fileListShow, pre, after, settingShow } = storeToRefs(
  useAppStore()
);

const curIndex = ref(1);
const indentNum = ref(2);
const changeTab = (index) => {
  curIndex.value = index;
};

const isfang = ref(false);

const reg = reactive({
  pre: pre.value,
  aft: after.value,
  selected: [0, 0],
});
const strNum = ref(20);
const initDom = () => {
  $("#add-file").addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      // 将FileList转换为数组以便操作
      const files = Array.from(e.target.files);
      // 如果只选择了一个文件，直接导入
      if (files.length === 1) {
        addFile(files[0]);
      } else if (files.length > 1) {
        // 如果选择了多个文件，显示排序对话框
        setFileListData(files);
        showFileList(true);
      }
      e.target.value = "";
    } else {
      console.log("用户未选择文件");
    }
  });

  $("#add-file-btn").addEventListener("click", () => $("#add-file").click());
};

const addFile = (newFile) => {
  addFileAsync(newFile).catch((err) => console.error("添加文件失败:", err));
};

const addFileAsync = async (newFile) => {
  const ext = newFile.name.split(".").pop();
  if (ext === "txt" || ext === "html") {
    let fileStr = "";
    const data = await readTxtFile(newFile);
    fileStr = ext === "html" ? getTextFromHTML(data) : data;

    if (isFirst.value) {
      const meta = {
        title: newFile.name.split(".")[0],
        author: "Unknown",
        description: "Unknown",
        toc: "",
      };
      const res = await invoke("add_book", meta);
      meta.bookId = res.data.id;
      setMetaData(meta);
      const chapter = {
        bookId: metaData.value.bookId,
        label: metaData.value.title,
        href: `OPS/chapter-${Date.now()}`,
        content: fileStr,
      };

      // 等待章节添加完成
      await new Promise((resolve) => {
        const successListener = () => {
          EventBus.off("addChapterRes", successListener);
          resolve();
        };
        EventBus.on("addChapterRes", successListener);
        EventBus.emit("addChapter", { href: null, chapter: chapter });
      });

      setFirst(false);
    } else {
      const chapter = {
        bookId: metaData.value.bookId,
        label: newFile.name.split(".")[0],
        href: `OPS/chapter-${Date.now()}`,
        content: fileStr,
      };

      // 等待章节添加完成
      await new Promise((resolve) => {
        const successListener = () => {
          EventBus.off("addChapterRes", successListener);
          resolve();
        };
        EventBus.on("addChapterRes", successListener);
        EventBus.emit("addChapter", { href: null, chapter: chapter });
      });
    }
  } else if (ext === "epub" || ext === "mobi") {
    const res = await openFile(newFile);
    console.log(" 02 open", res);
  }
};

onMounted(() => {
  initDom();
  initPreAfter();
});

const initPreAfter = () => {
  EventBus.on("updatePreAfter", () => {
    console.log("更新 reg", pre.value, after.value);
    // 直接更新响应式对象的属性
    reg.pre.length = 0;
    reg.pre.push(...pre.value);
    
    reg.aft.length = 0;
    reg.aft.push(...after.value);
    
    // 重置选中状态
    reg.selected = [0, 0];
    
    // 等待 DOM 更新后重新设置 select 的选中值
    nextTick(() => {
      const preSelect = document.getElementById('pre');
      const aftSelect = document.getElementById('aft');
      if (preSelect) preSelect.selectedIndex = 0;
      if (aftSelect) aftSelect.selectedIndex = 0;
      console.log("select 更新完成");
    });
  });
};

const restart = () => {
  ElMessageBox.confirm("确定要重启应用吗？", "重启应用", {
    confirmButtonText: "重启",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      relaunch();
    })
    .catch(() => {
      ElMessage({
        type: "info",
        message: "已取消重启",
      });
    });
};

const updateChapter = async (chapter) => {
  // 按换行符分割字符串
  await invoke("update_chapter", chapter).then((res) => {
    if (res.success) {
      return;
    } else {
      throw new Error("数据库更新章节失败");
    }
  });
};
const iCTip = (text) => {
  EventBus.emit("showTip", text);
};

// 缩进
const indentFirstLine = async () => {
  if (curChapter.value.content) {
    const indentString = "    ".repeat(indentNum.value);
    console.log("空格", indentString, "空格");
    // 按换行符分割字符串
    const lines = curChapter.value.content
      .split("\n")
      .map((line) => line.trimStart());
    // 给每一行添加缩进
    const indentedLines = lines.map((line) => indentString + line);
    // 重新拼接字符串
    curChapter.value.content = indentedLines.join("\n");
  }
  //书籍全部章节内容去空行
  if (isAllEdit.value) {
    const res = await invoke("get_chapter_where", {
      whereStr: `bookId = ${metaData.value.bookId}`,
    });
    if (res.success) {
      for (const [index, chapter] of res.data.entries()) {
        const indentString = "    ".repeat(indentNum.value);
        // 按换行符分割字符串
        const lines = chapter.content
          .split("\n")
          .map((line) => line.trimStart());
        // 给每一行添加缩进
        const indentedLines = lines.map((line) => indentString + line);
        chapter.content = indentedLines.join("\n");
        iCTip(
          "处理 " +
            chapter.label +
            "  (" +
            (index + 1) +
            "/" +
            res.data.length +
            ")"
        );
        await updateChapter(chapter);
      }
      EventBus.emit("hideTip");
    }
  }
};
//删除空行
const deleteEmptyLines = async () => {
  if (curChapter.value.content) {
    // 按换行符分割字符串
    const lines = curChapter.value.content.split("\n");
    // 过滤掉空行
    const nonEmptyLines = lines.filter((line) => line.trim() !== "");
    // 重新拼接字符串
    curChapter.value.content = nonEmptyLines.join("\n");
  } //书籍全部章节内容去空行
  if (isAllEdit.value) {
    const res = await invoke("get_chapter_where", {
      whereStr: `bookId = ${metaData.value.bookId}`,
    });
    if (res.success) {
      for (const [index, chapter] of res.data.entries()) {
        const lines = chapter.content.split("\n");
        const nonEmptyLines = lines.filter((line) => line.trim() !== "");
        chapter.content = nonEmptyLines.join("\n");
        iCTip(
          "处理 " +
            chapter.label +
            "  (" +
            (index + 1) +
            "/" +
            res.data.length +
            ")"
        );
        await updateChapter(chapter);
      }
      EventBus.emit("hideTip");
    }
  }
};

//删除章名
const deleteTitle = async () => {
  //
  if (curChapter.value.content) {
    // 按换行符分割字符串
    const lines = curChapter.value.content.split("\n");
    // 过滤掉空行
    const tempTitle = lines[0].trim();
    if (tempTitle) {
      console.log("删除章名", tempTitle);
      if (tempTitle.includes(curChapter.value.label)) {
        // 删除第一行
        lines.shift();
        // 重新拼接字符串
        curChapter.value.content = lines.join("\n");
      }
    }
  }
  //批量删除全部章名
  if (isAllEdit.value) {
    const res = await invoke("get_chapter_where", {
      whereStr: `bookId = ${metaData.value.bookId}`,
    });
    if (res.success) {
      for (const [index, chapter] of res.data.entries()) {
        const lines = chapter.content.split("\n");
        const tempTitle = lines[0].trim();
        if (tempTitle) {
          if (tempTitle.includes(chapter.label)) {
            console.log("删除章名", tempTitle);
            lines.shift();
            chapter.content = lines.join("\n");
          }
        }
        iCTip(
          "处理 " +
            chapter.label +
            "  (" +
            (index + 1) +
            "/" +
            res.data.length +
            ")"
        );
        await updateChapter(chapter);
      }
      EventBus.emit("hideTip");
    }
  }
};

//添加章名
const addTitle = async () => {
  if (curChapter.value.content) {
    //判断第一行是否有章名
    const tempTitle = curChapter.value.content.split("\n")[0].trim();
    if (!tempTitle.includes(curChapter.value.label)) {
      // 按换行符分割字符串
      const lines = curChapter.value.content.split("\n");
      // 给第一行添加章名
      lines.unshift(curChapter.value.label);
      // 重新拼接字符串
      curChapter.value.content = lines.join("\n");
    }
  }
  //书籍全部章节内容去空行
  if (isAllEdit.value) {
    const res = await invoke("get_chapter_where", {
      whereStr: `bookId = ${metaData.value.bookId}`,
    });
    if (res.success) {
      for (const [index, chapter] of res.data.entries()) {
        //判断第一行是否有章名
        const tempTitle = chapter.content.split("\n")[0].trim();
        if (!tempTitle.includes(chapter.label)) {
          // 按换行符分割字符串
          const lines = chapter.content.split("\n");
          // 给第一行添加章名
          lines.unshift("<h3>" + chapter.label + "</h3>");
          // 重新拼接字符串
          chapter.content = lines.join("\n");
        }
        iCTip(
          "处理 " +
            chapter.label +
            "  (" +
            (index + 1) +
            "/" +
            res.data.length +
            ")"
        );
        await updateChapter(chapter);
      }
      EventBus.emit("hideTip");
    }
  }
};

const jianFanZhuanHuan = async () => {
  let converter = OpenCC.Converter(
    isfang.value ? { from: "cn", to: "hk" } : { from: "hk", to: "cn" }
  );

  if (curChapter.value.content) {
    curChapter.value.content = converter(curChapter.value.content);
    isfang.value = !isfang.value;
  }

  //章节标题转换
  if (isAllEdit.value) {
    const res = await invoke("get_chapter_where", {
      whereStr: `bookId = ${metaData.value.bookId}`,
    });
    if (res.success) {
      for (const [index, chapter] of res.data.entries()) {
        chapter.content = converter(chapter.content);
        chapter.label = converter(chapter.label);
        iCTip(
          "处理 " +
            chapter.label +
            "  (" +
            (index + 1) +
            "/" +
            res.data.length +
            ")"
        );
        await updateChapter(chapter);
      }
      // 深拷贝TOC对象以避免直接修改原数据
      const convertedToc = JSON.parse(JSON.stringify(toRaw(toc.value)));
      convertLabels(convertedToc, converter);
      setToc(convertedToc);
      const _metaData = JSON.parse(JSON.stringify(toRaw(metaData.value)));
      _metaData.title = converter(_metaData.title);
      _metaData.author = converter(_metaData.author);
      _metaData.description = converter(_metaData.description);
      setMetaData(_metaData);
      await invoke("update_book", {
        id: _metaData.bookId,
        title: _metaData.title,
        author: _metaData.author,
        description: _metaData.description,
      });
      EventBus.emit("hideTip");
      EventBus.emit("updateToc", curChapter.value.id);
    }
  }
};

// 递归转换函数
const convertLabels = (items, coverter) => {
  items.forEach((item) => {
    if (item.label) {
      item.label = coverter(item.label);
    }
    if (item.subitems && Array.isArray(item.subitems)) {
      convertLabels(item.subitems, coverter);
    }
  });
};

const regString = () => {
  const pre = $("#pre").value;
  const aft = $("#aft").value;
  const strNum = $("#strNum").value;
  let attach = $("#attach").value.trim();
  // 当 attach 不为空时才拼接正则部分
  const attachPart = attach ? `|^\\s*(${attach})` : "";
  // 动态构建章节匹配部分，处理pre和aft为空的情况
  // 动态构建章节匹配部分，处理pre和aft为空的情况
  let chapterMatchPart = "";
  if (pre && aft) {
    // 如果pre和aft都不为空
    chapterMatchPart = `([${pre}][一二三四五六七八九十百千万零0-9]+[${aft}])`;
  } else if (pre) {
    // 如果只有pre不为空
    chapterMatchPart = `([${pre}][一二三四五六七八九十百千万零0-9]+)`;
  } else if (aft) {
    // 如果只有aft不为空
    chapterMatchPart = `([一二三四五六七八九十百千万零0-9]+[${aft}])`;
  } else {
    // 如果pre和aft都为空
    chapterMatchPart = `([一二三四五六七八九十百千万零0-9]+)`;
  }

  // 动态拼接完整的正则表达式
  const regexPattern = `^\\s*(${chapterMatchPart}${attachPart})(.{0,${strNum}}[^\\n]?)?$`;
  const chapterRegex = new RegExp(regexPattern, "gm");

  //  保存当前章节的id和内容，用于更新当前章节 更新完后, 内容只留标题
  const tempChapter = {
    id: curChapter.value.id,
    content: curChapter.value.label,
    label: curChapter.value.label,
  };
  // 分割字符串
  const chapters = getChapters(
    curChapter.value.content,
    curChapter.value.label,
    chapterRegex,
    isTitleIn.value
  );
  if (!Array.isArray(chapters) || chapters.length === 0) {
    ElMessage.error("未匹配到章节，请检查正则表达式");
    return;
  }
  insertChapters(chapters, curChapter.value.id).then(() => {
    invoke("update_chapter", tempChapter).then((res) => {
      if (res.success) {
        console.log("更新当前章节成功");
      } else {
        ElMessage.error("更新当前章节失败");
      }
    });
  });
};

const insertChapters = async (chapters, id) => {
  const insertSingleChapter = (chapterData) => {
    return new Promise((resolve, reject) => {
      const successListener = (res) => {
        resolve(res);
      };
      EventBus.on("addChapterRes", successListener);
      EventBus.emit("addChapter", {
        href: id,
        chapter: chapterData,
      });
    });
  };

  for (const [index, chap] of chapters.entries()) {
    const chapter = {
      bookId: metaData.value.bookId,
      label: chap.label,
      href: `OPS/chapter-${Date.now()}`,
      content: chap.content,
    };
    iCTip(
      "导入 " + chap.label + "  (" + (index + 1) + "/" + chapters.length + ")"
    );
    //await 等待章节插入完成
    await insertSingleChapter(chapter);
  }
  EventBus.emit("hideTip");
};

/**
 * 清理文件名
 */
function sanitizeFilename(filename) {
  // 移除或替换文件名中的非法字符
  return filename.replace(/[<>:"/\|?*]/g, "_").trim() || "未命名";
}

const exportBookToEpub = async () => {
  try {
    // 1. 弹出保存对话框，获取用户选择的保存路径
    const defaultFileName = `${
      metaData.value.author || "佚名"
    } - ${sanitizeFilename(metaData.value.title || "未命名")}.epub`;

    const defaultPath = await join(await appDataDir(), defaultFileName);
    const selectedPath = await save({
      title: "保存 EPUB 文件",
      defaultPath: defaultPath,
      filters: [
        {
          name: "EPUB 文件",
          extensions: ["epub"],
        },
        {
          name: "所有文件",
          extensions: ["*"],
        },
      ],
    });

    // 2. 检查用户是否取消了保存
    if (!selectedPath) {
      console.log("用户取消了保存");
      return null;
    } else {
      // 创建 EPUB 文件
      createEpub(toRaw(metaData.value), toRaw(toc.value)).then(
        async (epubContent) => {
          // 3. 写入文件
          writeFile(selectedPath, epubContent)
            .then(() => {
              ElMessage.success(`EPUB 文件已生成: ${selectedPath}`);
            })
            .catch((err) => {
              console.error("写入 EPUB 文件失败:", err);
              ElMessage.error("生成 EPUB 文件失败");
            });
        }
      );
    }
  } catch (error) {
    console.error("打开选择文件对话框失败:", error);
  }
};

const txtToHtmlString = (txt, title) => {
  // 去除多余的空行
  const cleanTxt = txt.replace(/\n{3,}/g, "\n\n");

  // 将文本按换行符分割成行
  const lines = cleanTxt.split("\n");

  // 处理每一行：
  // 1. 跳过空行
  // 2. 转义空格
  // 3. 用 <p> 标签包裹每一行
  const htmlLines = lines
    .map((line) => {
      // 跳过空行
      if (!line.trim()) return "";

      // 转义空格：将连续空格替换为 &nbsp;
      const escapedLine = line.replace(/ {2,}/g, (match) => {
        return "&nbsp;".repeat(match.length);
      });

      // 用 <p> 标签包裹每一行
      return `<p>${escapedLine}</p>`;
    })
    .filter((line) => line !== ""); // 过滤掉空字符串

  // 合并所有带标签的行
  const bodyContent = htmlLines.join("");

  // 包裹完整的 HTML 结构
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 20px;
      color: #333;
    }
    p {
      margin: 8px 0;
      text-align: justify;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
};

const exportBookToHtml = async () => {
  try {
    const defaultFileName = `${
      metaData.value.author || "佚名"
    } -${sanitizeFilename(metaData.value.title || "未命名")}.html`;
    const defaultPath = await join(await appDataDir(), defaultFileName);
    const selectedPath = await save({
      title: "保存 HTML 文件",
      defaultPath: defaultPath,
      filters: [
        {
          name: "HTML 文件",
          extensions: ["html"],
        },
        {
          name: "所有文件",
          extensions: ["*"],
        },
      ],
    });
    if (!selectedPath) {
      console.log("用户取消了保存");
      return null;
    } else {
      // 创建 Html 文件
      createHtml(toc.value).then(async (txtContent) => {
        const htmlContent = txtToHtmlString(txtContent, metaData.value.title);
        // 3. 写入文件
        writeTextFile(selectedPath, htmlContent)
          .then(() => {
            ElMessage.success(`HTML 文件已生成: ${selectedPath}`);
          })
          .catch((err) => {
            console.error("写入 HTML 文件失败:", err);
            ElMessage.error("生成 HTML 文件失败");
          });
      });
    }
  } catch (error) {
    console.error("打开选择文件对话框失败:", error);
  }
};

const exportBookToTxt = async () => {
  try {
    const defaultFileName = `${
      metaData.value.author || "佚名"
    } - ${sanitizeFilename(metaData.value.title || "未命名")}.txt`;
    const defaultPath = await join(await appDataDir(), defaultFileName);
    const selectedPath = await save({
      title: "保存Txt文件",
      defaultPath: defaultPath,
      filters: [
        {
          name: "Txt 文件",
          extensions: ["txt"],
        },
        {
          name: "所有文件",
          extensions: ["*"],
        },
      ],
    });
    if (!selectedPath) {
      console.log("用户取消了保存");
      return null;
    } else {
      // 创建 Html 文件
      createTxt(toRaw(toc.value)).then(async (txtContent) => {
        // 3. 写入文件

        writeTextFile(selectedPath, txtContent)
          .then(() => {
            ElMessage.success(`Txt 文件已生成: ${selectedPath}`);
          })
          .catch((err) => {
            console.error("写入 Txt 文件失败:", err);
            ElMessage.error("生成 Txt 文件失败");
          });
      });
    }
  } catch (error) {
    console.error("打开选择文件对话框失败:", error);
  }
};

EventBus.on("addFiles", async () => {
  if (fileListData.value.length > 0) {
    console.log(fileListData.value);
    fileListShow.value = false;
    // 按顺序处理文件
    for (const file of fileListData.value) {
      await addFileAsync(file);
    }
    fileListData.value = null;
    ElMessage.success("文件导入成功");
  }
});
</script>
<template>
  <div class="header">
    <div class="tabs">
      <div class="tabnames">
        <div
          class="tabname"
          @click="changeTab(0)"
          :class="{ active: curIndex === 0 }"
        >
          开始
        </div>
        <div
          class="tabname"
          @click="changeTab(1)"
          :class="{ active: curIndex === 1 }"
        >
          导入
        </div>
        <div
          class="tabname"
          @click="changeTab(2)"
          :class="{ active: curIndex === 2 }"
        >
          编辑
        </div>
        <div
          class="tabname"
          @click="changeTab(3)"
          :class="{ active: curIndex === 3 }"
        >
          工具
        </div>
        <div
          class="tabname"
          @click="changeTab(4)"
          :class="{ active: curIndex === 4 }"
        >
          发布
        </div>
        <div
          class="tabname"
          @click="changeTab(5)"
          :class="{ active: curIndex === 5 }"
        >
          帮助
        </div>
        <div class="drag-tab"></div>

        <WindowCtr />
      </div>
      <div class="tabcontent">
        <div v-show="curIndex === 0">
          <button class="btn-icon" @click="showNewBook">
            <span class="iconfont icon-xinjian" style="color: green"></span>
            <span>新建</span>
          </button>
        </div>
        <div v-show="curIndex === 1">
          <input
            type="file"
            id="add-file"
            hidden
            accept=".txt,.html,.epub,.mobi,.azw3"
            multiple
          />
          <button class="btn-icon" id="add-file-btn">
            <span class="iconfont icon-Epub" style="color: green"></span>
            <span>导入文件</span>
          </button>
          <button class="btn-icon" @click="showHistoryView">
            <span class="iconfont icon-lishijilu" style="color: green"></span>
            <span>历史记录</span>
          </button>
          <button class="btn-icon" @click="restart">
            <span class="iconfont icon-zhongqi" style="color: red"></span>
            <span> 重 启 </span>
          </button>
        </div>
        <div v-show="curIndex === 2">
          <button
            class="btn-icon"
            @click="deleteEmptyLines"
            :disabled="!curChapter.bookId"
          >
            <span
              class="iconfont icon-shanchukonghang"
              style="color: red"
            ></span>
            <span>删除空行</span>
          </button>
          <select
            @change="indentNum = parseInt($event.target.value)"
            :value="indentNum"
          >
            <option v-for="index in [0, 1, 2, 3, 4, 5, 6]" :key="index">
              {{ index }}
            </option>
          </select>
          <button
            class="btn-icon"
            @click="indentFirstLine"
            :disabled="!curChapter.bookId"
          >
            <span
              class="iconfont icon-shouhangsuojin"
              style="color: green"
            ></span>
            <span>首行缩进</span>
          </button>

          <button
            class="btn-icon"
            @click="deleteTitle"
            :disabled="!curChapter.bookId"
          >
            <span
              class="iconfont icon-shanchukonghang"
              style="color: red"
            ></span>
            <span>删除章名</span>
          </button>

          <button
            class="btn-icon"
            @click="addTitle"
            :disabled="!curChapter.bookId"
          >
            <span class="iconfont icon-xinjian"></span>
            <span>添加章名</span>
          </button>
          <button
            class="btn-icon"
            @click="jianFanZhuanHuan"
            :disabled="!curChapter.bookId"
          >
            <span class="iconfont icon-jianfanzhuanhuan"></span>
            <span>简繁转换</span>
          </button>
          <button class="btn-icon" @click="setIsAllEdit">
            <span
              class="iconfont"
              :class="isAllEdit ? 'icon-gouxuananniu' : 'icon-gouxuananniu1'"
              style="color: green; font-size: 18px; padding-top: 8px"
            ></span>
            <span style="padding-top: 8px">应用全书</span>
          </button>
        </div>
        <div v-show="curIndex === 3">
          <div class="reg-string">
            <span>规则:</span>
            <select id="pre">
              <option v-for="(pr, index) in reg.pre">
                {{ pr }}
              </option>
            </select>
            <span>[数字]</span>
            <select id="aft">
              <option v-for="(af, index) in reg.aft">
                {{ af }}
              </option>
            </select>
            <span><</span>
            <input
              id="strNum"
              style="width: 30px; height: 20px; font-size: 12px"
              v-model="strNum"
            />
            <span>特别:</span>
            <input
              id="attach"
              style="width: 150px; height: 20px; font-size: 12px"
              placeholder="多个用|分开"
            />

            <button class="btn-icon" @click="setTitleIn">
              <span
                class="iconfont"
                :class="isTitleIn ? 'icon-gouxuananniu' : 'icon-gouxuananniu1'"
                style="color: green; font-size: 18px; padding-top: 8px"
              ></span>
              <span style="padding-top: 8px">保留章名</span>
            </button>
            <button
              class="btn-icon"
              @click="regString"
              :disabled="!curChapter.bookId"
            >
              <span class="iconfont icon-jianqie" style="color: green"></span>
              <span>开始分割</span>
            </button>

            <button
              class="btn-icon"
              @click="settingShow = true"
              :disabled="!curChapter.bookId"
            >
              <span class="iconfont icon-shezhi" style="color: green"></span>
              <span>设置</span>
            </button>
          </div>
        </div>
        <div v-show="curIndex === 4">
          <button
            class="btn-icon"
            @click="exportBookToEpub"
            :disabled="!curChapter.bookId"
          >
            <span class="iconfont icon-daochuexl" style="color: green"></span>
            <span>生成epub</span>
          </button>
          <button
            class="btn-icon"
            @click="exportBookToTxt"
            :disabled="!curChapter.bookId"
          >
            <span class="iconfont icon-daochutxt" style="color: green"></span>
            <span>生成txt</span>
          </button>
          <button
            class="btn-icon"
            @click="exportBookToHtml"
            :disabled="!curChapter.bookId"
          >
            <span class="iconfont icon-HTML" style="color: green"></span>
            <span>生成Html</span>
          </button>
        </div>
        <div v-show="curIndex === 5">
          <button class="btn-icon" @click="showAbout">
            <span class="iconfont icon-daochuexl" style="color: green"></span>
            <span>关于</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
.header {
  width: 100%;
  background-color: #f0f0f0;
  display: flex;
  flex-direction: row;
  border: 1px solid #add8e6;
  height: 100px;
}
.tabs {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.tabnames {
  width: 100%;
  display: flex;
  flex-direction: row;
  background-color: #87ceeb;
  padding-left: 10px;
  gap: 10px;
}

.tabname {
  font-size: 14px;
  width: 60px;
  height: 30px;
  align-items: center;
  justify-content: center;
  display: flex;
  cursor: pointer;
}
.tabname.active {
  background-color: white;
  border: 1px solid #87ceeb;
  /* 设置下边框颜色为白色 */
  border-bottom-color: white;
  border-radius: 10px 10px 0 0;
}

.drag-tab {
  flex: 1;
  user-select: none;
  -webkit-app-region: drag;
  -webkit-user-select: none;
}

.tabcontent div {
  padding-left: 5px;
  font-size: 12px;
  background-color: white;
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  background-color: #add8e6;
}
.btn-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: transparent;
  transition: background-color 0.3s ease;
  margin: 10px;
  font-size: 12px;
}
.btn-icon-row {
  flex-direction: row;
  border: 1px solid #87ceeb;
  border-radius: 5px;
  padding: 5px;
  background-color: #add8e6;
}

.btn-icon .iconfont {
  font-size: 2rem;
}

.btn-icon:hover {
  background-color: #ffffcc;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
} /* 添加按钮禁用状态样式 */
.btn-icon:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  /* 降低透明度，让按钮看起来变灰 */
}

.btn-icon:disabled .iconfont {
  color: #ccc;
  /* 禁用状态下图标颜色变灰 */
}

.btn-icon:disabled:hover {
  background-color: transparent;
  /* 禁用状态下鼠标悬停不改变背景色 */
  box-shadow: none;
  /* 禁用状态下鼠标悬停不显示阴影 */
}
</style>
