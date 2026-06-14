// cloudfunctions/getPostList/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
async function batchConvert(fileIDs) { const urlMap = {}; if (!fileIDs || fileIDs.length === 0) return urlMap; try { const unique = [...new Set(fileIDs.filter(Boolean))]; if (unique.length === 0) return urlMap; const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) }); (res.fileList || []).forEach(f => { if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; }); } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); } return urlMap; }

exports.main = async (event, context) => {
  const { action = 'getList', postId, page = 1, pageSize = 10, sortBy = 'new', isMine = false } = event;
  try {
    if (action === 'detail') {
      if (!postId) return { success: false, message: '缺少 postId' };
      const res = await db.collection('posts').doc(postId).get();
      const post = res.data;
      // 转换帖子中的图片和头像
      if (post) {
        const fileIDs = [];
        if (post.images && post.images.length > 0) {
          post.images.forEach(img => { if (img) fileIDs.push(img); });
        }
        if (post.authorAvatar && post.authorAvatar.startsWith('cloud://')) {
          fileIDs.push(post.authorAvatar);
        }
        if (fileIDs.length > 0) {
          const urlMap = await batchConvert(fileIDs);
          post.images = (post.images || []).map(img => urlMap[img] || img);
          post.authorAvatar = urlMap[post.authorAvatar] || post.authorAvatar || '';
        }
      }
      return { success: true, data: post };
    }

    if (action === 'getList') {
      const skip = (page -1) * pageSize;

      let query = db.collection('posts');
      let countQuery = db.collection('posts');

      if (isMine) {
        const wxContext = cloud.getWXContext();
        query = query.where({ _openid: wxContext.OPENID });
        countQuery = countQuery.where({ _openid: wxContext.OPENID });
      }

      if (sortBy === 'hot') {
        query = query.orderBy('likeCount', 'desc').orderBy('commentCount', 'desc');
      } else {
        query = query.orderBy('createTime', 'desc');
      }

      const countRes = await countQuery.count();
      const listRes = await query.skip(skip).limit(pageSize).get();

      // 批量转换帖子中的图片和头像
      const allFileIDs = [];
      listRes.data.forEach(post => {
        if (post.images && post.images.length > 0) {
          post.images.forEach(img => { if (img) allFileIDs.push(img); });
        }
        if (post.authorAvatar && post.authorAvatar.startsWith('cloud://')) {
          allFileIDs.push(post.authorAvatar);
        }
      });
      const urlMap = await batchConvert(allFileIDs);

      const list = listRes.data.map(post => ({
        ...post,
        authorAvatar: urlMap[post.authorAvatar] || post.authorAvatar || '',
        images: (post.images || []).map(img => urlMap[img] || img)
      }));

      return {
        success: true,
        data: {
          list,
          total: countRes.total,
          hasMore: skip + listRes.data.length < countRes.total
        }
      };
    }

    return { success: false, message: '未知操作' };
  } catch (error) {
    console.error('getPostList error:', error);
    return { success: false, message: '查询失败', error: error.message };
  }
};
