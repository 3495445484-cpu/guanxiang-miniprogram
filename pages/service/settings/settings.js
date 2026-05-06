Page({
  data: {
    statusBarHeight: 20,

    // 开关状态
    autoUpdate: true,
    notify: true,
    voiceBroadcast: false,
    darkMode: false,

    // 字体大小
    fontIndex: 0,
    fontSizes: ['标准', '较大', '农忙大字', '超大'],

    // 全局主题（由 app.js 控制）
    _isDark: false,
    _fontIndex: 0,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    // 页面加载时应用全局主题
    const app = getApp()
    this.setData({
      darkMode: app.globalData.darkMode,
      fontIndex: app.globalData.fontIndex,
      _isDark: app.globalData.darkMode,
      _fontIndex: app.globalData.fontIndex,
      voiceBroadcast: app.globalData.voiceBroadcast,
    })
    app.applyTheme(this)
  },

  onShow() {
    // 每次显示页面时同步全局主题
    const app = getApp()
    this.setData({
      darkMode: app.globalData.darkMode,
      fontIndex: app.globalData.fontIndex,
      _isDark: app.globalData.darkMode,
      _fontIndex: app.globalData.fontIndex,
      voiceBroadcast: app.globalData.voiceBroadcast,
    })
    app.applyTheme(this)
  },

  goBack() {
    wx.navigateBack()
  },

  toggleAutoUpdate() {
    const v = !this.data.autoUpdate
    this.setData({ autoUpdate: v })
    wx.showToast({
      title: v ? '自动更新已开启' : '自动更新已关闭',
      icon: 'none'
    })
  },

  toggleNotify() {
    const v = !this.data.notify
    this.setData({ notify: v })
    wx.showToast({
      title: v ? '消息通知已开启' : '消息通知已关闭',
      icon: 'none'
    })
  },

  toggleVoiceBroadcast() {
    const v = !this.data.voiceBroadcast
    const app = getApp()
    app.globalData.voiceBroadcast = v
    app.updateSettings({ voiceBroadcast: v })
    this.setData({ voiceBroadcast: v })
    wx.showToast({
      title: v ? '语音播报已开启' : '语音播报已关闭',
      icon: 'none'
    })
  },

  toggleDark() {
    const v = !this.data.darkMode
    const app = getApp()
    app.globalData.darkMode = v
    app.updateSettings({ darkMode: v })
    this.setData({ darkMode: v, _isDark: v })
    app.applyTheme(this)
    wx.showToast({
      title: v ? '深色模式已开启' : '深色模式已关闭',
      icon: 'none'
    })
  },

  // 拖动中实时联动
  onFontChanging(e) {
    this.setData({ fontIndex: e.detail.value, _fontIndex: e.detail.value })
  },

  // 拖动结束，保存到全局
  onFontChange(e) {
    const idx = e.detail.value
    const app = getApp()
    app.globalData.fontIndex = idx
    app.updateSettings({ fontIndex: idx })
    this.setData({ fontIndex: idx, _fontIndex: idx })
    app.applyTheme(this)
    wx.showToast({
      title: '字体已切换为 ' + this.data.fontSizes[idx],
      icon: 'none'
    })
  }
})
