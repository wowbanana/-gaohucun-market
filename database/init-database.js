// database/init-database.js - 数据库初始化脚本
// 在微信开发者工具的云开发控制台中，进入"数据库" -> "高级操作" -> "索引管理" 运行此脚本
// 或直接在云函数中使用此脚本初始化数据库

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

module.exports = async (event, context) => {
  try {
    // 1. 创建集合（如果不存在）
    // 注意：集合需要通过云开发控制台手动创建，此处仅初始化索引和基础数据

    // 2. 初始化分类数据
    const categories = [
      { id: 'agri_vegetable', name: '蔬菜', icon: '🥬', parent: 'agri', goodsCount: 0, createTime: new Date() },
      { id: 'agri_fruit', name: '水果', icon: '🍎', parent: 'agri', goodsCount: 0, createTime: new Date() },
      { id: 'agri_meat', name: '肉类', icon: '🥩', parent: 'agri', goodsCount: 0, createTime: new Date() },
      { id: 'agri_grain', name: '粮油', icon: '🌾', parent: 'agri', goodsCount: 0, createTime: new Date() },
      { id: 'electronics', name: '家电数码', icon: '📺', parent: '', goodsCount: 0, createTime: new Date() },
      { id: 'furniture', name: '家具家居', icon: '🪑', parent: '', goodsCount: 0, createTime: new Date() },
      { id: 'clothing', name: '衣物鞋帽', icon: '👕', parent: '', goodsCount: 0, createTime: new Date() },
      { id: 'baby', name: '母婴用品', icon: '🍼', parent: '', goodsCount: 0, createTime: new Date() },
      { id: 'other', name: '其他闲置', icon: '📦', parent: '', goodsCount: 0, createTime: new Date() }
    ];

    // 检查是否已初始化
    const catRes = await db.collection('categories').count();
    if (catRes.total === 0) {
      for (const cat of categories) {
        await db.collection('categories').add({ data: cat });
      }
      console.log('分类数据初始化完成');
    }

    // 3. 初始化公告数据
    const notices = [
      {
        title: '欢迎使用高湖村二手市场！',
        type: 'important',
        content: '本平台专供高湖村村民使用，请大家诚信交易，友好沟通。发布商品时请如实描述商品成色，支持 village 经济发展！',
        images: [],
        author: '高湖村委',
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        title: '农产品交易提醒',
        type: 'normal',
        content: '时鲜农产品（蔬菜、水果等）建议当面交易，确保新鲜。支持按斤、按两灵活计价。',
        images: [],
        author: '高湖村委',
        createTime: new Date(),
        updateTime: new Date()
      }
    ];

    const noticeRes = await db.collection('notices').count();
    if (noticeRes.total === 0) {
      for (const notice of notices) {
        await db.collection('notices').add({ data: notice });
      }
      console.log('公告数据初始化完成');
    }

    // 4. 创建数据库索引（建议在控制台手动创建）
    // goods 集合索引：
    //   - sellerId (普通索引)
    //   - categoryId (普通索引)
    //   - status + createTime (复合索引)
    //   - title (文本索引，用于搜索)
    // users 集合索引：
    //   - _openid (唯一索引)
    // favorites 集合索引：
    //   - userId + goodsId (复合唯一索引)
    // wanted 集合索引：
    //   - userId (普通索引)
    //   - status + createTime (复合索引)
    // posts 集合索引：
    //   - authorId (普通索引)
    // comments 集合索引：
    //   - postId (普通索引)

    return {
      success: true,
      message: '数据库初始化完成',
      data: {
        categories: categories.length,
        notices: notices.length
      }
    };
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return {
      success: false,
      message: '初始化失败',
      error: error.message
    };
  }
};
