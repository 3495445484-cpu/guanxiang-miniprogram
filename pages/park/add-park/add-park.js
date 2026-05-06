const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    parkName: '',
    parkAddress: '',
    parkDesc: '',
    humidityWarnThreshold: '',
    tempWarnThreshold: '',
    lightWarnThreshold: ''
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    this.getLocation()
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const lat = res.latitude
        const lng = res.longitude
        wx.request({
          url: `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=954d48268d1df5d1f0136aac7308b52b`,
          success: (geo) => {
            if (geo.data && geo.data.status === 1 && geo.data.regeocode) {
              const addr = geo.data.regeocode
              const province = addr.addressComponent.province || ''
              const city = addr.addressComponent.city || ''
              const district = (addr.addressComponent.district && addr.addressComponent.district.length > 0)
                ? addr.addressComponent.district
                : (addr.addressComponent.township || '')
              // 精确到市区：省+市+区/县
              const address = province + city + district
              this.setData({ parkAddress: address })
              wx.showToast({ title: '已获取：' + address, icon: 'none', duration: 2000 })
            } else {
              console.error('AMap geocode failed:', geo.data)
              wx.showToast({ title: '地址获取失败', icon: 'none' })
            }
          },
          fail: () => {
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '定位失败，请检查位置权限', icon: 'none' })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onNameInput(e) {
    this.setData({ parkName: e.detail.value })
  },
  onAddressInput(e) {
    this.setData({ parkAddress: e.detail.value })
  },
  onDescInput(e) {
    this.setData({ parkDesc: e.detail.value })
  },
  onHumidityThresholdInput(e) {
    this.setData({ humidityWarnThreshold: e.detail.value })
  },
  onTempThresholdInput(e) {
    this.setData({ tempWarnThreshold: e.detail.value })
  },
  onLightThresholdInput(e) {
    this.setData({ lightWarnThreshold: e.detail.value })
  },

  onSave() {
    if (!this.data.parkName) {
      wx.showToast({ title: '请输入园区名称', icon: 'none' })
      return
    }
    const app = getApp()
    const userId = app.globalData.userId || 1
    wx.request({
      url: `${app.globalData.baseUrl}/api/park/add`,
      method: 'POST',
      header: { 'X-User-Id': userId, 'Content-Type': 'application/json' },
      data: {
        name: this.data.parkName,
        address: this.data.parkAddress,
        description: this.data.parkDesc,
        humidityWarnThreshold: this.data.humidityWarnThreshold ? Number(this.data.humidityWarnThreshold) : null,
        tempWarnThreshold: this.data.tempWarnThreshold ? Number(this.data.tempWarnThreshold) : null,
        lightWarnThreshold: this.data.lightWarnThreshold ? Number(this.data.lightWarnThreshold) : null
      },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '添加成功', icon: 'success' })
          // 通知所有页面刷新园区列表（通过 globalData 触发）
          const pages = getCurrentPages()
          pages.forEach(p => {
            if (p.onParkAddSuccess) p.onParkAddSuccess()
            if (p.fetchParkList) p.fetchParkList()
          })
          setTimeout(() => wx.navigateBack(), 1200)
        } else {
          wx.showToast({ title: (res.data.msg || '添加失败'), icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
      }
    })
  }
})
