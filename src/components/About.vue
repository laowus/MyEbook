<script setup>
import { invoke } from "@tauri-apps/api/core";
import { save, open as openDialog } from "@tauri-apps/plugin-dialog";
import { appDataDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-shell";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../store/appStore";
import { ElMessage, ElMessageBox } from "element-plus";
const { aboutShow } = storeToRefs(useAppStore());
const tindex = ref(0);
let dataDir = "";

const tabs = ref(["软件介绍", "捐赠支持", "备份/恢复", "更新"]);
const tabContents = ref([
  `
  MyEbook（捡书） 是一个基于 Vue3 + Tauri 开发的跨平台电子书编辑器，支持 macOS、Windows、Linux 等操作系统。(本人只有Windows系统电脑, 其他没有平台测试。)

  功能：
      1、导入txt，epub，html，mobi等文件，进行编辑，然后导出生成epub/txt/html文件。
      2、导入的文本可以分割章节，前提是你的文本已经有章节的字符，譬如（第一章 ...  第二章 ...)这种文字,
         点击分割按钮就会进行分割成多段文字。
      3、可以对导入的文字进行简单编辑，譬如消除空行，段落首行缩进。

  开源地址：<button @click='openUrl'>https://github.com/laowus/MyEbook</button>
  如有问题可以以下方式进行联系：
      邮箱：pjhxl@qq.com
      Q Q：37156760
      QQ群：616712461
  `,
  `如果您喜欢
  MyEbook，请考虑通过捐赠来支持该项目。您的捐赠将帮助我维护和改进这个项目。`,
]);

// 应用信息
const appInfo = ref({ version: "", name: "" });
// 更新状态
const updateStatus = ref({
  available: false,
  version: "",
  body: "",
  downloading: false,
  update: null, // 存储更新对象
});
const message = ref("");

async function fetchAppInfo() {
  try {
    const info = await invoke("get_app_info");
    appInfo.value = info;
  } catch (error) {
    console.error("获取应用信息失败:", error);
  }
}

// 检查更新 - 使用后端API
async function checkUpdates() {
  try {
    message.value = "正在检查更新...";
    // 使用后端API
    const result = await invoke("check_for_updates");

    if (result.update_available) {
      updateStatus.value.available = true;
      updateStatus.value.version = result.new_version;
      updateStatus.value.body = result.body;
      message.value = `发现新版本: ${result.new_version}`;

      // 如果有调试信息，显示出来
      if (result.debug_message) {
        message.value += ` (${result.debug_message})`;
      }
    } else {
      message.value = "已是最新版本";
    }
  } catch (error) {
    console.error("检查更新错误:", error);
    message.value = `检查更新失败: ${error}`;
  }
}
// 下载并安装更新 - 使用原生API
async function downloadAndInstall() {
  try {
    message.value = "正在下载更新...";
    updateStatus.value.downloading = true;

    // 使用原生check方法获取更新对象
    const update = await check();

    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength;
          message.value = `开始下载 ${event.data.contentLength} 字节`;
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          const progress = Math.round((downloaded / contentLength) * 100);
          message.value = `下载进度: ${progress}% (${downloaded}/${contentLength} 字节)`;
          break;
        case "Finished":
          message.value = "下载完成，准备安装...";
          break;
      }
    });

    message.value = "更新下载完成，即将重启应用...";
    await relaunch();
  } catch (error) {
    console.error("下载安装更新错误:", error);
    message.value = `下载安装失败: ${error.message || error}`;
    updateStatus.value.downloading = false;
  }
}

// 切换标签的函数
const changeTab = (index) => {
  tindex.value = index;
};

onMounted(async () => {
  dataDir = await appDataDir();
  fetchAppInfo();
});

