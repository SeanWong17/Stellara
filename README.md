# Stellar Evolution Paths

一个静态 Web 科普项目，用 MIST v2.5 预计算单星轨迹可视化不同初始质量恒星的一生。

## 特性

- 恒星生命周期播放器：播放、暂停、拖动年龄进度。
- HR 图同步轨迹：横轴为 `log Teff`，按天文学惯例高温在左。
- 多质量对比：内置 `0.5, 1, 2, 5, 10, 20, 40 M☉` 七条太阳金属丰度轨迹。
- Canvas 恒星视觉：颜色、半径和辉光随 MIST 轨迹参数变化。
- 中英双语界面。
- 零构建依赖，适合 GitHub Pages 或 Cloudflare Pages。

## 本地运行

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

不要直接双击 `index.html`，因为浏览器通常会限制 `fetch()` 读取本地 JSON。

## 数据

当前数据来自 MIST v2.5 EEP tracks：

- `[Fe/H]=0.00`
- `[a/Fe]=0.00`
- `v/vcrit=0.00`
- 官方入口：<https://mist.science/>

重新生成子集：

```bash
python3 scripts/build_mist_subset.py --download --output data
```

如果已经有官方 `.txz` 包：

```bash
python3 scripts/build_mist_subset.py \
  --archive /path/to/MIST_v2.5_feh_p000_afe_p0_vvcrit0.0_EEPS.txz \
  --output data
```

更多说明见 [docs/data-notes.md](docs/data-notes.md)。

## 科学边界

这是面向公众理解恒星演化差异的可视化，不是实时恒星结构计算器。第一版不包含双星相互作用、磁场、任意金属丰度调节、旋转调节或在线运行 MESA。

## 目录

```text
stellar-evolution-visualizer/
├── data/                 # 浏览器加载的 MIST 子集
├── docs/                 # 数据与科学说明
├── scripts/              # MIST 数据转换脚本
├── src/css/              # 样式
├── src/js/               # 前端逻辑和 i18n
└── index.html
```

## License

代码使用 MIT License。MIST 数据请遵循 MIST 项目的引用和使用要求；公开使用时请引用 MIST 论文与官网。
