// cloudfunctions/getGoodsList/index.js - 获取商品列表云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const {
    action = 'list',
    page = 1,
    pageSize = 10,
    categoryId,
    categoryIds,
    status,
    userId,
    keyword,
    sortBy = 'time',
    condition,
    category
  } = event;

  try {
    const wxContext = cloud.getWXContext();
    let query = {};

    if (action === 'myGoods') {
      // 我的发布 - 同时校验 _openid（系统字段）和 sellerId（显式字段）
      const openid = wxContext.OPENID;
      if (openid) {
        const ownerFilter = _.or([{ _openid: openid }, { sellerId: openid }]);
        query = status
          ? _.and([ownerFilter, { status: status }])
          : ownerFilter;
      } else {
        if (status) query.status = status;
      }
    } else if (action === 'byCategory') {
      // 按分类查询 - 仅显示在售
      query.status = 'selling';
      if (categoryId) {
        query.categoryId = categoryId;
      } else if (categoryIds && categoryIds.length > 0) {
        query.categoryId = _.in(categoryIds);
      }
    } else {
      // 普通列表查询 - 默认只显示在售
      if (status) {
        query.status = status;
      } else {
        query.status = 'selling';
      }
      if (categoryId) query.categoryId = categoryId;
      if (category) {
        // 判断该分类是否有子分类（如 agri 有 agri_vegetable, agri_fruit 等）
        const hasSubCategories = ['agri'].includes(category);
        if (hasSubCategories) {
          // 有子分类：用正则匹配所有子分类
          query.categoryId = db.RegExp({
            regexp: '^' + category + '_',
            options: 'i'
          });
        } else {
          // 无子分类：直接精确匹配
          query.categoryId = category;
        }
      }
      if (userId) query._openid = userId;
    }

    // 以下筛选仅对非 myGoods 的普通查询生效（myGoods 返回的是 command，不能直接加属性）
    if (action !== 'myGoods') {
      if (condition) query.condition = condition;
      if (keyword) {
        query.title = db.RegExp({
          regexp: keyword,
          options: 'i'
        });
      }
    }

    // 构建排序
    let orderBy = ['createTime', 'desc'];
    if (sortBy === 'price_asc') orderBy = ['price', 'asc'];
    if (sortBy === 'price_desc') orderBy = ['price', 'desc'];
    if (sortBy === 'hot') orderBy = ['viewCount', 'desc'];

    const skip = (page - 1) * pageSize;

    const countRes = await db.collection('goods').where(query).count();
    const total = countRes.total;

    const listRes = await db.collection('goods')
      .where(query)
      .orderBy(orderBy[0], orderBy[1])
      .skip(skip)
      .limit(pageSize)
      .get();

    // 转换 cloud:// 图片为临时 HTTPS URL（iOS 需要真实 URL 才能显示图片）
    const allFileIds = [];
    for (const item of listRes.data) {
      if (item.images && item.images.length > 0) {
        item.images.forEach(img => { if (img) allFileIds.push(img); });
      }
    }
    let fileUrlMap = {};
    if (allFileIds.length > 0) {
      try {
        // getTempFileURL 单次最多 50 个，超出的分批
        const unique = [...new Set(allFileIds.filter(Boolean))];
        for (let i = 0; i < unique.length; i += 50) {
          const batch = unique.slice(i, i + 50);
          const urlRes = await cloud.getTempFileURL({ fileList: batch });
          for (const f of urlRes.fileList) {
            if (f.tempFileURL) fileUrlMap[f.fileID] = f.tempFileURL;
          }
        }
      } catch (e) { console.warn('getTempFileURL 失败:', e); }
    }
    const list = listRes.data.map(item => ({
      ...item,
      coverUrl: (item.images && item.images[0] && fileUrlMap[item.images[0]]) || item.images?.[0] || '',
      images: (item.images || []).map(img => fileUrlMap[img] || img)
    }));

    return {
      success: true,
      data: { list, total, page, pageSize, hasMore: skip + listRes.data.length < total, myOpenid: wxContext.OPENID }
    };
  } catch (error) {
    return { success: false, message: '查询失败', error: error.message };
  }
};
