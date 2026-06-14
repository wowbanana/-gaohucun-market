// cloudfunctions/getFavoriteList/index.js - 获取我的收藏列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { page = 1, pageSize = 10 } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const skip = (page - 1) * pageSize;

    // 查询收藏记录
    const favRes = await db.collection('favorites')
      .where({ _openid: openid })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 根据收藏记录中的 goodsId 批量查询商品信息
    // 收集所有 cloud:// fileID，统一换取临时链接
    const fileIDs = [];
    const tempList = [];
    for (const fav of favRes.data) {
      try {
        const goodsRes = await db.collection('goods').doc(fav.goodsId).get();
        const goods = goodsRes.data;
        const firstImage = (goods.images && goods.images[0]) || '';
        if (firstImage && firstImage.startsWith('cloud://')) {
          fileIDs.push(firstImage);
        }
        tempList.push({
          _id: fav._id,
          goodsId: fav.goodsId,
          goodsTitle: goods.title || '商品已删除',
          goodsPrice: goods.price || 0,
          goodsUnit: goods.priceUnit || '',
          goodsImage: firstImage,
          goodsCondition: goods.condition || '',
          goodsStatus: goods.status || 'selling',
          favTime: fav.createTime
        });
      } catch (e) {
        tempList.push({
          _id: fav._id,
          goodsId: fav.goodsId,
          goodsTitle: '商品已删除',
          goodsPrice: 0,
          goodsUnit: '',
          goodsImage: '',
          goodsCondition: '',
          goodsStatus: 'deleted',
          favTime: fav.createTime
        });
      }
    }

    // 批量换取临时 HTTPS 链接
    if (fileIDs.length > 0) {
      try {
        const tempRes = await cloud.getTempFileURL({ fileList: fileIDs });
        const urlMap = {};
        (tempRes.fileList || []).forEach(f => {
          if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
        });
        tempList.forEach(item => {
          if (item.goodsImage && urlMap[item.goodsImage]) {
            item.goodsImage = urlMap[item.goodsImage];
          }
        });
      } catch (e) {
        console.error('换取临时链接失败:', e);
        // 失败时清空 cloud:// URL（前端会用默认图兜底）
        tempList.forEach(item => {
          if (item.goodsImage && item.goodsImage.startsWith('cloud://')) {
            item.goodsImage = '';
          }
        });
      }
    }

    const list = tempList;

    const hasMore = favRes.data.length >= pageSize;

    return { success: true, data: { list, hasMore } };
  } catch (error) {
    console.error('getFavoriteList error:', error);
    return { success: false, message: '查询失败', error: error.message };
  }
};
