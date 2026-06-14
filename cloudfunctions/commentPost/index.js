// cloudfunctions/commentPost/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
async function batchConvert(fileIDs) { const urlMap = {}; if (!fileIDs || fileIDs.length === 0) return urlMap; try { const unique = [...new Set(fileIDs.filter(Boolean))]; if (unique.length === 0) return urlMap; const res = await cloud.getTempFileURL({ fileList: unique.slice(0, 50) }); (res.fileList || []).forEach(f => { if (f.fileID && f.tempFileURL) urlMap[f.fileID] = f.tempFileURL; }); } catch (e) { console.warn('[batchConvert] 失败:', e.message || e); } return urlMap; }

exports.main = async (event) => {
  const { action, postId, content, replyToId, commentId, type = 'text', duration = 0 } = event;
  const wxContext = cloud.getWXContext();
  try {
    if (action === 'create') {
      const userRes = await db.collection('users').where({ _openid: wxContext.OPENID }).get();
      const user = userRes.data[0] || {};

      let replyToName = '';
      let replyToAuthorId = '';
      if (replyToId) {
        const replyRes = await db.collection('comments').doc(replyToId).get();
        if (replyRes.data) {
          replyToName = replyRes.data.authorName || '';
          replyToAuthorId = replyRes.data.authorId || '';
        }
      }

      await db.collection('comments').add({
        data: {
          postId,
          content,
          type,       // 'text' | 'voice'
          duration: type === 'voice' ? (duration || 0) : 0,
          replyToId: replyToId || '',
          replyToName,
          authorId: wxContext.OPENID,
          authorName: user.nickName || '高湖村邻居',
          authorAvatar: user.avatarUrl || '',
          createTime: db.serverDate()
        }
      });
      await db.collection('posts').doc(postId).update({
        data: { commentCount: db.command.inc(1) }
      });

      // 创建消息通知（评论/回复通知）
      const myOpenid = wxContext.OPENID;
      const myName = user.nickName || '高湖村邻居';
      const myAvatar = user.avatarUrl || '';

      // 获取帖子信息
      let postTitle = '留言';
      let postAuthorId = '';
      try {
        const postRes = await db.collection('posts').doc(postId).get();
        if (postRes.data) {
          postTitle = postRes.data.title || '留言';
          postAuthorId = postRes.data._openid || '';
        }
      } catch (e) { /* 忽略 */ }

      // 通知内容预览（语音消息显示 [语音]）
      const commentPreview = type === 'voice' ? '[语音]' : content.slice(0, 80);

      // 通知对象去重
      const notifiedSet = new Set();

      // 通知帖子作者（如果不是自己评论自己的帖子）
      if (postAuthorId && postAuthorId !== myOpenid && !notifiedSet.has(postAuthorId)) {
        notifiedSet.add(postAuthorId);
        await db.collection('notifications').add({
          data: {
            type: 'comment',
            postId,
            postTitle,
            commentContent: commentPreview,
            fromUser: { openid: myOpenid, nickName: myName, avatarUrl: myAvatar },
            toOpenid: postAuthorId,
            read: false,
            createTime: db.serverDate()
          }
        }).catch(() => {});
      }

      // 如果是回复某条评论，也通知被回复的人（不是自己和帖子作者才发，避免重复）
      if (replyToAuthorId && replyToAuthorId !== myOpenid && replyToAuthorId !== postAuthorId && !notifiedSet.has(replyToAuthorId)) {
        notifiedSet.add(replyToAuthorId);
        await db.collection('notifications').add({
          data: {
            type: 'comment',
            postId,
            postTitle,
            commentContent: commentPreview,
            fromUser: { openid: myOpenid, nickName: myName, avatarUrl: myAvatar },
            toOpenid: replyToAuthorId,
            read: false,
            createTime: db.serverDate()
          }
        }).catch(() => {});
      }

      return { success: true };
    }

    if (action === 'getList') {
      const listRes = await db.collection('comments')
        .where({ postId })
        .orderBy('createTime', 'asc')
        .get();

      const comments = listRes.data;

      // 收集所有 cloud:// 头像 URL + 语音 URL
      const allFileIDs = [];
      comments.forEach(c => {
        if (c.authorAvatar && c.authorAvatar.startsWith('cloud://')) {
          allFileIDs.push(c.authorAvatar);
        }
        if (c.type === 'voice' && c.content && c.content.startsWith('cloud://')) {
          allFileIDs.push(c.content);
        }
      });
      const urlMap = await batchConvert(allFileIDs);

      // 转换头像和语音
      const converted = comments.map(c => ({
        ...c,
        authorAvatar: urlMap[c.authorAvatar] || c.authorAvatar || '',
        content: (c.type === 'voice' && urlMap[c.content]) ? urlMap[c.content] : c.content
      }));

      // 构建嵌套结构
      const topLevel = [];
      const replyMap = {};

      converted.forEach(c => {
        if (!c.replyToId) {
          c.replies = [];
          topLevel.push(c);
        } else {
          if (!replyMap[c.replyToId]) replyMap[c.replyToId] = [];
          replyMap[c.replyToId].push(c);
        }
      });

      topLevel.forEach(c => {
        if (replyMap[c._id]) {
          c.replies = replyMap[c._id];
        }
      });

      return { success: true, data: topLevel };
    }

    if (action === 'toggleLike') {
      return { success: true };
    }

    return { success: false, message: '未知操作' };
  } catch (error) {
    return { success: false, message: '操作失败', error: error.message };
  }
};
