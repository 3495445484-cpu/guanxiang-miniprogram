const app = getApp()

// 字体大小配置
const fontSizeConfig = {
  '标准': { value: 0, size: '28rpx', labelSize: '24rpx' },
  '较大': { value: 1, size: '32rpx', labelSize: '26rpx' },
  '农忙大字': { value: 2, size: '36rpx', labelSize: '28rpx' },
  '超大': { value: 3, size: '40rpx', labelSize: '30rpx' }
}

const reverseFontSizeMap = { 0: '标准', 1: '较大', 2: '农忙大字', 3: '超大' }

Page({
  data: {
    statusBarHeight: 20,
    settings: {
      autoUpdate: true,
      notify: true,
      darkMode: false,
      fontSize: '标准'
    },
    fontSizeValue: 0,
    pageStyle: '',
    navStyle: '',
    contentStyle: '',
    cardStyle: '',
    moduleTitleStyle: '',
    itemTitleStyle: '',
    itemDescStyle: '',
    iconStyle: '',
    iconBgStyle: '',
    fontLabelStyle: ''
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    this.loadSettings()
  },

  onShow() {
    this.loadSettings()
  },

  loadSettings() {
    const saved = wx.getStorageSync('appSettings')
    if (saved) {
      this.setData({
        settings: saved,
        fontSizeValue: fontSizeConfig[saved.fontSize]?.value || 0
      }, () => {
        this.applyStyles()
      })
    } else {
      this.applyStyles()
    }
  },

  applyStyles() {
    const isDark = this.data.settings.darkMode
    const fontSize = this.data.settings.fontSize
    const fontConfig = fontSizeConfig[fontSize] || fontSizeConfig['标准']

    const bgColor = isDark ? '#000000' : '#F8FAF9'
    const cardBg = isDark ? '#1C1C1C' : '#FFFFFF'
    const textColor = isDark ? '#FFFFFF' : '#212121'
    const descColor = isDark ? '#888888' : '#757575'
    const iconBg = isDark ? '#004D40' : '#E0F7F4'
    const iconColor = '#00BFA5'

    this.setData({
      pageStyle: `background:${bgColor};min-height:100vh;`,
      navStyle: `background:${bgColor};`,
      contentStyle: `background:${bgColor};padding:200rpx 24rpx 32rpx;`,
      cardStyle: `background:${cardBg};border-radius:16rpx;margin-bottom:16rpx;`,
      moduleTitleStyle: `font-size:40rpx;font-weight:600;color:${textColor};margin-bottom:16rpx;margin-top:32rpx;`,
      itemTitleStyle: `font-size:${fontConfig.size};font-weight:500;color:${textColor};`,
      itemDescStyle: `font-size:${fontConfig.labelSize};font-weight:400;color:${descColor};`,
      iconStyle: `color:${iconColor};`,
      iconBgStyle: `background:${iconBg};`,
      fontLabelStyle: `font-size:${fontConfig.labelSize};`
    })

    // 更新全局字体设置
    app.globalData.fontSize = fontSize
    app.globalData.darkMode = isDark
  },

  goBack() {
    wx.navigateBack()
  },

  onSwitchChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.checked
    this.setData({ ['settings.' + key]: value }, () => {
      this.applyStyles()
      this.saveSettings()
    })
  },

  toggleDarkMode(e) {
    const newValue = !this.data.settings.darkMode
    this.setData({
      ['settings.darkMode']: newValue
    }, () => {
      this.applyStyles()
      this.saveSettings()
    })
    wx.showToast({ title: newValue ? '深色模式已开启' : '深色模式已关闭', icon: 'none' })
  },

  onFontSizeChange(e) {
    const value = e.detail.value
    const fontSize = reverseFontSizeMap[value]
    this.setData({ fontSizeValue: value, ['settings.fontSize']: fontSize }, () => {
      this.applyStyles()
      this.saveSettings()
    })
    wx.showToast({ title: '字体已调整为 ' + fontSize, icon: 'none' })
  },

  setFontSize(e) {
    const size = e.currentTarget.dataset.size
    const value = fontSizeConfig[size].value
    this.setData({ fontSizeValue: value, ['settings.fontSize']: size }, () => {
      this.applyStyles()
      this.saveSettings()
    })
    wx.showToast({ title: '字体已调整为 ' + size, icon: 'none' })
  },

  saveSettings() {
    wx.setStorageSync('appSettings', this.data.settings)
  }
})
