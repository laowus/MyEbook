import chardet from "chardet";
import iconv from "iconv-lite";
import { invoke } from "@tauri-apps/api/core";
import { writeFile, mkdir, exists, remove } from "@tauri-apps/plugin-fs";
import { join, dirname, appDataDir } from "@tauri-apps/api/path";

// 定义一个函数来提取 HTML 字符串中的纯文本
export const getTextFromHTML = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  return doc.body.textContent || "";
};

export const readTxtFile = async (file) => {
  try {
    const arrayBuffer = await new Response(file).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedEncoding = chardet.detect(buffer) || "utf8";
    return iconv.decode(buffer, detectedEncoding);
  } catch (err) {
    console.log(err);
    throw new Error(`读取文件 ${file} 时出错: ${err.message}`);
  }
};
/**
 * 获取图片的base64编码格式
 * @param {*} path 图片路径
 * @returns base64编码的图片数据
 */
export const loadImage = async (path) => {
  console.log("加载图片:", path);
  try {
    const imageData = await invoke("read_image", {
      path: path,
    });
    return `data:image/jpeg;base64,${imageData}`;
  } catch (error) {
    console.error("加载图片失败:", error);
  }
};
/**
 * 保存base64图片为jpg文件到指定目录
 * @param {*} base64Data base64编码的图片数据
 * @param {*} savePath 保存路径
 */
export const saveBase64AsJpg = async (base64Data, savePath) => {
  try {
    const directoryPath = await dirname(savePath);
    // 检查目录是否存在，不存在则创建
    if (!(await exists(directoryPath))) {
      await mkdir(directoryPath, { recursive: true });
    }
    // 提取目录路径
    const fileExists = await exists(savePath);
    if (fileExists) {
      await remove(savePath);
    }

    if (base64Data && base64Data.includes(",")) {
      const fileBuffer = Buffer.from(base64Data.split(",")[1], "base64");
      await writeFile(savePath, fileBuffer);
      console.log(`图片已成功保存到: ${savePath}`);
    } else {
      console.warn("Invalid or missing cover data");
    }
  } catch (error) {
    console.error("保存图片时出错:", error);
    throw new Error(`保存图片失败: ${error.message}`);
  }
};
/**
 * 保存封面图片到应用数据目录下的covers目录中
 * @param {*} base64Data base64编码的图片数据
 * @param {*} bookId 书籍id
 */
export const saveCoverImage = async (base64Data, bookId) => {
  try {
    const appDataPath = await appDataDir();
    const coversDir = await join(appDataPath, "covers");
    const coverPath = await join(coversDir, `${bookId}.jpg`);
    await saveBase64AsJpg(base64Data, coverPath);
  } catch (error) {
    console.error("保存封面图片时出错:", error);
    throw error;
  }
};
