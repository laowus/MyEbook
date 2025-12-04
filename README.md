# <div align='center'><img src="./public/icon.png" width="100" height="100"><br/>捡书 MyEbook</div>

一款基于 Tauri + Vue 3 开发的电子书编辑器。
你可以导入一些电子书，合并删除其中的内容，然后生成导出。
支持导入格式: EPUB、MOBI、TXT、HTML、AZW3、FB2、
导出格式：EPUB、TXT、HTML

### 联系:

有兴趣可以加入

QQ 群：616712461 (备注：MyEbook)

或者本人

QQ:37156760 (备注：MyEbook)

交流共同进步

### TODO

- [x] 1. 10/30 优化删除目录的 bug, 只有一个元素时候，无法删除，且会清空目录。
- [x] 2. 拖拉目录的元素，如果其他目录位置没有元素会不成功。
- [x] 3. 简体中文和繁体中文的转换。
     ![Github snap 18](./snapshot/18.jpg)
- [x] 4. 生成 epub 更改目录结构, 支持苹果系统目录
- [x] 5. 批量多文件导入, 导入文件可以自定义排序, 可以混合导入不同格式的文件。
     ![Github snap 16](./snapshot/16.jpg)
- [x] 6. 可设置分割前/后缀。
     ![Github snap 17](./snapshot/17.jpg)

### 开发/测试环境

- Windows 10( 个人电脑只有 Windows 系统的,linux 苹果系统没有测试)
- IDE：[Visual Studio Code](https://code.visualstudio.com/)
- [Nodejs](https://nodejs.org/)：v20.18.0(只是我电脑上的版本,其他版本可能也没关系)
- 其他：详见 [package.json](package.json)

### 功能特性

- 支持导入文件格式：EPUB、TXT、HTML、MOBI （导入前确认下导入文件是否为标准格式）
- 支持导出文件格式：EPUB、TXT、HTML
- 两种书籍生成方式。
  - 1、新建书籍：
    - 输入书籍名字和作者，简介，还有封面。
    - 如果是当前有正在编辑的书籍，则会覆盖当前的书籍（书籍不会被删除，可以在历史记录里面）
  - 2、导入书籍。
    - 导入前如果没有在编辑的书籍状态，则默认为当前导入的书籍为书籍信息。譬如导入的是 epub 文件，就会获取当前 epub 文件的名字和作者、封面作为当前的书籍信息。
    - （默认如果当前是书籍编辑状态，导入则为增加到当前书籍中的内容。如果想重新新建一个书籍，请重启软件恢复空状态，或者新建一本书。）

### 预览图

![Github snap 1](./snapshot/01.jpg)
![Github snap 2](./snapshot/02.jpg)
![Github snap 3](./snapshot/03.jpg)
![Github snap 4](./snapshot/04.jpg)
![Github snap 5](./snapshot/05.jpg)
![Github snap 6](./snapshot/06.jpg)
![Github snap 7](./snapshot/07.jpg)
![Github snap 8](./snapshot/08.jpg)

### For 开发者- 请先下载安装最新版（或最新 LTS 版本） [Nodejs](https://nodejs.org/)

### 还有安装 rust, 还要安装 vs 2019 的 c++ 开发工具

- <b>安装依赖</b>
  `pnpm install`
- <b>开发模式运行</b>
  `pnpm tauri dev`
- <b>构建打包</b>
  `pnpm tauri build`
