use base64::engine::general_purpose;
use base64::engine::Engine as _;
use std::fs;
use std::io;
use std::path::Path;
use tauri::{command, AppHandle, Manager};
use zip::result::ZipResult;
use zip::write::FileOptions;
// 添加zip库的读取相关导入
use zip::read::ZipFile;
use zip::result::ZipError;

#[command]
pub fn read_image(path: String) -> Result<String, String> {
    // 读取图片文件
    let image_data = fs::read(path).map_err(|e| e.to_string())?;
    // 转换为 Base64
    let base64_data = general_purpose::STANDARD.encode(&image_data);
    Ok(base64_data)
}

//删除应用数据目录所有文件
#[command]
pub fn clear_app_data(app_handle: AppHandle) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");
    fs::remove_dir_all(app_dir).map_err(|e| e.to_string())?;
    Ok(())
}



#[command]
pub async fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let command = "open";

    #[cfg(target_os = "windows")]
    let command = "explorer";

    #[cfg(target_os = "linux")]
    let command = "xdg-open";

    std::process::Command::new(command)
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn zip_app_directory(app_handle: AppHandle, output_path: String) -> Result<(), String> {
    // 获取应用数据目录
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

    // 创建ZIP文件
    let zip_file = fs::File::create(&output_path).map_err(|e| format!("创建ZIP文件失败: {}", e))?;
    let mut zip = zip::ZipWriter::new(zip_file);

    // 遍历应用目录并添加所有文件
    if let Err(err) = add_dir_to_zip(&mut zip, &app_dir, "") {
        return Err(format!("打包目录失败: {}", err));
    }

    // 完成ZIP写入
    zip.finish()
        .map_err(|e| format!("完成ZIP打包失败: {}", e))?;

    Ok(())
}

// 递归添加目录到ZIP文件
fn add_dir_to_zip(zip: &mut zip::ZipWriter<fs::File>, path: &Path, base: &str) -> ZipResult<()> {
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let path = entry.path();
        let name = path.file_name().unwrap().to_str().unwrap();
        let file_path = if base.is_empty() {
            name.to_string()
        } else {
            format!("{}/{}", base, name)
        };

        if path.is_dir() {
            // 添加目录
            add_dir_to_zip(zip, &path, &file_path)?;
        } else {
            // 添加文件
            let file = fs::File::open(&path)?;
            let mut reader = io::BufReader::new(file);

            zip.start_file(file_path, FileOptions::default())?;
            io::copy(&mut reader, zip)?;
        }
    }

    Ok(())
}

#[command]
pub async fn unzip_file(zip_file: String, dest_dir: String) -> Result<(), String> {
    // 打开zip文件
    let file = fs::File::open(&zip_file).map_err(|e| format!("无法打开ZIP文件: {}", e))?;
    let reader = io::BufReader::new(file);
    let mut archive =
        zip::ZipArchive::new(reader).map_err(|e| format!("解析ZIP文件失败: {}", e))?;

    // 确保目标目录存在
    fs::create_dir_all(&dest_dir).map_err(|e| format!("无法创建目标目录: {}", e))?;

    // 遍历ZIP中的所有文件并解压
    for i in 0..archive.len() {
        let mut file = match archive.by_index(i) {
            Ok(file) => file,
            Err(ZipError::FileNotFound) => continue, // 处理文件未找到的情况
            Err(e) => return Err(format!("读取ZIP条目失败: {}", e)),
        };

        // 构建目标文件路径
        let outpath = match sanitize_path(&dest_dir, &file) {
            Ok(path) => path,
            Err(e) => return Err(e),
        };

        // 转换为Path对象以便使用Path特有的方法
        let outpath_path = Path::new(&outpath);

        // 如果是目录，创建目录
        if file.name().ends_with('/') {
            fs::create_dir_all(outpath_path).map_err(|e| format!("无法创建目录: {}", e))?;
        } else {
            // 如果是文件，确保父目录存在
            if let Some(parent) = outpath_path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("无法创建父目录: {}", e))?;
            }

            // 创建目标文件
            let mut outfile =
                fs::File::create(outpath_path).map_err(|e| format!("无法创建文件: {}", e))?;

            // 复制文件内容
            io::copy(&mut file, &mut outfile).map_err(|e| format!("无法写入文件内容: {}", e))?;

            // 在Unix上设置文件权限
            #[cfg(unix)]
            {
                {
                    use std::os::unix::fs::PermissionsExt;
                    if let Some(mode) = file.unix_mode() {
                        fs::set_permissions(outpath_path, fs::Permissions::from_mode(mode)).ok();
                    }
                }
            }
        }
    }

    Ok(())
}

// 修改sanitize_path函数
fn sanitize_path(dest_dir: &str, file: &ZipFile) -> Result<String, String> {
    let dest_path = Path::new(dest_dir);
    let file_path = Path::new(file.name());

    // 确保文件路径是相对路径，防止路径遍历
    let normalized_path = match file_path
        .components()
        .all(|c| !matches!(c, std::path::Component::ParentDir))
    {
        true => file_path,
        false => return Err("检测到路径遍历尝试".to_string()),
    };

    // 组合目标目录和文件路径
    let combined_path = dest_path.join(normalized_path);

    // 确保组合后的路径在目标目录内
    match combined_path.strip_prefix(dest_path) {
        Ok(_) => Ok(combined_path.to_string_lossy().to_string()),
        Err(_) => Err("文件路径不在目标目录内".to_string()),
    }
}
