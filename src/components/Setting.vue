<script setup>
import { ref, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../store/appStore";

const { settingShow, pre, after } = storeToRefs(useAppStore());
const { setPreAfter } = useAppStore();

// 字符串形式的输入
const preString = ref("");
const afterString = ref("");

// 预览数组
const prePreview = computed(() => {
  return preString.value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
});

const afterPreview = computed(() => {
  return afterString.value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
});

// 监听弹窗打开，初始化数据
watch(settingShow, (newVal) => {
  if (newVal) {
    // 弹窗打开时，将数组转换为逗号分隔的字符串
    preString.value = pre.value.join(", ");
    afterString.value = after.value.join(", ");
  }
});


// 保存设置
const saveSettings = () => {
  // 将字符串转换为数组，过滤空值
  const preArray = preString.value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
  const afterArray = afterString.value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");

  setPreAfter(preArray, afterArray);
  settingShow.value = false;
};

// 取消设置
const cancelSettings = () => {
  settingShow.value = false;
};
</script>

<template>
  <el-dialog v-model="settingShow" title="设置" width="60%">
    <div class="setting-section">
      <h4>前缀设置</h4>
      <el-input
        v-model="preString"
        placeholder="请输入前缀，用逗号分隔，如：第,卷,chapter"
      />
      <div class="preview-section">
        <span>预览: </span>
        <el-tag
          v-for="(item, index) in prePreview"
          :key="'pre-' + index"
          size="small"
          style="margin-right: 5px; margin-top: 5px"
        >
          {{ item }}
        </el-tag>
      </div>
    </div>

    <div class="setting-section">
      <h4>后缀设置</h4>
      <el-input
        v-model="afterString"
        placeholder="请输入后缀，用逗号分隔，如：章,回,节,集"
      />
      <div class="preview-section">
        <span>预览: </span>
        <el-tag
          v-for="(item, index) in afterPreview"
          :key="'after-' + index"
          size="small"
          type="warning"
          style="margin-right: 5px; margin-top: 5px"
        >
          {{ item }}
        </el-tag>
      </div>
    </div>

    <template #footer>
      <el-button @click="cancelSettings">取消</el-button>
      <el-button type="primary" @click="saveSettings">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.setting-section {
  margin-bottom: 20px;
}

.setting-section h4 {
  margin-bottom: 15px;
  color: #409eff;
  font-size: 16px;
}

.preview-section {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  min-height: 40px;
}

.preview-section span {
  font-weight: 500;
  color: #606266;
}
</style>
