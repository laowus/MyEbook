import { makeBook } from "./view.js";
import { storeToRefs } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { useBookStore } from "../store/bookStore.js";
import EventBus from "../common/EventBus";
import { saveCoverImage } from "../common/utils.js";

import {
  configure,
  ZipReader,
  Uint8ArrayWriter,
  BlobReader,
} from "@zip.js/zip.js";
import { join, appDataDir, basename } from "@tauri-apps/api/path";
import { exists, remove, writeFile, mkdir } from "@tauri-apps/plugin-fs";
const appDataPath = await appDataDir();
const coversDir = await join(appDataPath, "covers");
const epubDir = await join(appDataPath, "epub");

const generateCustomShortId = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 8);
  return timestamp + random;
};

// 调用libs/vendor/zip.js 解压epub文件
const unzipEpub = async (file, extractPath) => {
  console.log("开始解压epub文件:", file, extractPath);
  return new Promise(async (resolve, reject) => {
    // 创建图片目录
    const imagesDir = await join(extractPath, "images");
    try {
      await mkdir(imagesDir, { recursive: true });
    } catch (error) {
      console.warn("Images directory might already exist:", error);
    }

    try {
      configure({ useWebWorkers: false });
      const reader = new ZipReader(new BlobReader(file));
      const zipEntries = await reader.getEntries();
      // 存储原始图片路径和重命名后的路径的映射
      const imageMap = new Map();
      zipEntries.forEach(async (entry) => {
        // 检查是否为图片文件
        const ext = entry.filename.split(".").pop();
        const imageExtensions = [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "bmp",
          "webp",
          "svg",
        ];
        if (imageExtensions.includes(ext)) {
          // 生成唯一的文件名，避免冲突
          const uniqueName = `${generateCustomShortId()}.${ext}`;
          const targetPath = await join(imagesDir, uniqueName);
          await entry
            .getData(new Uint8ArrayWriter())
            .then(async (uint8Array) => {
              if (uint8Array.length > 0) {
                await writeFile(targetPath, uint8Array);
                // 记录原始路径和新路径的映射
                imageMap.set(entry.filename, "images/" + uniqueName);
              }
            });
        }
      });
      resolve({ extractPath, imageMap });
    } catch (error) {
      reject(error);
    }
  });
};

const handleEpubAndInsertChapter = async (file, bookId, book) => {
  let imageMap = null;
  if (file && file.name.split(".").pop() === "epub") {
    try {
      const curEpubDir = await join(epubDir, `${bookId}`);
      const result = await unzipEpub(file, curEpubDir);
      imageMap = result.imageMap;
    } catch (error) {
      console.error("解压EPUB文件时出错:", error);
      throw error;
    }
  }
  await insertChapter(book, bookId, imageMap);
  EventBus.emit("hideTip");
};

export const openFile = async (file) => {
  const { setToc, setMetaData, setFirst } = useBookStore();
  const { metaData, isFirst, toc } = storeToRefs(useBookStore());

  return new Promise(async (resolve, reject) => {
    try {
      const book = await makeBook(file);
      console.log(book);
      if (isFirst.value) {
        //插入书籍
        let _metaData = {
          title: book.metadata.title || "未命名",
          author: book.metadata.author.name || "佚名",
          description: book.metadata.description || "暂缺",
          toc: "",
        };
        const res = await invoke("add_book", _metaData);
        if (res.success) {
          const bookId = res.data.id;
          setMetaData({ ..._metaData, bookId: bookId });
          if (book.metadata.cover) {
            await saveCoverImage(book.metadata.cover, bookId);
          }
          await handleEpubAndInsertChapter(file, bookId, book);
          resolve();
        } else {
          reject(new Error("添加书籍到数据库中失败"));
        }
      } else {
        const bookId = metaData.value.bookId;
        await handleEpubAndInsertChapter(file, bookId, book);
        resolve();
      }
    } catch (error) {
      reject(error);
      console.error("处理书籍时出错:", error);
    }
  });
};

