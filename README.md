# 拼豆图纸生成器

把图片转换成拼豆图纸的网站。纯前端，图片只在浏览器里处理，不会上传到任何服务器。

色卡：MARD 221 色标准版。

## 功能

- 上传图片（点击选择 / 拖拽 / 粘贴 / 手机相册），裁剪（正方形或自由比例）
- 调整图纸宽度（20–100 列）、最大颜色数（8–60）、色系开关、去背景、去杂点、对比度、饱和度
- 调参数后图纸实时更新，点图纸上的格子或某个颜色可以高亮它的所有位置
- 导出高清 PNG 图纸（带色号、行列号、图例）和 CSV 用量清单
- `/#/palette` 色卡页：按色系列出全部颜色，方便和实物色卡对照

## 本地运行

需要先安装 [Node.js](https://nodejs.org/)（22 或更新的版本）。

在这个文件夹里打开"终端"，第一次先安装依赖：

```bash
npm install
```

启动：

```bash
npm run dev
```

然后用浏览器打开终端里显示的地址（一般是 http://localhost:5173/pindou/ ）。改代码后页面会自动刷新。

其他命令：

```bash
npm test         # 跑单元测试
npm run build    # 构建正式版本，输出到 dist/
```

## 更新网站

网站托管在 GitHub Pages。只要把改动推送到 GitHub 的 `main` 分支，网站就会自动更新，不需要手动上传：

```bash
git add -A
git commit -m "这里写这次改了什么"
git push
```

推送后 GitHub 会自动：安装依赖 → 跑测试 → 构建 → 发布。大约 1–2 分钟后刷新网页就能看到新版本。

- 进度可以在仓库页面的 **Actions** 标签里看，绿色对勾表示成功。
- 如果测试没通过，网站不会更新，仍然是上一个版本。
- 仓库 **Settings → Pages** 里的 **Source** 必须选 **GitHub Actions**（只需要设置一次）。

## 部署到 Cloudflare Pages（自己的域名）

网站默认按 GitHub Pages 的路径 `/pindou/` 构建。放到自己的域名下时网站在根路径，
需要在 Cloudflare Pages 的构建设置里这样填：

- Build command：`npm run build`
- Build output directory：`dist`
- 环境变量：`BASE_PATH` = `/`，`NODE_VERSION` = `22`

设置好之后，同样是每次 `git push` 自动更新。

## 代码结构

```
src/
  lib/                图像处理逻辑（不依赖界面，有单元测试）
    color.ts          RGB → CIELAB、CIEDE2000 色差
    image.ts          高斯模糊、缩小、对比度/饱和度
    background.ts     去背景（四角 flood fill）
    quantize.ts       匹配色卡、限制颜色数
    despeckle.ts      去杂点
    skin.ts           肤色柔和（减轻脸上阴影）
    pattern.ts        把上面几步串起来的完整流程 + 用量统计
    render.ts         画图纸（Canvas）
    csv.ts            用量清单 CSV
    worker.ts         Web Worker，计算放在后台线程，页面不卡
    browser.ts        读图片、裁剪取像素、下载文件
    lib.test.ts       单元测试
  palettes/
    mard.json         MARD 色卡数据
    index.ts          品牌定义
    palette.test.ts   色卡数据测试（221 色、无重复、各色系数量）
  hooks/usePattern.ts 调用 Worker 生成图纸（带防抖）
  components/         界面组件（上传、裁剪、参数、图纸、图例、导出弹窗）
  pages/              页面：Home（做图纸）、PalettePage（色卡）
scripts/
  build-palette.mjs   把 mard-raw.txt 转成 mard.json
.github/workflows/deploy.yml   自动部署
```

## 生成图纸的步骤

1. 轻微高斯模糊，减少照片噪点
2. 按面积平均缩小到"列数 × 行数"
3. 对比度 / 饱和度微调
4. （可选）去背景：从四个角 flood fill，色差小于阈值的连通区域留空
5. （可选）肤色柔和：把脸上偏暗的阴影往正常肤色的亮度和颜色拉近，头发、眼睛等深色不动
6. 在 CIELAB 空间用 CIEDE2000 色差，把每格匹配到可用色卡里最接近的颜色
7. 颜色种类超过上限时，反复剔除用量最少的颜色并重新匹配
8. （可选）去杂点：孤立的单颗豆子，如果和周围颜色色差不大就合并；色差大的（眼睛、嘴唇）保留

## 添加其他品牌的色卡（Artkal、COCO 等）

1. 在 `src/palettes/` 里放一个同样格式的 json：`[{ "code": "A1", "hex": "#FAF4C8", "series": "A" }, ...]`
2. 在 `src/palettes/index.ts` 里仿照 `MARD` 写一个 `Brand` 对象，加进 `BRANDS` 数组
3. 界面目前固定使用 MARD，需要再加一个品牌选择下拉框
