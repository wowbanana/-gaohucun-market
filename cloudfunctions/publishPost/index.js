// cloudfunctions/publishPost/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { title, content, images, group } = event;
  try {
    // 查找或自动创建用户记录
    let userRes = await db.collection('users').where({ _openid: wxContext.OPENID }).get();
    let user = userRes.data[0];
    if (!user) {
      // 用户首次使用，自动创建记录（避免后续显示"微信用户"）
      const addRes = await db.collection('users').add({
        data: {
          _openid: wxContext.OPENID,
          nickName: '村民',
          avatarUrl: '',
          phone: '',
          group: '',
          createTime: db.serverDate(),
          lastLoginTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      user = { _id: addRes._id, nickName: '村民', avatarUrl: '' };
    }

    const result = await db.collection('posts').add({
      data: {
        title, content, images: images || [],
        group: group || '', authorId: wxContext.OPENID,
        authorName: user.nickName || '村民', authorAvatar: user.avatarUrl || '',
        likeCount: 0, commentCount: 0, createTime: db.serverDate()
      }
    });
    return { success: true, data: { postId: result._id } };
  } catch (error) {
    return { success: false, message: '发布失败', error: error.message };
  }
};
