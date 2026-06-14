// cloudfunctions/getWantedList/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
async function batchConvert(fileIDs) { const urlMap = {}; if (!fileIDs || fileIDs.length === 0) return urlMap; try { const unique = [...new Set(fileIDs.filter(Boolean))]; if (unique.length === 0) return urlMap; const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) }); (res.fileList || []).forEach(f => { if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; }); } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); } return urlMap; }

exports.main = async (event) => {
  const { page = 1, pageSize = 10, status = 'open' } = event;
  try {
    const query = status ? { status } : {};
    const skip = (page - 1) * pageSize;
    const countRes = await db.collection('wanted').where(query).count();
    const listRes = await db.collection('wanted').where(query)
      .orderBy('createTime', 'desc').skip(skip).limit(pageSize).get();

    // 批量转换图片 cloud:// URL
    const fileIDs = [];
    listRes.data.forEach(item => {
      if (item.images && item.images.length > 0) {
        item.images.forEach(img => { if (img) fileIDs.push(img); });
      }
    });
    const urlMap = await batchConvert(fileIDs);

    const list = listRes.data.map(item => ({
      ...item,
      images: (item.images || []).map(img => urlMap[img] || img)
    }));

    return { success: true, data: { list, total: countRes.total } };
  } catch (error) {
    return { success: false, message: '查询失败', error: error.message };
  }
};
