// cloudfunctions/getFavoriteStatus/index.js
// 查询当前用户对某商品的收藏状态
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { goodsId } = event;
  const wxContext = cloud.getWXContext();
  try {
    if (!goodsId) return { success: false, message: '缺少商品ID' };

    const favRes = await db.collection('favorites').where({
      _openid: wxContext.OPENID,
      goodsId: goodsId
    }).get();

    return {
      success: true,
      data: { isFavorited: favRes.data.length > 0 }
    };
  } catch (error) {
    console.error('getFavoriteStatus error:', error);
    return { success: false, message: '查询失败', error: error.message };
  }
};