const insertChapter = async (book, bookId, imageMap = null) => {
  const insertTocItem = async (item, parentid = null) => {
    //获取章节内容
    const res = await book.resolveHref(item.href);
    const doc = await book.sections[res.index].createDocument();
    // 调用修改后的getTextFromHTML函数，传入imageMap
    const str = getTextFromHTML(doc.documentElement.outerHTML, imageMap);
    await new Promise((resolve, reject) => {
      const successListener = (res) => {
        item.href = res.data;
        resolve(res);
      };
      EventBus.on("addChapterRes", successListener);
      const chapterData = {
        label: item.label,
        href: item.href,
        content: str,
        bookId: bookId,
      };
      EventBus.emit("addChapter", {
        href: parentid,
        chapter: chapterData,
      });
    });

    if (item.subitems) {
      parentid = item.href;
      for (const subitem of item.subitems) {
        await insertTocItem(subitem, parentid);
      }
    }
  };

  for (const [index, tocItem] of book.toc.entries()) {
    iCTip(
      "导入 " + tocItem.label + " (" + (index + 1) + "/" + book.toc.length + ")"
    );
    await insertTocItem(tocItem, null);
  }
};
const iCTip = (text) => {
  EventBus.emit("showTip", text);
};
const getTextFromHTML = (htmlString, imageMap = null) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  // 定义需要保留的格式标签
  const preserveTags = [
    "B",
    "STRONG", // 加粗
    "I",
    "EM", // 斜体
    "U", // 下划线
    "BR",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6", // 结构标签
    "UL",
    "OL",
    "LI", // 列表
    "IMG", // 图片（已保留）
  ];

  // 递归处理节点，保留指定的标签和图片
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    } else if (node.nodeName === "IMG") {
      // 获取原始src属性
      let src = node.getAttribute("src");
      if (src && imageMap && imageMap.size > 0) {
        // 查找对应的新路径
        // 由于路径格式可能不同，我们需要进行模糊匹配
        let found = false;
        for (let [originalPath, newPath] of imageMap.entries()) {
          // 使用最后一个分隔符分割路径
          const separator = process.platform === "win32" ? "\\" : "/";
          const parts = originalPath.split(separator);
          const fileName = parts[parts.length - 1];
          const bn = fileName;
          if (src.includes(bn)) {
            node.setAttribute("src", newPath);
            found = true;
            break;
          }
        }
        if (!found) {
          console.log(`未找到匹配的图片路径: ${src}`);
        }
      }
      // 不再直接返回outerHTML，而是手动构建带自闭合符号的标签
      let imgHtml = `<img`;
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        imgHtml += ` ${attr.name}="${attr.value}"`;
      }
      imgHtml += ` />`;
      return imgHtml;
    } else if (node.nodeName === "BR") {
      return "\n";
    } else if (node.nodeName === "P") {
      // 处理p标签：替换为换行符
      let result = "\n";
      for (let child of node.childNodes) {
        result += processNode(child);
      }
      result += "\n";
      return result;
    } else if (node.nodeName === "DIV") {
      // 处理div标签：去掉标签但保留内容
      let result = "";
      for (let child of node.childNodes) {
        result += processNode(child);
      }
      return result;
    } else if (preserveTags.includes(node.nodeName)) {
      // 对于其他需要保留的格式标签，保留标签结构
      let result = `<${node.nodeName.toLowerCase()}`;

      // 保留所有属性
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        // 跳过已经处理过的src属性
        if (!(node.nodeName === "IMG" && attr.name === "src")) {
          result += ` ${attr.name}="${attr.value}"`;
        }
      }

      result += ">";

      // 处理子节点
      for (let child of node.childNodes) {
        result += processNode(child);
      }

      // 添加结束标签
      if (!["BR"].includes(node.nodeName)) {
        result += `</${node.nodeName.toLowerCase()}>`;
      }

      return result;
    } else {
      let result = "";
      // 遍历子节点
      for (let child of node.childNodes) {
        result += processNode(child);
      }
      return result;
    }
  }

  return processNode(doc.body) || "";
};
