<script setup>
import { ref, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../store/appStore";
import { ArrowDown, SortUp, SortDown } from '@element-plus/icons-vue';
import EventBus from "../common/EventBus";

const { fileListShow, fileListData } = storeToRefs(useAppStore());
// 拖拽相关状态
const draggedIndex = ref(null);
const draggedOverIndex = ref(null);

// 拖拽开始
const handleDragStart = (event, index) => {
  draggedIndex.value = index;
  event.dataTransfer.effectAllowed = "move";
  event.target.style.opacity = "0.5";
};

// 拖拽经过
const handleDragOver = (event, index) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  draggedOverIndex.value = index;
};

// 拖拽离开
const handleDragLeave = () => {
  draggedOverIndex.value = null;
};

// 放置
const handleDrop = (event, dropIndex) => {
  event.preventDefault();
  event.target.style.opacity = "1";

  if (draggedIndex.value !== null && draggedIndex.value !== dropIndex && fileListData.value) {
    const newFileList = [...fileListData.value];
    const draggedItem = newFileList.splice(draggedIndex.value, 1)[0];
    newFileList.splice(dropIndex, 0, draggedItem);
    fileListData.value = newFileList;
  }

  draggedIndex.value = null;
  draggedOverIndex.value = null;
};

// 拖拽结束
const handleDragEnd = (event) => {
  event.target.style.opacity = "1";
  draggedIndex.value = null;
  draggedOverIndex.value = null;
};

// 上移
const moveUp = (index) => {
  if (index > 0 && fileListData.value) {
    const newFileList = [...fileListData.value];
    [newFileList[index - 1], newFileList[index]] = [
      newFileList[index],
      newFileList[index - 1],
    ];
    fileListData.value = newFileList;
    console.log(fileListData.value);
  }
};

// 下移
const moveDown = (index) => {
  if (fileListData.value && index < fileListData.value.length - 1) {
    const newFileList = [...fileListData.value];
    [newFileList[index], newFileList[index + 1]] = [
      newFileList[index + 1],
      newFileList[index],
    ];
    fileListData.value = newFileList;
    console.log(fileListData.value);
  }
};

// 按文件名排序
const sortByName = (ascending = true) => {
  if (!fileListData.value || !fileListData.value.length) return;
  
  const newFileList = [...fileListData.value];
  newFileList.sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    
    if (ascending) {
      return nameA.localeCompare(nameB, 'zh-CN', { numeric: true });
    } else {
      return nameB.localeCompare(nameA, 'zh-CN', { numeric: true });
    }
  });
  
  fileListData.value = newFileList;
};

const addFiles = () => {
  EventBus.emit("addFiles");
};

const closeDialog = () => {
  fileListShow.value = false;
  fileListData.value = null;
};
</script>
<template>
  <el-dialog v-model="fileListShow" title="文件排序" width="60%">
    <div class="file-list-container">
      <div
        v-for="(item, index) in (fileListData || [])"
        :key="item.name"
        class="file-card"
        :class="{
          dragging: draggedIndex === index,
          'drag-over': draggedOverIndex === index,
        }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragover="handleDragOver($event, index)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
      >
        <div class="file-info">
          <div class="drag-handle">⋮⋮</div>
          <span class="file-index">{{ index + 1 }}</span>
          <span class="file-title">{{ item.name }}</span>
          <div class="sort-buttons">
            <el-button
              size="small"
              text
              @click="moveUp(index)"
              :disabled="index === 0"
            >
              ↑
            </el-button>
            <el-button
              size="small"
              text
              @click="moveDown(index)"
              :disabled="index === (fileListData?.length || 0) - 1"
            >
              ↓
            </el-button>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span style="margin-right: 10px">{{ fileListData?.length || 0 }} 个文件</span>
        <div style="display: flex; gap: 10px;">
          <el-dropdown trigger="click">
            <el-button size="small" type="info">
              文件名排序 <el-icon><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="sortByName(true)">
                  <el-icon><sort-up /></el-icon> 升序排列
                </el-dropdown-item>
                <el-dropdown-item @click="sortByName(false)">
                  <el-icon><sort-down /></el-icon> 降序排列
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="primary" size="small" @click="closeDialog">
            取消
          </el-button>
          <el-button type="danger" size="small" @click="addFiles">导入</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style>
.file-list-container {
  max-height: 500px;
  overflow-y: auto;
}
.file-card {
  margin-bottom: 5px;
  border: 1px solid #e4e7ed;
  padding: 10px;
  cursor: move;
  transition: all 0.3s ease;
  user-select: none;
}
.file-card:hover {
  border-color: #409eff;
  background-color: #f5f7fa;
}
.file-card.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}
.file-card.drag-over {
  border-color: #67c23a;
  background-color: #f0f9ff;
}
.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.drag-handle {
  color: #909399;
  font-size: 12px;
  cursor: grab;
  padding: 0 5px;
}
.drag-handle:active {
  cursor: grabbing;
}
.file-index {
  background-color: #409eff;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}
.file-title {
  flex: 1;
  font-size: 14px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sort-buttons {
  display: flex;
  gap: 5px;
}
.sort-buttons .el-button {
  padding: 4px 8px;
  min-height: auto;
}
.sort-buttons .el-button:disabled {
  color: #c0c4cc;
}
</style>
