// utils/request.js - 云开发请求封装
// 使用 wx.cloud.callFunction 调用云函数，无需配置域名白名单

/**
 * 调用云函数
 * @param {string} name 云函数名称
 * @param {Object} data 传入参数
 * @returns {Promise<Object>} 云函数返回结果
 */
const callFunction = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: name,
      data: data,
      success: (res) => {
        const result = res.result || {};
        // 兼容两种返回格式：
        // 格式1: { success: true, data: ... }
        // 格式2: { code: 0, data: ... }
        if (result.success === true || result.code === 0 || result.code === 200) {
          resolve(result.data !== undefined ? result.data : result);
        } else {
          const errMsg = result.message || result.msg || result.errMsg || '请求失败';
          console.error(`云函数[${name}]业务错误:`, errMsg);
          reject({ code: result.code || -1, message: errMsg });
        }
      },
      fail: (err) => {
        console.error(`云函数[${name}]调用失败:`, err);
        reject({ code: -1, message: '网络错误，请稍后重试', detail: err });
      }
    });
  });
};

/**
 * 上传图片到云存储
 * @param {string} filePath 本地文件路径
 * @param {string} cloudPath 云存储路径
 * @returns {Promise<string>} 文件ID
 */
const uploadImage = (filePath, cloudPath) => {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: (res) => {
        resolve(res.fileID);
      },
      fail: (err) => {
        console.error('图片上传失败:', err);
        reject({ code: -1, message: '图片上传失败', detail: err });
      }
    });
  });
};

/**
 * 批量上传图片到云存储
 * @param {Array} filePaths 本地文件路径数组
 * @param {string} folder 云存储文件夹名
 * @returns {Promise<Array>} fileID数组
 */
const uploadImages = async (filePaths, folder = 'goods') => {
  const timestamp = Date.now();
  const uploadTasks = filePaths.map((filePath, index) => {
    const ext = filePath.split('.').pop() || 'jpg';
    const cloudPath = `${folder}/${timestamp}_${index}.${ext}`;
    return uploadImage(filePath, cloudPath);
  });

  try {
    const fileIDs = await Promise.all(uploadTasks);
    return fileIDs;
  } catch (err) {
    console.error('批量上传失败:', err);
    throw err;
  }
};

/**
 * 删除云存储文件
 * @param {Array} fileIDs 文件ID数组
 * @returns {Promise}
 */
const deleteFiles = (fileIDs) => {
  return new Promise((resolve, reject) => {
    wx.cloud.deleteFile({
      fileList: fileIDs,
      success: (res) => {
        resolve(res.fileList);
      },
      fail: (err) => {
        console.error('文件删除失败:', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取云存储文件临时链接
 * @param {Array} fileIDs 文件ID数组
 * @returns {Promise<Array>} 文件链接列表
 */
const getTempFileURLs = (fileIDs) => {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: (res) => {
        resolve(res.fileList);
      },
      fail: (err) => {
        console.error('获取文件链接失败:', err);
        reject(err);
      }
    });
  });
};

/**
 * 上传语音到云存储
 * @param {string} tempFilePath 录音临时文件路径
 * @returns {Promise<string>} 文件ID
 */
const uploadVoiceFile = (tempFilePath) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const extMatch = tempFilePath.match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1] : 'mp3';
  const cloudPath = 'voices/' + timestamp + '-' + random + '.' + ext;

  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempFilePath,
      success: (res) => resolve(res.fileID),
      fail: (err) => {
        console.error('语音上传失败:', err);
        reject({ code: -1, message: '语音上传失败', detail: err });
      }
    });
  });
};

module.exports = {
  callFunction,
  uploadImage,
  uploadImages,
  uploadVoiceFile,
  deleteFiles,
  getTempFileURLs
};
