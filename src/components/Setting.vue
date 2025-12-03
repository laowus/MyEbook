<script setup>
import { ref, watch, computed, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../store/appStore";
import { ElMessage } from "element-plus";
import EventBus from "../common/EventBus";
const { settingShow, pre, after } = storeToRefs(useAppStore());
const { setPreAfter } = useAppStore();

const tabs = [
  { name: "分割设置", icon: "✂️", desc: "配置分割关键词" },
  { name: "其他设置", icon: "⚙️", desc: "更多配置选项" },
];
const activeTab = ref(0);

// 监听弹窗打开，初始化数据
watch(settingShow, (newVal) => {
  if (newVal) {
    initInputs();
  }
});

// 用于输入框的字符串格式
const preInput = ref("");
const afterInput = ref("");

// 初始化输入框值
const initInputs = () => {
  preInput.value = Array.isArray(pre.value) ? pre.value.join(", ") : "";
  afterInput.value = Array.isArray(after.value) ? after.value.join(", ") : "";
};

// 监听弹窗打开，初始化数据
watch(settingShow, (newVal) => {
  if (newVal) {
    initInputs();
  }
});

const savePreAfterData = () => {
  let showMessage = false;
  
  // 处理前缀：如果为空，使用初始值
  let preArray;
  if (!preInput.value.trim()) {
    preArray = ["", "第", "卷", "chapter"]; // 初始值
    preInput.value = preArray.join(", "); // 更新输入框显示
    showMessage = true;
  } else {
    preArray = preInput.value.split(",").map((item) => item.trim());
  }
  
  // 处理后缀：如果为空，使用初始值
  let afterArray;
  if (!afterInput.value.trim()) {
    afterArray = ["", "章", "回", "节", "集", "部", "篇", "部分"]; // 初始值
    afterInput.value = afterArray.join(", "); // 更新输入框显示
    showMessage = true;
  } else {
    afterArray = afterInput.value.split(",").map((item) => item.trim());
  }
  
  setPreAfter(preArray, afterArray);
  updatePreAfter();
  
  // 显示提示信息
  if (showMessage) {
    ElMessage({
      message: '检测到空输入，已恢复为默认值',
      type: 'warning',
      duration: 2000
    });
  }
};

const updatePreAfter = () => {
  EventBus.emit("updatePreAfter");
};
</script>

<template>
  <el-dialog
    v-model="settingShow"
    title="⚙️ 设置"
    width="85%"
    class="setting-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    align-center
  >
    <div class="setting-wrapper">
      <!-- 左侧导航 -->
      <div class="setting-sidebar">
        <div class="sidebar-header">
          <h3>设置菜单</h3>
        </div>
        <div class="tab-navigation">
          <div
            v-for="(tab, index) in tabs"
            :key="tab.name"
            :class="{ active: index === activeTab }"
            class="nav-item"
            @click="activeTab = index"
          >
            <div class="nav-icon">{{ tab.icon }}</div>
            <div class="nav-content">
              <div class="nav-title">{{ tab.name }}</div>
              <div class="nav-desc">{{ tab.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="setting-main">
        <!-- 分割设置 -->
        <div v-if="activeTab === 0" class="content-panel">
          <div class="panel-header">
            <h2>📚 分割设置</h2>
            <p>注: 关键词之间用逗号分隔，第一个,不要删掉</p>
          </div>

          <div class="form-container">
            <!-- 关键词输入区域 -->
            <div class="keywords-input-section">
              <!-- 前缀设置 -->
              <div class="keyword-item">
                <div class="keyword-header">
                  <span class="keyword-title">🔖 前缀关键词</span>
                </div>
                <div class="input-group-inline">
                  <span class="input-label">前缀:</span>
                  <input
                    v-model="preInput"
                    placeholder="请输入前缀关键词，用逗号分隔，例如：第,卷,章,Chapter"
                    class="setting-input"
                    @input="savePreAfterData"
                  />
                </div>
              </div>

              <!-- 后缀设置 -->
              <div class="keyword-item">
                <div class="keyword-header">
                  <span class="keyword-title">🏁 后缀关键词</span>
                </div>
                <div class="input-group-inline">
                  <span class="input-label">后缀:</span>
                  <input
                    v-model="afterInput"
                    placeholder="请输入后缀关键词，用逗号分隔，例如：完,结束,End,终"
                    class="setting-input"
                    @input="savePreAfterData"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 其他设置 -->
        <div v-if="activeTab === 1" class="content-panel">
          <div class="panel-header">
            <h2>🛠️ 其他设置</h2>
            <p>更多配置选项正在开发中</p>
          </div>

          <div class="empty-state">
            <el-empty description="功能开发中，敬请期待" :image-size="150">
              <template #description>
                <p class="empty-desc">更多高级功能正在开发中</p>
                <p class="empty-desc">敬请期待下一个版本</p>
              </template>
            </el-empty>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.setting-dialog {
  --primary-color: #409eff;
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
  --info-color: #909399;
  --bg-primary: #f8f9fa;
  --bg-secondary: #ffffff;
  --border-color: #0c56ea;
  --text-primary: #303133;
  --text-regular: #606266;
  --text-secondary: #909399;
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.setting-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: visible;
  box-shadow: var(--shadow-lg);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  margin: 5vh auto;
}

.setting-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 32px;
  margin: 0;
  border: none;
  flex-shrink: 0;
  border-radius: 16px 16px 0 0;
}

.setting-dialog :deep(.el-dialog__title) {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.setting-dialog :deep(.el-dialog__body) {
  padding: 0;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.setting-wrapper {
  display: flex;
  flex: 1;
  min-height: 400px;
  max-height: 60vh;
}

/* 左侧导航栏 */
.setting-sidebar {
  width: 220px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
}

.tab-navigation {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  background: var(--bg-secondary);
}

.nav-item:hover {
  background: #f0f9ff;
  border-color: rgba(64, 158, 255, 0.2);
  transform: translateX(2px);
}

.nav-item.active {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.nav-icon {
  font-size: 18px;
  margin-right: 10px;
  flex-shrink: 0;
}

.nav-content {
  flex: 1;
}

.nav-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  line-height: 1.2;
}

.nav-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.2;
}

.nav-item.active .nav-title {
  color: var(--primary-color);
}

/* 右侧主内容区 */
.setting-main {
  flex: 1;
  background: var(--bg-secondary);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
}

.content-panel {
  max-width: 700px;
  margin: 0 auto;
}

.panel-header {
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: var(--text-primary);
  font-weight: 600;
  letter-spacing: -0.5px;
}

.panel-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.4;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-section {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 18px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.form-section:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(64, 158, 255, 0.2);
}

/* 关键词输入区域 */
.keywords-input-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.keyword-item {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.keyword-item:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(64, 158, 255, 0.2);
}

.keyword-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.keyword-title {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 内联输入组样式 */
.input-group-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-regular);
  white-space: nowrap;
  min-width: 40px;
}

.input-group-inline .setting-input {
  flex: 1;
}

.input-group-inline .clear-btn {
  flex-shrink: 0;
}

.setting-input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #409eff;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px;
  transition: all 0.3s ease;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  outline: none;
  background: #ffffff;
}

.setting-input:focus {
  border-color: #0c56ea;
  box-shadow: 0 0 0 3px rgba(12, 86, 234, 0.15);
  background: #f8faff;
}

.setting-input:hover {
  border-color: #0c56ea;
  box-shadow: 0 2px 8px rgba(12, 86, 234, 0.2);
}

.clear-btn {
  color: var(--danger-color);
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(245, 108, 108, 0.1);
  transform: scale(1.05);
}

/* 空状态 */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.empty-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.5;
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 32px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  border-radius: 0 0 16px 16px;
}

