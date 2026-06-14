// cloudfunctions/getHotRank/index.js
// 返回热门商品列表 / 热搜词
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
// 批量转换 cloud:// fileID → HTTPS URL（内联，云函数独立部署无法跨目录 require）
async function batchConvert(fileIDs) {
  const urlMap = {};
  if (!fileIDs || fileIDs.length === 0) return urlMap;
  try {
    const unique = [...new Set(fileIDs.filter(Boolean))];
    if (unique.length === 0) return urlMap;
    const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) });
    (res.fileList || []).forEach(f => {
      if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
    });
  } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); }
  return urlMap;
}

exports.main = async (event) => {
  const { action = 'goods', limit = 20 } = event;

  try {
    if (action === 'keywords') {
      const res = await db.collection('goods')
        .where({ status: 'selling' })
        .field({ title: true, viewCount: true })
        .limit(200)
        .get();

      const wordCount = {};
      const stopWords = ['的', '了', '在', '是', '我', '有', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些', '么', '吗'];

      res.data.forEach(goods => {
        const title = goods.title || '';
        const words = title.split(/[,，、。！？\s]+/).filter(Boolean);
        words.forEach(word => {
          if (word.length >= 2 && word.length <= 8 && !stopWords.includes(word)) {
            wordCount[word] = (wordCount[word] || 0) + 1;
          }
        });
      });

      const keywords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([keyword, count]) => ({ keyword, count }));

      return { success: true, data: keywords };
    }

    // 热门商品（默认）
    const res = await db.collection('goods')
      .where({ status: 'selling' })
      .orderBy('viewCount', 'desc')
      .limit(limit)
      .get();

    // 收集 cloud:// fileID 并批量转换
    const fileIDs = [];
    res.data.forEach(g => {
      if (g.images && g.images[0]) fileIDs.push(g.images[0]);
    });
    const urlMap = await batchConvert(fileIDs);

    const list = res.data.map(g => ({
      _id: g._id,
      goodsId: g._id,
      title: g.title,
      imageUrl: urlMap[g.images?.[0]] || g.images?.[0] || '',
      price: g.price,
      viewCount: g.viewCount || 0,
      score: g.viewCount || 0
    }));

    return { success: true, data: list };
  } catch (error) {
    console.error('getHotRank error:', error);
    return { success: false, message: '查询失败', error: error.message };
  }
};
