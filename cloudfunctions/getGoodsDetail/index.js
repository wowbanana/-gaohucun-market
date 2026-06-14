// cloudfunctions/getGoodsDetail/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { id } = event;
  const wxContext = cloud.getWXContext();
  try {
    if (!id) return { success: false, message: '缺少商品ID' };

    const goodsRes = await db.collection('goods').doc(id).get();
    if (!goodsRes.data) return { success: false, message: '商品不存在' };

    const goods = goodsRes.data;

    // 更新浏览量（异步，不阻塞返回）
    db.collection('goods').doc(id).update({
      data: { viewCount: db.command.inc(1) }
    }).catch(() => {});

    goods.viewCount = (goods.viewCount || 0) + 1;

    // 确保返回 _openid（前端需要判断是否是自己的商品）
    // 云数据库 .get() 默认会返回 _openid，但为防止传输丢失，显式添加 sellerOpenid
    // sellerOpenid：优先用显式 sellerId，fallback 到 _openid
    // ⚠️ 绝不 fallback 到 wxContext.OPENID，否则查看者会变成"卖家"
    const sellerOpenid = goods.sellerId || goods._openid;
    goods.sellerOpenid = sellerOpenid;

    // 检查是否收藏
    const favRes = await db.collection('favorites').where({
      _openid: wxContext.OPENID,
      goodsId: id
    }).get();
    goods.isFavorited = favRes.data.length > 0;

    // 获取卖家信息
    try {
      const sellerRes = await db.collection('users').where({ _openid: sellerOpenid }).limit(1).get();
      if (sellerRes.data.length > 0) {
        goods.sellerName = sellerRes.data[0].nickName || '匿名用户';
        let sellerAvatar = sellerRes.data[0].avatarUrl || '';
        // 转换 cloud:// 头像为临时 HTTPS URL
        if (sellerAvatar && sellerAvatar.startsWith('cloud://')) {
          try {
            const avatarRes = await cloud.getTempFileURL({ fileList: [sellerAvatar] });
            if (avatarRes.fileList && avatarRes.fileList[0] && avatarRes.fileList[0].tempFileURL) {
              sellerAvatar = avatarRes.fileList[0].tempFileURL;
            }
          } catch (e) { console.warn('卖家头像转换失败:', e); }
        }
        goods.sellerAvatar = sellerAvatar || '/images/default-avatar.png';
        goods.sellerPhone = sellerRes.data[0].phone || '';
      }
    } catch (e) {
      goods.sellerName = '匿名用户';
      goods.sellerAvatar = '/images/default-avatar.png';
    }

    // 计算分类名称（categoryId → categoryName 映射）
    const categoryNameMap = {
      'agri_vegetable': '蔬菜', 'agri_fruit': '水果', 'agri_meat': '肉类', 'agri_grain': '粮油',
      'electronics': '家电数码', 'furniture': '家具家居', 'clothing': '衣物鞋帽',
      'baby': '母婴用品', 'other': '其他闲置'
    };
    goods.categoryName = categoryNameMap[goods.categoryId] || goods.categoryId || '未分类';

    // 序列化 Date 对象为 ISO 字符串（前端 new Date 可以直接解析）
    // 云函数返回的 Date 在 JSON 序列化时会变成 {$date: "ISO"} 格式
    // 我们主动转成时间戳，避免前端解析出错
    if (goods.createTime) {
      goods.createTimestamp = new Date(goods.createTime).getTime();
    }

    // 转换 cloud:// 图片为临时 HTTPS URL（iOS 需要真实 URL 才能显示图片）
    if (goods.images && goods.images.length > 0) {
      try {
        const urlRes = await cloud.getTempFileURL({ fileList: goods.images });
        goods.imageUrls = urlRes.fileList
          .filter(f => f.tempFileURL)
          .map(f => f.tempFileURL);
      } catch (e) { console.warn('getTempFileURL 失败:', e); }
    }
    // 确保 images 始终是数组
    if (!goods.imageUrls || goods.imageUrls.length === 0) {
      goods.imageUrls = goods.images || [];
    }

    return { success: true, data: goods };
  } catch (error) {
    console.error('getGoodsDetail error:', error);
    return { success: false, message: '查询失败', error: error.message };
  }
};