.dialog-footer .el-button {
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.3s ease;
}

.dialog-footer .el-button--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: var(--shadow-sm);
}

.dialog-footer .el-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 滚动条样式 */
.setting-main::-webkit-scrollbar,
.tab-navigation::-webkit-scrollbar {
  width: 8px;
  display: block;
}

.setting-main::-webkit-scrollbar-track,
.tab-navigation::-webkit-scrollbar-track {
  background: var(--bg-primary);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.setting-main::-webkit-scrollbar-thumb,
.tab-navigation::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #c0c4cc 0%, #909399 100%);
  border-radius: 4px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  display: block;
}

.setting-main::-webkit-scrollbar-thumb:hover,
.tab-navigation::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #909399 0%, #606266 100%);
  border-color: var(--text-secondary);
}

.setting-main::-webkit-scrollbar-thumb:active,
.tab-navigation::-webkit-scrollbar-thumb:active {
  background: linear-gradient(135deg, #606266 0%, #303133 100%);
}

/* 确保滚动条始终显示 */
.setting-main {
  scrollbar-width: thin;
  scrollbar-color: #909399 #f8f9fa;
}

.tab-navigation {
  scrollbar-width: thin;
  scrollbar-color: #909399 #f8f9fa;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .setting-wrapper {
    flex-direction: column;
    height: auto;
    max-height: 60vh;
  }

  .setting-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .tab-navigation {
    display: flex;
    padding: 12px;
    gap: 8px;
    overflow-x: auto;
  }

  .nav-item {
    flex: 1;
    min-width: 100px;
    flex-direction: column;
    text-align: center;
    padding: 8px;
  }

  .nav-icon {
    margin-right: 0;
    margin-bottom: 4px;
  }

  .nav-desc {
    display: none;
  }

  .setting-main {
    padding: 16px;
  }

  .content-panel {
    max-width: none;
  }
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-panel {
  animation: fadeIn 0.4s ease-out;
}

.form-section {
  animation: fadeIn 0.4s ease-out backwards;
}

.form-section:nth-child(1) {
  animation-delay: 0.1s;
}

.form-section:nth-child(2) {
  animation-delay: 0.2s;
}
</style>
