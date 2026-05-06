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
  },

  onViewMore() {
    wx.showToast({ title: '查看全部问题', icon: 'none' })
  },

  onFaqTap(e) {
    const index = e.currentTarget.dataset.index
    const tips = [
      '进入首页左上角园区选择器，点击园区即可快速切换管理权限',
      '请检查传感器连接线是否松动，或尝试重启设备',
      '进入设置 → 环境阈值，可自定义各类指标的告警上下限',
      '在登录页面点击"忘记密码"，通过手机验证码重置登录密码'
    ]
    wx.showModal({
      title: '提示',
      content: tips[index] || '请联系客服获取帮助',
      showCancel: false
    })
  },

  onOnlineService() {
    wx.navigateTo({ url: '/pages/service/help/ai-chat/ai-chat' })
  },

  onPhoneCall() {
    wx.makePhoneCall({
      phoneNumber: '400-888-9999',
      fail: () => {
        wx.showToast({ title: '拨打失败，请手动拨打 400-888-9999', icon: 'none', duration: 2500 })
      }
    })
  }
})
