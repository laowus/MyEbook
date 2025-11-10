<script setup>
// 新建书籍/ 修改书籍
import { invoke } from "@tauri-apps/api/core";
import { ref, toRaw, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../store/appStore";
import { useBookStore } from "../store/bookStore";
import { ElMessage } from "element-plus";
import EventBus from "../common/EventBus";
import { saveCoverImage } from "../common/utils";
const { hideNewBook } = useAppStore();
const { newBookShow } = storeToRefs(useAppStore());
const { setMetaData, setFirst, clearToc } = useBookStore();

// 定义初始的 meta 数据
const initialMeta = {
  title: "",
  author: "",
  description: "",
  cover: "",
  bookId: 0,
  toc: "",
};

const meta = ref({ ...initialMeta });

// 监听 newBookShow 的变化，当窗口显示时重置 meta
watch(newBookShow, (newValue) => {
  if (newValue) {
    meta.value = { ...initialMeta };
  }
});
// 处理文件选择事件
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      meta.value.cover = base64String;
      ElMessage.success("图片添加成功");
    };
    reader.onerror = () => {
      ElMessage.error("图片读取失败");
    };
    reader.readAsDataURL(file);
  }
};

// 双击插入封面图片
const handleDoubleClick = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg, image/png";
  input.addEventListener("change", handleFileChange);
  input.click();
};

const addBook = async () => {
  // 这里添加保存书籍信息的逻辑
  if (meta.value.title && meta.value.author) {
    invoke("add_book", toRaw(meta.value)).then((res) => {
      if (res.success) {
        meta.value.bookId = res.data.id;
        if (meta.value.cover) {
          saveCoverImage(meta.value.cover, meta.value.bookId);
        }
        setMetaData(meta.value);
        const chapter = {
          bookId: meta.value.bookId,
          label: meta.value.title,
          href: `OPS/chapter-${Date.now()}`,
          content: "这是一段提示文字",
        };
        clearToc();
        EventBus.emit("addChapter", { href: null, chapter: chapter });
        setFirst(false);
        hideNewBook();
      } else {
        ElMessage.error("书籍信息添加失败: ");
      }
    });
  } else {
    ElMessage.error("请输入完整的书籍信息");
  }
};
</script>
<template>
  <el-dialog v-model="newBookShow" :title="'新建书籍'" width="80%">
    <el-form :model="meta" label-width="auto">
      <el-row>
        <el-col :span="11">
          <el-form-item label="书名:" prop="title" required>
            <el-input v-model="meta.title" />
          </el-form-item>
          <el-form-item label="作者:" prop="author" required>
            <el-input v-model="meta.author" />
          </el-form-item>
          <el-form-item label="简介:">
            <el-input
              v-model="meta.description"
              style="width: 100%"
              :rows="6"
              type="textarea"
              placeholder="请输入书籍的介绍等信息"
            />
          </el-form-item>
        </el-col>
        <el-col :span="2"></el-col>
        <el-col :span="10">
          <el-form-item label="封面:" label-position="top" prop="cover">
            <div class="bordered-form-item" @dblclick="handleDoubleClick">
              <span v-if="!meta.cover"> 双击插入封面图片(jpg, png) </span>
              <el-image
                v-else
                :src="meta.cover"
                fit="contain"
                style="width: 200px; height: auto"
              />
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="hideNewBook">关闭</el-button>
        <el-button type="primary" @click="addBook"> 确定 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style>
/* 定义边框样式 */
.bordered-form-item {
  border: 1px solid #dcdfe6; /* 设置边框宽度、样式和颜色 */
  border-radius: 4px; /* 设置边框圆角 */
  padding: 5px; /* 设置内边距 */
  width: 220px;
  height: 200px;
  /* 添加 flex 布局样式 */
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  overflow: hidden; /* 确保超出容器的内容被隐藏 */
}
</style>
