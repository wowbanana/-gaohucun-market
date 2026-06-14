// cloudfunctions/likePost/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { postId } = event;
  if (!postId) return { success: false, message: '缺少 postId' };
  
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    // 查询是否已点赞
    const likeRecord = await db.collection('likes').where({
      postId: postId,
      _openid: openid
    }).get();
    
    if (likeRecord.data.length > 0) {
      // 已点赞，取消点赞
      await db.collection('likes').doc(likeRecord.data[0]._id).remove();
      await db.collection('posts').doc(postId).update({
        data: {
          likeCount: _.inc(-1)
        }
      });
      return { success: true, data: { isLiked: false } };
    } else {
      // 未点赞，添加点赞
      await db.collection('likes').add({
        data: {
          postId: postId,
          _openid: openid,
          createTime: db.serverDate()
        }
      });
      await db.collection('posts').doc(postId).update({
        data: {
          likeCount: _.inc(1)
        }
      });
      return { success: true, data: { isLiked: true } };
    }
  } catch (error) {
    console.error('likePost error:', error);
    return { success: false, message: '操作失败', error: error.message };
  }
};
