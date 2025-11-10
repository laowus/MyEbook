// 导入自定义模块
mod database;  // 数据库操作模块，处理书籍和章节的数据存储
mod fileutil;  // 文件操作工具模块，提供文件读写、压缩解压等功能
mod setup;     // 应用程序设置模块，负责初始化应用环境

// 导入必要的 Tauri 类型use tauri::{ Emitter};  // Emitter trait 用于在前端和后端之间发送事件

// 仅在桌面环境下导入的模块和类型
#[cfg(desktop)]
use std::path::PathBuf;  // 用于处理文件路径的标准库类型
#[cfg(desktop)]
use tauri::{AppHandle, Manager, Url};  // AppHandle：应用程序句柄，Manager：窗口管理，Url：URL处理
use tauri::{Emitter};
#[cfg(desktop)]
use tauri_plugin_fs::FsExt;  // 文件系统扩展功能，提供安全的文件访问

// 定义用于发送事件的数据结构
#[derive(Clone, serde::Serialize)]
struct Payload {
    args: Vec<String>,  // 命令行参数列表
    cwd: String,        // 当前工作目录
}

// 仅在桌面环境下可用的函数：从命令行参数中提取文件路径
#[cfg(desktop)]
fn get_files_from_argv(argv: Vec<String>) -> Vec<PathBuf> {
    let mut files = Vec::new();  // 创建一个新的空向量用于存储文件路径
    
    // 遍历命令行参数（跳过第一个参数，通常是程序本身的路径）
    for (_, maybe_file) in argv.iter().enumerate().skip(1) {
        // 跳过类似 -f 或 --flag 这样的标志参数
        if maybe_file.starts_with("-") {
            continue;
        }
        
        // 尝试将参数解析为 URL，处理 file:// 格式的路径
        if let Ok(url) = Url::parse(maybe_file) {
            // 如果是有效的文件 URL，则转换为 PathBuf
            if let Ok(path) = url.to_file_path() {
                files.push(path);
            } else {
                // 否则将其视为普通文件路径
                files.push(PathBuf::from(maybe_file))
            }
        } else {
            // 如果不是有效的 URL，则将其视为普通文件路径
            files.push(PathBuf::from(maybe_file))
        }
    }
    files  // 返回提取出的文件路径列表
}

// 仅在桌面环境下可用的函数：允许文件在 Tauri 的安全作用域中访问
#[cfg(desktop)]
fn allow_file_in_scopes(app: &AppHandle, files: Vec<PathBuf>) {
    let fs_scope = app.fs_scope();  // 获取文件系统安全作用域
    let asset_protocol_scope = app.asset_protocol_scope();  // 获取资源协议安全作用域
    
    // 为每个文件添加访问权限
    for file in &files {
        // 尝试在文件系统作用域中允许访问该文件
        if let Err(e) = fs_scope.allow_file(file) {
            eprintln!("Failed to allow file in fs_scope: {e}");
        } else {
            println!("Allowed file in fs_scope: {file:?}");
        }
        
        // 尝试在资源协议作用域中允许访问该文件
        if let Err(e) = asset_protocol_scope.allow_file(file) {
            eprintln!("Failed to allow file in asset_protocol_scope: {e}");
        } else {
            println!("Allowed file in asset_protocol_scope: {file:?}");
        }
    }
}

// 应用程序入口点函数（在移动平台上使用特殊的入口点）
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 创建 Tauri 应用程序构建器
    let builder = tauri::Builder::default()
        // 初始化 shell 插件（用于执行系统命令等功能）
        .plugin(tauri_plugin_shell::init())
        // 初始化文件系统插件（提供安全的文件读写功能）
        .plugin(tauri_plugin_fs::init())
        // 初始化对话框插件（显示系统对话框）
        .plugin(tauri_plugin_dialog::init())
        // 初始化操作系统插件（提供操作系统相关信息和功能）
        .plugin(tauri_plugin_os::init())
        // 初始化进程插件（管理应用程序进程）
        .plugin(tauri_plugin_process::init())
        // 注册可从前端调用的 Rust 函数
        .invoke_handler(tauri::generate_handler![
            database::close_database,       // 关闭数据库连接
            database::add_book,             // 添加书籍信息
            database::get_all_books,        // 获取所有书籍列表
            database::add_chapter,          // 添加章节内容
            database::get_chapter,          // 获取章节内容
            database::update_toc,           // 更新书籍目录
            database::get_chapter_where,    // 条件查询章节
            database::update_chapter,       // 更新章节内容
            database::delete_book,          // 删除书籍
            database::update_book,          // 更新书籍信息
            fileutil::read_image,           // 读取图片文件
            fileutil::clear_app_data,       // 清除应用数据
            fileutil::open_folder,          // 打开文件夹
            fileutil::zip_app_directory,    // 压缩应用目录
            fileutil::unzip_file,           // 解压文件
        ]);
        
    // 仅在桌面环境下初始化窗口状态插件（用于保存和恢复窗口状态）
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_window_state::Builder::default().build());
        
    // 仅在桌面环境下初始化单实例插件（确保应用程序只有一个实例运行）
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
        // 当检测到新实例启动时，将焦点设置到主窗口
        let _ = app
            .get_webview_window("main")
            .expect("no main window")
            .set_focus();
        
        // 从命令行参数中提取文件路径
        let files = get_files_from_argv(argv.clone());
        
        // 如果有文件参数，允许这些文件在安全作用域中访问
        if !files.is_empty() {
            allow_file_in_scopes(app, files.clone());
        }
        
        // 向前端发送 "single-instance" 事件，携带命令行参数和工作目录
        app.emit("single-instance", Payload { args: argv, cwd })
            .unwrap();
    }));

    // 设置应用程序并运行
    builder.setup(setup::setup_app)  // 调用 setup 模块中的 setup_app 函数进行应用程序设置
    .run(tauri::generate_context!())  // 运行应用程序，使用自动生成的上下文
    .expect("error while running tauri application");  // 处理可能的运行时错误
}