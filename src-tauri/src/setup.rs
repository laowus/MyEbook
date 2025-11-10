use crate::database::init_db;
use std::error::Error;
use std::sync::Mutex;
use tauri::{App, Manager};

// 1. 定义应用状态结构体
pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
}

pub fn setup_app(app: &mut App) -> Result<(), Box<dyn Error>> {
    // 调用 数据库初始化
    let db = init_db(app.handle())?;

    // 将数据库连接存储在应用状态中
    app.manage(AppState { db: Mutex::new(db) });

    // 调试环境下打开开发者工具
    #[cfg(debug_assertions)]
    open_devtools(app)?;

    Ok(())
}

//调试环境打开开发者工具
#[cfg(debug_assertions)]
fn open_devtools(app: &mut App) -> Result<(), Box<dyn Error>> {
    let main_window = app.get_webview_window("main").unwrap();
    main_window.open_devtools();
    Ok(())
}
// 窗口置顶
#[allow(dead_code)]
fn always_on_top(app: &mut App) -> Result<(), Box<dyn Error>> {
    let main_window = app.get_webview_window("main").unwrap();
    let _ = main_window.set_always_on_top(true);
    Ok(())
}
