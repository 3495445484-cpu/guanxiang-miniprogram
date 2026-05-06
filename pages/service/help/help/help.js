const app = getApp()

Page({
  data: {
    phoneNumber: '400-888-9999'
  },

  onLoad() {
    // 无需 statusBarHeight，导航栏使用固定高度
  },

  goBack() {
    wx.navigateBack()
  },

  goMoreFaq() {
    wx.showToast({ title: '查看更多常见问题', icon: 'none', duration: 1500 })
  },

  goFaqDetail(e) {
    const id = e.currentTarget.dataset.id
    const titles = [
      '如何快速切换管理园区？',
      '传感器数据异常怎么办？',
      '如何修改环境阈值预警？',
      '忘记密码如何重置？'
    ]
    wx.showToast({ title: titles[id - 1], icon: 'none', duration: 1500 })
  },

  onOnlineService() {
    wx.navigateTo({ url: '/pages/service/help/ai-chat/ai-chat' })
  },

  onPhoneHotline() {
    wx.makePhoneCall({
      phoneNumber: this.data.phoneNumber,
      fail: () => {
        wx.showToast({
          title: '拨打失败，请手动拨打 ' + this.data.phoneNumber,
          icon: 'none',
          duration: 3000
        })
      }
    })
  }
})
