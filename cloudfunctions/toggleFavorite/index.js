// cloudfunctions/toggleFavorite/index.js
// 添加/取消收藏（若不传 action 则自动切换）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { action, goodsId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    if (!goodsId) return { success: false, message: '缺少商品ID' };

    // 查询是否已收藏
    const existRes = await db.collection('favorites').where({
      _openid: openid,
      goodsId: goodsId
    }).get();
    const exist = existRes.data.length > 0;

    // 自动模式：不传 action 时切换
    const shouldAdd = action ? (action === 'add') : !exist;
    const shouldRemove = action ? (action === 'remove') : exist;

    if (shouldAdd && !exist) {
      await db.collection('favorites').add({
        data: {
          _openid: openid,
          goodsId: goodsId,
          createTime: db.serverDate()
        }
      });
      return { success: true, data: { isFavorited: true } };
    }

    if (shouldRemove && exist) {
      await db.collection('favorites').where({
        _openid: openid,
        goodsId: goodsId
      }).remove();
      return { success: true, data: { isFavorited: false } };
    }

    // 已处于目标状态，直接返回
    return { success: true, data: { isFavorited: exist } };
  } catch (error) {
    console.error('toggleFavorite error:', error);
    return { success: false, message: '操作失败', error: error.message };
  }
};
