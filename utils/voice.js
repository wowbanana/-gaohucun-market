// utils/voice.js - 语音录音/播放/上传模块

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0''";
  const s = Math.round(seconds);
  if (s < 60) return s + "''";
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return min + "'" + (sec < 10 ? '0' : '') + sec + "''";
};

const uploadVoice = (tempFilePath) => {
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
      fail: (err) => reject(err)
    });
  });
};

/**
 * 创建录音器实例
 *
 * 用法:
 *   const recorder = createVoiceRecorder();
 *   recorder.onStateChange(({isRecording, currentDuration}) => { ... });
 *
 *   // 录音
 *   await recorder.requestAuth();
 *   const promise = recorder.start();  // 返回 Promise<{tempFilePath, duration}>
 *
 *   // 松手 → 正常停止
 *   recorder.stop();   // 触发 promise resolve
 *
 *   // 取消 → 丢弃录音
 *   recorder.cancel();  // 触发 promise reject
 */
const createVoiceRecorder = () => {
  const rm = wx.getRecorderManager();
  let timerInterval = null;
  let startTime = 0;
  let _onStateChange = null;
  let _isRecording = false;
  let _currentDuration = 0;
  let _pending = null;  // { resolve, reject, settled }

  const startTimer = () => {
    stopTimer();
    startTime = Date.now();
    _currentDuration = 0;
    timerInterval = setInterval(() => {
      _currentDuration = Math.floor((Date.now() - startTime) / 1000);
      if (_onStateChange) _onStateChange({ isRecording: true, currentDuration: _currentDuration });
    }, 200);
  };

  const stopTimer = () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  };

  const notifyState = () => {
    if (_onStateChange) _onStateChange({ isRecording: _isRecording, currentDuration: _currentDuration });
  };

  // 全局 onStart — 录音真正开始时触发
  rm.onStart(() => {
    _isRecording = true;
    startTimer();
    notifyState();
  });

  // 全局 onStop — 录音结束时触发（无论是 stop() 还是 cancel() 调用）
  rm.onStop((res) => {
    _isRecording = false;
    stopTimer();
    _currentDuration = 0;
    notifyState();

    // 如果有等待中的 Promise，resolve 它
    if (_pending && !_pending.settled) {
      _pending.settled = true;
      const durationMs = res.duration || (Date.now() - startTime);
      _pending.resolve({ tempFilePath: res.tempFilePath, duration: durationMs });
      _pending = null;
    }
  });

  // 全局 onError
  rm.onError((err) => {
    console.error('录音器错误:', err);
    _isRecording = false;
    stopTimer();
    _currentDuration = 0;
    notifyState();

    if (_pending && !_pending.settled) {
      _pending.settled = true;
      _pending.reject(err);
      _pending = null;
    }
  });

  return {
    get isRecording() { return _isRecording; },
    get currentDuration() { return _currentDuration; },

    onStateChange(cb) { _onStateChange = cb; },

    requestAuth() {
      return new Promise((resolve, reject) => {
        wx.getSetting({
          success: (res) => {
            if (res.authSetting['scope.record'] === false) {
              wx.showModal({
                title: '需要麦克风权限',
                content: '发送语音消息需要使用麦克风，请在设置中开启',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting({
                      success: (settingRes) => {
                        settingRes.authSetting['scope.record'] ? resolve() : reject(new Error('未授权'));
                      },
                      fail: reject
                    });
                  } else {
                    reject(new Error('取消授权'));
                  }
                }
              });
            } else {
              resolve();
            }
          },
          fail: reject
        });
      });
    },

    start() {
      return new Promise((resolve, reject) => {
        if (_isRecording) {
          reject(new Error('已在录音中'));
          return;
        }

        _pending = { resolve, reject, settled: false };

        rm.start({
          duration: 60000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: 'mp3'
        });
      });
    },

    stop() {
      if (!_isRecording) return;
      rm.stop();
    },

    cancel() {
      if (!_isRecording) {
        if (_pending && !_pending.settled) {
          _pending.settled = true;
          _pending.reject(new Error('已取消'));
          _pending = null;
        }
        return;
      }
      // 标记为取消，onStop 回调中 reject
      if (_pending && !_pending.settled) {
        _pending.settled = true;
        _pending.reject(new Error('已取消'));
        _pending = null;
      }
      _isRecording = false;
      stopTimer();
      _currentDuration = 0;
      notifyState();
      rm.stop();
    },

    destroy() {
      stopTimer();
      if (_pending && !_pending.settled) {
        _pending.settled = true;
        _pending.reject(new Error('已销毁'));
        _pending = null;
      }
      _onStateChange = null;
    }
  };
};

/**
 * 创建语音播放器实例
 */
const createVoicePlayer = () => {
  const audioCtx = wx.createInnerAudioContext();
  let _isPlaying = false;
  let _playingId = null;
  let _onStateChange = null;

  audioCtx.onEnded(() => {
    _isPlaying = false;
    _playingId = null;
    if (_onStateChange) _onStateChange({ isPlaying: false, playingId: null });
  });

  audioCtx.onError((err) => {
    console.error('语音播放失败:', err);
    _isPlaying = false;
    _playingId = null;
    if (_onStateChange) _onStateChange({ isPlaying: false, playingId: null });
  });

  audioCtx.onStop(() => {
    _isPlaying = false;
    _playingId = null;
    if (_onStateChange) _onStateChange({ isPlaying: false, playingId: null });
  });

  return {
    get isPlaying() { return _isPlaying; },
    get playingId() { return _playingId; },

    onStateChange(cb) { _onStateChange = cb; },

    play(url, id) {
      if (_isPlaying && _playingId === id) {
        audioCtx.pause();
        return;
      }
      audioCtx.stop();
      audioCtx.src = url;
      audioCtx.play();
      _isPlaying = true;
      _playingId = id || null;
      if (_onStateChange) _onStateChange({ isPlaying: true, playingId: _playingId });
    },

    stop() {
      audioCtx.stop();
      _isPlaying = false;
      _playingId = null;
      if (_onStateChange) _onStateChange({ isPlaying: false, playingId: null });
    },

    destroy() {
      audioCtx.destroy();
      _isPlaying = false;
      _playingId = null;
      _onStateChange = null;
    }
  };
};

module.exports = {
  createVoiceRecorder,
  createVoicePlayer,
  uploadVoice,
  formatDuration
};
