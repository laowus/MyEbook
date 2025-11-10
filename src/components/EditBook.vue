<script setup>
import { invoke } from "@tauri-apps/api/core";
import { toRaw } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../store/appStore";
import { useBookStore } from "../store/bookStore";
import { saveCoverImage } from "../common/utils";
import { ElMessage } from "element-plus";
const { metaData } = storeToRefs(useBookStore());
const { setMetaData } = useBookStore();
const { editBookShow, editBookData } = storeToRefs(useAppStore());
const { hideEditBook, showHistoryView } = useAppStore();

// 处理文件选择事件
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      editBookData.value.cover = base64String;
      ElMessage.success("图片修改成功");
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

// 保存编辑后的书籍信息
const saveEditBook = async () => {
  // 这里添加保存书籍信息的逻辑
  if (editBookData.value.title && editBookData.value.author) {
    invoke("update_book", toRaw(editBookData.value)).then((res) => {
      if (res.success) {
        console.log(editBookData.value);
        saveCoverImage(editBookData.value.cover, editBookData.value.id);
        ElMessage.success("书籍信息保存成功");
        console.log("saveEditBook ", editBookData.value);
        console.log("metaData", metaData.value);
        //如果当前正在编辑的书籍就是当前书籍 就更新元数据
        if (metaData.value && metaData.value.bookId == editBookData.value.id) {
          const newMetaData = {
            ...metaData.value,
            title: editBookData.value.title,
            author: editBookData.value.author,
          };
          setMetaData(newMetaData);
        }

        hideEditBook();
        showHistoryView();
      } else {
        ElMessage.error("书籍信息更新失败: " + res.message);
      }
    });
  } else {
    ElMessage.error("请输入完整的书籍信息");
  }
};
</script>
<template>
  <el-dialog v-model="editBookShow" title="'编辑书籍'" width="80%">
    <el-form :model="editBookData" label-width="auto">
      <el-row>
        <el-col :span="11">
          <el-form-item label="书名:" prop="title" required>
            <el-input v-model="editBookData.title" />
          </el-form-item>
          <el-form-item label="作者:" prop="author" required>
            <el-input v-model="editBookData.author" />
          </el-form-item>
          <el-form-item label="简介:">
            <el-input
              v-model="editBookData.description"
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
              <span v-if="!editBookData.cover">
                双击插入封面图片(jpg, png)
              </span>
              <img
                v-else
                :src="editBookData.cover"
                style="width: 200px; height: auto"
              />
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="hideEditBook">关闭</el-button>
        <el-button type="primary" @click="saveEditBook"> 保存 </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<style></style>
