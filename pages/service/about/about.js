Page({
  data: {
    statusBarHeight: 20
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
  },

  goBack() {
    wx.navigateBack()
  }
})
