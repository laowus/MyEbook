<script setup>
import { invoke } from "@tauri-apps/api/core";
import { ref, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import EventBus from "../common/EventBus";
import { join, appDataDir } from "@tauri-apps/api/path";
import { loadImage } from "../common/utils";
import { useAppStore } from "../store/appStore";
import { useBookStore } from "../store/bookStore";
const { historyViewShow, editBookShow } = storeToRefs(useAppStore());
const { setEditBookData, hideHistoryView } = useAppStore();
const { setMetaData, setToc, setFirst } = useBookStore();

const books = ref([]);

const fetchBooks = () => {
  invoke("get_all_books")
    .then((booksData) => {
      books.value = booksData.data;
    })
    .catch((error) => {
      console.error("Error fetching books data:", error);
    });
};

onMounted(() => {
  fetchBooks();
});

// 监听 historyViewShow 的变化
watch(historyViewShow, (newValue) => {
  if (newValue) {
    fetchBooks();
  }
});
const importBook = (index, row) => {
  console.log(index, row);
  const metaData = {
    bookId: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
  };
  setMetaData(metaData);
  const toc = JSON.parse(row.toc);
  setToc(toc);
  setFirst(false);
  // 添加调试信息，查看转换前后的值
  invoke("get_chapter", {
    id: String(toc[0].href),
  }).then((res) => {
    if (res.success) {
      EventBus.emit("updateToc", res.data[0].id);
      hideHistoryView();
    } else {
      console.log("获取章节失败", res.message);
    }
  });
};

const delBook = (row) => {
  console.log(row);
  invoke("delete_book", {
    id: row.id,
  }).then((res) => {
    if (res.success) {
      fetchBooks();
    } else {
      console.log("删除书籍失败", res.message);
    }
  });
};

const editBook = async (row) => {
  const appDataPath = await appDataDir();
  const coverPath = await join(appDataPath, "covers", `${row.id}.jpg`);
  // 获取封面路径
  let coverBase64 = "";
  try {
    coverBase64 = await loadImage(coverPath);
  } catch (error) {
    console.error("加载封面图片失败:", error);
  }
  row.cover = coverBase64;

  console.log("打开编辑书籍", row);
  setEditBookData(row); // 获取点击后某个书籍的信息
  hideHistoryView(); //隐藏list
  editBookShow.value = true; // 显示 EditBook 弹窗
};

const resetData = () => {
  ElMessageBox.confirm(
    "确定要清空所有历史记录吗？会直接删除，无法恢复！",
    "提示",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(() => {
      invoke("close_database").then((closeResult) => {
        if (closeResult.success) {
          try {
            invoke("clear_app_data")
              .then(() => {
                console.log("App data cleared successfully");
                hideHistoryView();
                ElMessage({
                  type: "success",
                  message: "数据清除成功!",
                });
                invoke("restart_app")
                  .then(() => {
                    console.log("App is restarting...");
                  })
                  .catch((error) => {
                    console.error("Error restarting app:", error);
                  });
              })
              .catch((error) => {
                console.error("Error clearing app data:", error);
              });
          } catch (error) {
            showTip(`清除应用数据失败: ${error}`);
          }
        } else {
          showTip(`关闭数据库连接失败: ${closeResult.error}`);
        }
      });
    })
    .catch(() => {
      ElMessage({
        type: "info",
        message: "已取消重置",
      });
    });
};
</script>
<template>
  <el-dialog v-model="historyViewShow" title="历史记录" width="80%">
    <!-- 新增清空按钮 -->
    <template #header>
      <div class="dialog-header">
        <span>历史记录</span>
        <el-button type="danger" size="small" @click="resetData"
          >清空所有数据</el-button
        >
      </div>
    </template>
    <el-table :data="books">
      <el-table-column property="id" label="id" width="50" />
      <el-table-column property="title" label="书名" width="150" />
      <el-table-column property="author" label="作者" width="100" />
      <el-table-column property="createTime" label="创建时间" width="100" />
      <el-table-column fixed="right" label="操作" min-width="200">
        <template #default="scope">
          <el-button
            type="primary"
            size="small"
            @click="importBook(scope.$index, scope.row)"
          >
            载入
          </el-button>
          <el-button type="danger" size="small" @click="delBook(scope.row)"
            >删除</el-button
          >
          <el-button type="danger" size="small" @click="editBook(scope.row)"
            >编辑</el-button
          >
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<style>
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