//把应用目录下面的所有文件都打包成一个zip文件
const backupData = async () => {
  try {
    // 1. 弹出保存对话框，获取用户选择的保存路径
    const timemap = new Date().getTime();
    const defaultFileName = `backup-${timemap}.zip`;

    const defaultPath = await join(await appDataDir(), defaultFileName);
    const selectedPath = await save({
      title: "保存 备份 文件",
      defaultPath: defaultPath,
      filters: [
        {
          name: "zip 文件",
          extensions: ["zip"],
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
      await invoke("zip_app_directory", { outputPath: selectedPath });
      ElMessage.success(`备份文件已生成: ${selectedPath}`);
    }
  } catch (error) {
    console.error("打开选择文件对话框失败:", error);
  }
};

const restoreData = async () => {
  const _appDataDir = await appDataDir();
  const selected = await openDialog({
    title: "选择备份文件",
    filters: [
      {
        name: "zip 文件",
        extensions: ["zip"],
      },
      {
        name: "所有文件",
        extensions: ["*"],
      },
    ],
    defaultPath: _appDataDir,
  });
  if (selected) {
    // 处理选中的文件
    console.log("选中的文件:", selected);
    // 先确认是否覆盖现有数据
    ElMessageBox.confirm("恢复数据将覆盖现有数据，确定要继续吗？", "恢复数据", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    })
      .then(async () => {
        //删除应用目录下面的所有文件
        await invoke("close_database").then(async (closeResult) => {
          if (closeResult.success) {
            try {
              await invoke("clear_app_data")
                .then(async () => {
                  try {
                    await invoke("unzip_file", {
                      zipFile: selected,
                      destDir: _appDataDir,
                    }).then(async () => {
                      //重启应用
                      ElMessage.success(`恢复数据成功: ${selected}`);
                      relaunch();
                    });
                    console.log("解压成功");
                  } catch (error) {
                    console.error("解压失败:", error);
                  }
                })
                .catch((error) => {
                  console.error("Error clearing app data:", error);
                });
            } catch (error) {
              showTip(`清除应用数据失败: ${error}`);
            }
          }
        });
      })
      .catch(() => {
        ElMessage({
          type: "info",
          message: "已取消恢复数据",
        });
      });
  } else {
    console.log("用户取消了选择");
  }
};

const openUrl = async () => {
  try {
    await open("https://github.com/laowus/MyEbook");
  } catch (error) {
    console.error("打开网页失败:", error);
    ElMessage.error("无法打开网页，请检查网络或浏览器设置");
  }
};

const openDataDir = async () => {
  try {
    await invoke("open_folder", { path: dataDir });
  } catch (error) {
    console.error("打开路径失败:", error);
  }
};
</script>
<template>
  <el-dialog v-model="aboutShow" title="关于" width="70%">
    <div class="about-container">
      <!-- 标签导航 -->
      <div class="tab-nav">
        <div
          v-for="(tab, index) in tabs"
          :key="index"
          class="tab-item"
          :class="{ active: tindex === index }"
          @click="changeTab(index)"
        >
          {{ tab }}
        </div>
      </div>
      <!-- 动态显示内容 -->
      <div class="tab-content">
        <div v-if="tindex === 0" class="content-item">
          <p>
            YouEbook（捡书） 是一个基于 Vue3 + Tauri
            开发的跨平台电子书编辑器，支持 macOS、Windows、Linux
            等操作系统。(本人只有Windows系统电脑, 其他没有平台测试。)
          </p>
          <h2>功能：</h2>

          <p>
            1、导入txt，epub，html，mobi等文件，进行编辑，然后导出生成epub/txt/html文件。
          </p>
          <p>
            2、导入的文本可以分割章节，前提是你的文本已经有章节的字符，譬如（第一章
            ... 第二章 ...)这种文字, 点击分割按钮就会进行分割成多段文字。
          </p>
          <p>3、可以对导入的文字进行简单编辑，譬如消除空行，段落首行缩进。</p>
          <h2>开源地址：</h2>
          <p>
            https://github.com/laowus/MyEbook
            <el-button
              style="margin-left: 10px"
              type="primary"
              @click="openUrl"
            >
              打开
            </el-button>
            <br />
            如果您喜欢这个项目，请考虑给个star, 谢谢!
          </p>

          <p>
            <br />
            如有问题可以以下方式进行联系：
            <br />
            邮箱：pjhxl@qq.com
            <br />Q Q：37156760<br />
            QQ群：616712461 <br />
          </p>
        </div>
        <div v-else-if="tindex === 1" class="content-item">
          {{ tabContents[1] }}
          <div class="payment-methods">
            <div class="payment-item">
              <img src="../assets/images/weichat.jpg" height="250" />
              <p>微信支付</p>
            </div>
            <div class="payment-item">
              <img src="../assets/images/alipay.jpg" height="250" />
              <p>支付宝支付</p>
            </div>
          </div>
        </div>
        <div v-else-if="tindex === 2" class="content-item">
          <div class="backup-restore">
            <div class="data-top">
              <h3>备份/恢复功能：</h3>

              您可以使用备份/恢复功能来备份您的书籍数据，以及在需要时恢复备份。这对于保护您的书籍数据免受意外删除或损坏非常重要。
            </div>
            <div class="data-content">
              <h3>数据保存位置：</h3>
              <p>
                {{ dataDir }}
                <el-button type="primary" @click="openDataDir">
                  打开
                </el-button>
              </p>
              <h3>备份/恢复操作：</h3>
              <p>
                1、备份：点击备份按钮，会在数据保存位置生成一个压缩zip文件，备份文件中包含了所有的书籍数据。
                <br />
                功能1: 你可以在在其他电脑上安装捡书,
                然后把这个备份文件复制到其他电脑的, 然后点击恢复按钮,
                就可以恢复数据了。
                <br />
                功能2:
                你可以恢复某个时间的数据。操作错误或者误删，可以恢复到之前。
                <br />
                2、恢复：如果您需要恢复备份的数据，点击恢复按钮，会在数据保存位置打开备份文件夹，您可以选择要恢复的备份文件进行恢复。
              </p>
              <div class="backup-restore-buttons" style="margin-top: 20px">
                <el-button
                  type="primary"
                  @click="backupData"
                  style="margin-right: 10px"
                >
                  备份数据
                </el-button>
                <el-button type="primary" @click="restoreData">
                  恢复数据
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="tindex === 3" class="content-item">
          <div class="update-section">
            <div>当前版本: {{ appInfo.version }}</div>
            <div>
              <el-button
                type="primary"
                @click="checkUpdates"
                :disabled="updateStatus.downloading"
              >
                检查更新
              </el-button>
              <el-button
                type="success"
                @click="downloadAndInstall"
                v-if="updateStatus.available && !updateStatus.downloading"
              >
                下载并安装更新 ({{ updateStatus.version }})
              </el-button>
            </div>
            <div>
              <p>{{ message }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.update-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.backup-restore {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.about-container {
  padding: 10px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  /* 保留原有的其他样式 */
  user-select: text;
  -webkit-user-select: text; /* Safari浏览器 */
  -moz-user-select: text; /* Firefox浏览器 */
  -ms-user-select: text; /* IE/Edge浏览器 */
  cursor: text;
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 10px;
}

.tab-item {
  padding: 12px 20px;
  cursor: pointer;
  font-size: 16px;
  color: #666666;
  transition: color 0.3s ease;
}

.tab-item.active {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}

.tab-content {
  padding: 10px;
}

.content-item {
  font-size: 14px;
  color: #333333;
  line-height: 1.6;
}

.payment-methods {
  display: flex;
  justify-content: center;
  gap: 100px;
  margin-top: 20px;
}

.payment-item {
  text-align: center;
  padding: 0 20px;
}

.payment-item img {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.payment-item img:hover {
  transform: scale(1.05);
}

.payment-item p {
  margin-top: 10px;
  font-size: 14px;
  color: #666666;
}
</style>
