const app = getApp()
const { speak } = require('./tts.js')

Page({
  data: {
    statusBarHeight: 20,
    messages: [],
    inputText: '',
    loading: false,
    scrollTop: 99999,
    quickQuestions: [
      '如何切换园区？',
      '数据异常办？',
      '传感器离线？',
      '修改预警值',
      '找回密码'
    ],
    isRecording: false,
    recordingTime: 0,
    isUploading: false,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    this.fetchHistory()
  },

  onShow() {
    this.setData({ scrollTop: 99999 })
  },

  fetchHistory() {
    wx.request({
      url: app.globalData.baseUrl + '/api/chat/history',
      method: 'GET',
      header: { 'X-User-Id': app.globalData.userId || 1 },
      data: { limit: 50 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const msgs = res.data.data.map(item => ({
            question: item.question,
            answer: item.answer,
            time: this.formatTime(item.createTime)
          }))
          this.setData({ messages: msgs, scrollTop: 99999 })
        }
      }
    })
  },

  onQuickTap(e) {
    const q = e.currentTarget.dataset.q
    this.setData({ inputText: q })
    this.onSend()
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  // ==================== 语音：点击切换 ====================

  // 点击麦克风图标：非录音→开始，录音中→停止并发送
  onVoiceTap() {
    if (this.data.isRecording) {
      this._stopAndSend()
    } else {
      this._startRecord()
    }
  },

  _startRecord() {
    // 直接调用录音，跳过权限检查（微信已弹过授权框）
    this._doStartRecord()
  },

  _doStartRecord() {
    const rec = wx.getRecorderManager()
    this._recorder = rec
    this._recordingFilePath = null

    rec.onStart(() => {
      console.log('[录音] onStart')
    })

    rec.onStop((res) => {
      console.log('[录音] onStop, tempFilePath:', res.tempFilePath)
      this._recordingFilePath = res.tempFilePath
    })

    rec.onError((err) => {
      console.error('[录音] onError:', err)
      clearInterval(this._recordingTimer)
      clearTimeout(this._recordTimeout)
      this.setData({ isRecording: false, recordingTime: 0 })
      wx.showModal({
        title: '录音失败',
        content: '错误: ' + (err.errMsg || err.errCode || '未知'),
        showCancel: false,
        confirmText: '我知道了'
      })
    })

    this.setData({ isRecording: true, recordingTime: 0 })
    this._recordingTimer = setInterval(() => {
      this.setData({ recordingTime: this.data.recordingTime + 1 })
    }, 1000)

    this._recordTimeout = setTimeout(() => {
      if (this.data.isRecording) {
        wx.showToast({ title: '录音超时', icon: 'none' })
        this._stopAndSend()
      }
    }, 30000)

    rec.start({
      format: 'aac',
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 128000,
      duration: 60000,
    })
  },

  // 点击停止/发送
  _stopAndSend() {
    if (this.data.isUploading) return
    clearInterval(this._recordingTimer)
    clearTimeout(this._recordTimeout)
    const rec = this._recorder
    const savedPath = this._recordingFilePath
    this.setData({ isRecording: false, recordingTime: 0, isUploading: true })

    if (!rec) {
      this.setData({ isUploading: false })
      wx.showToast({ title: '录音未开始', icon: 'none' })
      return
    }

    rec.stop({
      success: (res) => {
        const path = res.tempFilePath || savedPath
        this.setData({ isUploading: false })
        if (path) {
          this._uploadVoice(path)
        } else {
          wx.showToast({ title: '录音文件无效', icon: 'none' })
        }
      },
      fail: (err) => {
        this.setData({ isUploading: false })
        wx.showModal({
          title: '停止失败',
          content: '错误: ' + (err.errMsg || err.errCode || '未知'),
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    })
  },

  // 点击取消
  onVoiceCancel() {
    clearTimeout(this._recordTimeout)
    clearInterval(this._recordingTimer)
    this.setData({ isRecording: false, recordingTime: 0 })
    const rec = this._recorder
    if (rec) {
      rec.stop()
    }
    wx.showToast({ title: '已取消', icon: 'none', duration: 800 })
  },

  _resetVoice() {
    clearTimeout(this._recordTimeout)
    clearInterval(this._recordingTimer)
    this.setData({ isRecording: false, recordingTime: 0 })
    this._recordingFilePath = null
    this._recordingTempPath = null
  },

  _uploadVoice(tempFilePath) {
    if (!tempFilePath) {
      this.setData({ isUploading: false })
      wx.showToast({ title: '录音文件为空', icon: 'none' })
      return
    }
    wx.showLoading({ title: '识别中...' })
    wx.uploadFile({
      url: app.globalData.baseUrl + '/api/asr/recognize',
      filePath: tempFilePath,
      name: 'file',
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (uploadRes) => {
        wx.hideLoading()
        this.setData({ isUploading: false })
        try {
          const ret = JSON.parse(uploadRes.data)
          if (ret.code === 200 && ret.data && ret.data.text) {
            const text = ret.data.text.trim()
            if (text) {
              this.setData({ inputText: text })
              this.onSend()
            } else {
              wx.showToast({ title: '未识别到内容', icon: 'none' })
            }
          } else {
            wx.showToast({ title: ret.msg || '识别失败', icon: 'none' })
          }
        } catch (e) {
          wx.showToast({ title: '识别解析失败', icon: 'none' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        this.setData({ isUploading: false })
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    })
  },

  // ==================== 文字发送 ====================

  onSend() {
    const text = this.data.inputText.trim()
    if (!text) {
      wx.showToast({ title: '请输入问题内容', icon: 'none' })
      return
    }
    const userId = app.globalData.userId
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const time = this.formatTime(new Date())
    const parkId = app.globalData.currentParkId || null

    const messages = [...this.data.messages, { question: text, answer: '', time }]
    this.setData({ messages, inputText: '', loading: true, scrollTop: 99999 })

    wx.request({
      url: app.globalData.baseUrl + '/api/chat/send',
      method: 'POST',
      header: { 'X-User-Id': userId, 'Content-Type': 'application/json' },
      data: { question: text, parkId },
      success: (res) => {
        if (res.data.code === 200) {
          const answer = res.data.answer || res.data.data?.answer || ''
          const answerTime = this.formatTime(new Date())
          const updated = this.data.messages.map((m, i) =>
            i === this.data.messages.length - 1 ? { ...m, answer, time: answerTime } : m
          )
          this.setData({ messages: updated, loading: false, scrollTop: 99999 })
          if (answer) setTimeout(() => speak(answer), 300)
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: res.data.msg || '发送失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '网络请求失败', icon: 'none' })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  formatTime(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return hour + ':' + m + ' ' + ampm
  },

  onSpeak(e) {
    const text = e.currentTarget.dataset.text
    if (text) speak(text)
  },

  onScroll() {}
})
