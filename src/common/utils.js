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


/**
 * 将时间戳转换为正常可读的时间字符串
 * @param {number|string} timestamp - 时间戳，可以是秒级或毫秒级
 * @param {string} format - 时间格式，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (timestamp, format = 'YYYY-MM-DD HH:mm:ss') => {
  // 处理边界情况
  if (!timestamp && timestamp !== 0) {
    return '--';
  }
  
  // 确保timestamp是数字类型
  let ts = Number(timestamp);
  
  // 检查是否为秒级时间戳（长度通常为10位）
  if (String(timestamp).length === 10) {
    ts *= 1000; // 转换为毫秒级时间戳
  }
  
  try {
    const date = new Date(ts);
    
    // 获取各时间部分
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // 替换格式字符串中的占位符
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  } catch (error) {
    console.error('时间戳转换失败:', error);
    return '--';
  }
};