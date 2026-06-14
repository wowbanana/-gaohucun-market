// scripts/convert-icons.js — SVG → PNG 批量转换
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname, '..');

// TabBar 图标 (81x81) 的输出目录
const TABBAR_OUT = path.join(PROJECT, 'images', 'tabbar');
// 占位图 (200x200) 的输出目录
const IMAGES_OUT = path.join(PROJECT, 'images');

const conversions = [
  // ===== TabBar 图标 (81x81) =====
  { svg: 'images/tabbar/svg/home.svg',            png: 'images/tabbar/home.png',          size: 81 },
  { svg: 'images/tabbar/svg/home-active.svg',      png: 'images/tabbar/home-active.png',   size: 81 },
  { svg: 'images/tabbar/svg/category.svg',         png: 'images/tabbar/category.png',      size: 81 },
  { svg: 'images/tabbar/svg/category-active.svg',  png: 'images/tabbar/category-active.png', size: 81 },
  { svg: 'images/tabbar/svg/publish.svg',          png: 'images/tabbar/publish.png',       size: 81 },
  { svg: 'images/tabbar/svg/publish-active.svg',   png: 'images/tabbar/publish-active.png', size: 81 },
  { svg: 'images/tabbar/svg/board.svg',            png: 'images/tabbar/board.png',         size: 81 },
  { svg: 'images/tabbar/svg/board-active.svg',     png: 'images/tabbar/board-active.png',  size: 81 },
  { svg: 'images/tabbar/svg/profile.svg',          png: 'images/tabbar/profile.png',       size: 81 },
  { svg: 'images/tabbar/svg/profile-active.svg',   png: 'images/tabbar/profile-active.png', size: 81 },
  // ===== 占位图 (200x200) =====
  { svg: 'images/default-avatar.svg',              png: 'images/default-avatar.png',       size: 200 },
  { svg: 'images/default-goods.svg',               png: 'images/default-goods.png',        size: 200 },
  { svg: 'images/empty-goods.svg',                 png: 'images/empty-goods.png',          size: 200 },
  { svg: 'images/empty-board.svg',                 png: 'images/empty-board.png',          size: 200 },
];

let ok = 0;
let fail = 0;

for (const { svg, png, size } of conversions) {
  const svgPath = path.join(PROJECT, svg);
  const pngPath = path.join(PROJECT, png);

  if (!fs.existsSync(svgPath)) {
    console.log(`  ⚠️  跳过（SVG 不存在）: ${svg}`);
    fail++;
    continue;
  }

  const svgContent = fs.readFileSync(svgPath, 'utf-8');
  try {
    const resvg = new Resvg(svgContent, {
      fitTo: { mode: 'width', value: size },
      background: 'rgba(0,0,0,0)',
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    fs.writeFileSync(pngPath, pngBuffer);
    const kb = (pngBuffer.length / 1024).toFixed(1);
    console.log(`  ✅ ${png}  (${kb} KB)`);
    ok++;
  } catch (err) {
    console.log(`  ❌ ${png}  失败: ${err.message}`);
    fail++;
  }
}

console.log(`\n🎉 完成: ${ok} 成功, ${fail} 失败`);
