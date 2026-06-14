// cloudfunctions/searchGoods/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
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
  const { keyword, page = 1, pageSize = 10, sortBy = 'time', condition } = event;
  try {
    let query = { status: 'selling' };
    if (keyword) {
      query = _.or([
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { description: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]);
      query.status = 'selling';
    }
    if (condition) query.condition = condition;

    let orderBy = ['createTime', 'desc'];
    if (sortBy === 'price_asc') orderBy = ['price', 'asc'];
    if (sortBy === 'price_desc') orderBy = ['price', 'desc'];

    const skip = (page - 1) * pageSize;
    const countRes = await db.collection('goods').where(query).count();
    const listRes = await db.collection('goods').where(query)
      .orderBy(orderBy[0], orderBy[1]).skip(skip).limit(pageSize).get();

    // 批量转换 cloud:// 图片 → HTTPS URL
    const fileIDs = [];
    listRes.data.forEach(item => {
      if (item.images && item.images[0]) fileIDs.push(item.images[0]);
      if (item.images) item.images.forEach(img => { if (img) fileIDs.push(img); });
    });
    const urlMap = await batchConvert(fileIDs);

    const list = listRes.data.map(item => ({
      ...item,
      coverUrl: urlMap[item.images?.[0]] || item.images?.[0] || '',
      images: (item.images || []).map(img => urlMap[img] || img)
    }));

    return { success: true, data: { list, total: countRes.total } };
  } catch (error) {
    return { success: false, message: '搜索失败', error: error.message };
  }
};
