// cloudfunctions/updateGoods/index.js - 更新商品信息
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { goodsId, title, description, categoryId, price, priceUnit, condition, contactInfo, images } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    if (!goodsId) return { success: false, message: '缺少商品ID' };

    // 验证商品属于当前用户
    const goodsRes = await db.collection('goods').doc(goodsId).get();
    // 同时校验 _openid 和 sellerId（商品可能通过 sellerId 关联卖家）
    if (!goodsRes.data || (goodsRes.data._openid !== openid && goodsRes.data.sellerId !== openid)) {
      return { success: false, message: '无权编辑此商品' };
    }

    // 构建更新数据
    const updateData = {
      updateTime: db.serverDate()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (price !== undefined) updateData.price = price;
    if (priceUnit !== undefined) updateData.priceUnit = priceUnit;
    if (condition !== undefined) updateData.condition = condition;
    if (contactInfo !== undefined) updateData.contactInfo = contactInfo;
    if (images !== undefined) updateData.images = images;

    await db.collection('goods').doc(goodsId).update({
      data: updateData
    });

    return { success: true, data: { goodsId } };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
