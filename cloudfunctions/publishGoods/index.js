// cloudfunctions/publishGoods/index.js - 发布商品云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const {
    title,
    description,
    price,
    priceUnit,
    condition,
    categoryId,
    images,
    location,
    contactInfo
  } = event;

  // 参数校验
  if (!title || !price || !categoryId) {
    return { success: false, message: '缺少必要参数' };
  }

  try {
    const newGoods = {
      title: title.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      priceUnit: priceUnit || '件',
      condition: condition || '八成新',
      categoryId,
      images: images || [],
      location: location || '高湖村',
      contactInfo: contactInfo || '',
      sellerId: openid,
      sellerName: '',
      sellerAvatar: '',
      status: 'selling', // selling/off/sold/deleted
      viewCount: 0,
      favoriteCount: 0,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    // 获取卖家信息
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      newGoods.sellerName = user.nickName || '高湖村邻居';
      newGoods.sellerAvatar = user.avatarUrl || '';
      newGoods.sellerPhone = user.phone || '';
    }

    const result = await db.collection('goods').add({ data: newGoods });

    // 更新分类商品计数
    await db.collection('categories').where({ id: categoryId }).update({
      data: { goodsCount: db.command.inc(1) }
    });

    return {
      success: true,
      data: { goodsId: result._id }
    };
  } catch (error) {
    console.error('发布商品失败:', error);
    return { success: false, message: '发布失败', error: error.message };
  }
};
