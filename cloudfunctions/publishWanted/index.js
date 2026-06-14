// cloudfunctions/publishWanted/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { title, description, budgetMin, budgetMax, categoryId, images } = event;
  try {
    const newWanted = {
      title: title.trim(),
      description: description ? description.trim() : '',
      budgetMin: budgetMin ? Number(budgetMin) : 0,
      budgetMax: budgetMax ? Number(budgetMax) : 0,
      categoryId: categoryId || '',
      images: images || [],
      userId: wxContext.OPENID,
      status: 'open',
      responseCount: 0,
      createTime: db.serverDate()
    };
    const userRes = await db.collection('users').where({ _openid: wxContext.OPENID }).get();
    if (userRes.data.length > 0) {
      newWanted.userName = userRes.data[0].nickName;
      newWanted.userAvatar = userRes.data[0].avatarUrl;
    }
    const result = await db.collection('wanted').add({ data: newWanted });
    return { success: true, data: { wantedId: result._id } };
  } catch (error) {
    return { success: false, message: '发布失败', error: error.message };
  }
};
