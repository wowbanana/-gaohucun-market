// utils/util.js - 通用工具函数

/**
 * 格式化时间
 * @param {Date|number} date 日期对象或时间戳
 * @param {string} format 格式字符串
 * @returns {string}
 */
const formatTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (typeof date === 'number') {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return format
    .replace('YYYY', year)
    .replace('MM', padZero(month))
    .replace('DD', padZero(day))
    .replace('HH', padZero(hour))
    .replace('mm', padZero(minute))
    .replace('ss', padZero(second));
};

/**
 * 补零
 */
const padZero = (n) => {
  return n < 10 ? '0' + n : '' + n;
};

/**
 * 将云数据库返回的日期安全地转为毫秒时间戳
 * 云函数返回的 Date 会被序列化为 { $date: "ISO字符串" }
 * @param {*} val 任意日期表示
 * @returns {number} 毫秒时间戳，无效时返回 0
 */
const toTimestamp = (val) => {
  if (!val) return 0;
  // 数字时间戳
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  // Date 实例
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? 0 : t;
  }
  // 云数据库序列化格式 { $date: "2024-01-01T00:00:00.000Z" }
  if (typeof val === 'object' && val.$date) {
    const t = new Date(val.$date).getTime();
    return isNaN(t) ? 0 : t;
  }
  // 字符串或其他
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  }
  return 0;
};

/**
 * 计算相对时间（如：2小时前）
 * 支持数字时间戳、Date 对象、{ $date: "..." } 格式
 * @param {number|Date|object} timestamp
 * @returns {string}
 */
const getRelativeTime = (timestamp) => {
  const ts = toTimestamp(timestamp);
  if (ts === 0) return '未知时间';

  const now = Date.now();
  const diff = now - ts;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < 7 * day) {
    return Math.floor(diff / day) + '天前';
  } else {
    return formatTime(new Date(ts), 'MM-DD HH:mm');
  }
};

/**
 * 格式化价格
 * @param {number} price 价格数值
 * @param {string} unit 计价单位
 * @returns {string}
 */
const formatPrice = (price, unit = '元/件') => {
  if (!price && price !== 0) return '面议';
  
  const priceStr = '￥' + price;
  
  // 如果单位已经是"元/件"或"元/台"等，简化为"￥XX"
  if (unit === '元/件' || unit === '元/台' || unit === '元/套') {
    return priceStr;
  }
  
  return priceStr + unit.replace('元', '');
};

/**
 * 防抖函数
 * @param {Function} fn 目标函数
 * @param {number} delay 延迟时间
 * @returns {Function}
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 节流函数
 * @param {Function} fn 目标函数
 * @param {number} interval 间隔时间
 * @returns {Function}
 */
const throttle = (fn, interval = 300) => {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 显示加载提示
 * @param {string} title 提示文字
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title: title,
    mask: true
  });
};

/**
 * 隐藏加载提示
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示成功提示
 * @param {string} title 提示文字
 * @param {number} duration 持续时间
 */
const showSuccess = (title, duration = 2000) => {
  wx.showToast({
    title: title,
    icon: 'success',
    duration: duration
  });
};

/**
 * 显示失败提示
 * @param {string} title 提示文字
 * @param {number} duration 持续时间
 */
const showError = (title, duration = 2000) => {
  wx.showToast({
    title: title,
    icon: 'none',
    duration: duration
  });
};

/**
 * 显示确认对话框
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>}
 */
const showConfirm = (title, content) => {
  return new Promise((resolve) => {
    wx.showModal({
      title: title,
      content: content,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
};

/**
 * 复制文本到剪贴板
 * @param {string} text 要复制的文本
 * @param {string} tip 提示文字
 */
const copyToClipboard = (text, tip = '已复制到剪贴板') => {
  wx.setClipboardData({
    data: text,
    success: () => {
      wx.showToast({
        title: tip,
        icon: 'none',
        duration: 2000
      });
    }
  });
};

/**
 * 拨打电话
 * @param {string} phoneNumber 电话号码
 */
const makePhoneCall = (phoneNumber) => {
  if (!phoneNumber) {
    showError('电话号码为空');
    return;
  }
  
  wx.makePhoneCall({
    phoneNumber: phoneNumber,
    fail: (err) => {
      if (err.errMsg !== 'makePhoneCall:fail cancel') {
        showError('拨打电话失败');
      }
    }
  });
};

/**
 * 预览图片
 * @param {Array} urls 图片URL数组
 * @param {number} current 当前图片索引
 */
const previewImage = (urls, current = 0) => {
  wx.previewImage({
    urls: urls,
    current: urls[current]
  });
};

module.exports = {
  formatTime,
  toTimestamp,
  getRelativeTime,
  formatPrice,
  debounce,
  throttle,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showConfirm,
  copyToClipboard,
  makePhoneCall,
  previewImage
};
