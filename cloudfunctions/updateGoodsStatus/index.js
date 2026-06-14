// cloudfunctions/updateGoodsStatus/index.js - 更新商品状态
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { goodsId, status } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    if (!goodsId) return { success: false, message: '缺少商品ID' };
    if (!status) return { success: false, message: '缺少状态参数' };

    // 验证商品属于当前用户（同时校验 _openid 和 sellerId）
    const goodsRes = await db.collection('goods').doc(goodsId).get();
    const goods = goodsRes.data;
    if (!goods) {
      return { success: false, message: '商品不存在' };
    }
    const isOwner = (goods._openid && goods._openid === openid)
      || (goods.sellerId && goods.sellerId === openid);
    if (!isOwner) {
      return { success: false, message: '无权操作此商品' };
    }

    // 更新状态
    await db.collection('goods').doc(goodsId).update({
      data: {
        status: status,
        updateTime: db.serverDate()
      }
    });

    return { success: true, data: { goodsId, status } };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
