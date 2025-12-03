<script setup>
import { ref, watch } from "vue";

import { storeToRefs } from "pinia";
import { useAppStore } from "../store/appStore";

const { settingShow, pre, after } = storeToRefs(useAppStore());
const { setPreAfter } = useAppStore();

// 本地数组数据
const preArray = ref([]);
const afterArray = ref([]);

// 监听弹窗打开，初始化数据
watch(settingShow, (newVal) => {
  if (newVal) {
    // 弹窗打开时，复制store中的数据到本地
    preArray.value = [...pre.value];
    afterArray.value = [...after.value];
  }
});

// 添加前缀项
const addPreItem = () => {
  preArray.value.push("");
};

// 删除前缀项
const removePreItem = (index) => {
  if (preArray.value.length > 1) {
    preArray.value.splice(index, 1);
  }
};

// 添加后缀项
const addAfterItem = () => {
  afterArray.value.push("");
};

// 删除后缀项
const removeAfterItem = (index) => {
  if (afterArray.value.length > 1) {
    afterArray.value.splice(index, 1);
  }
};

// 保存设置
const saveSettings = () => {
  // 过滤空值并保存到store
  const filteredPre = preArray.value.filter((item) => item.trim() !== "");
  const filteredAfter = afterArray.value.filter((item) => item.trim() !== "");

  setPreAfter(filteredPre, filteredAfter);
  settingShow.value = false;
};

// 取消设置
const cancelSettings = () => {
  settingShow.value = false;
};
</script>
<template>
  <el-dialog v-model="settingShow" title="设置" width="60%">
    <!-- 前后缀数组管理 -->
    <div class="setting-section">
      <h4>前缀管理</h4>
      <div class="array-manager">
        <div
          v-for="(item, index) in preArray"
          :key="'pre-' + index"
          class="array-item"
        >
          <el-input
            v-model="preArray[index]"
            placeholder="输入前缀"
            size="small"
          />
          <el-button
            size="small"
            type="danger"
            @click="removePreItem(index)"
            :disabled="preArray.length <= 1"
          >
            删除
          </el-button>
        </div>
        <el-button size="small" type="primary" @click="addPreItem">
          添加前缀
        </el-button>
      </div>
    </div>

    <div class="setting-section">
      <h4>后缀管理</h4>
      <div class="array-manager">
        <div
          v-for="(item, index) in afterArray"
          :key="'after-' + index"
          class="array-item"
        >
          <el-input
            v-model="afterArray[index]"
            placeholder="输入后缀"
            size="small"
          />
          <el-button
            size="small"
            type="danger"
            @click="removeAfterItem(index)"
            :disabled="afterArray.length <= 1"
          >
            删除
          </el-button>
        </div>
        <el-button size="small" type="primary" @click="addAfterItem">
          添加后缀
        </el-button>
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

.array-manager {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  background-color: #fafafa;
}

.array-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.array-item .el-input {
  flex: 1;
}
</style>
