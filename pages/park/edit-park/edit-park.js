Page({
  data: {
    statusBarHeight: 20,
    saveBottom: 48,
    parkId: '',
    parkName: '',
    parkAddress: '',

    // 湿度阈值
    humidityWarn: 3,
    humidityCrit: 5,

    // 温度偏差
    tempWarn: 10.0,
    tempCrit: 20.0,

    // 光照阈值
    lightWarn: 10.5,
    lightCrit: 7.0,
    nutrientWarn: 5,
    nutrientCrit: 10,
  },

  onLoad(opts) {
    const sysInfo = wx.getSystemInfoSync()
    // 适配底部安全区
    const safeArea = sysInfo.safeAreaInsets
    const bottom = safeArea ? safeArea.bottom : 48
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      saveBottom: Math.max(bottom - 16, 32),
      parkId: opts.id || ''
    })
    if (opts.id) {
      this.fetchParkData(opts.id)
    }
  },

  fetchParkData(id) {
    const app = getApp()
    wx.request({
      url: `${app.globalData.baseUrl}/api/park/list`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const park = res.data.data.find(p => Number(p.id) === Number(id))
          if (park) {
            this.setData({
              parkName: park.name || '',
              parkAddress: park.address || ''
            })
          }
        }
      }
    })
  },

  goBack() {
    const app = getApp()
    app.speakText('正在返回')
    wx.navigateBack()
  },

  onNameInput(e) {
    this.setData({ parkName: e.detail.value })
  },

  // 湿度 - 警告阈值
  onHumidityWarnMinus() {
    this.setData({ humidityWarn: Math.max(0, this.data.humidityWarn - 1) })
  },
  onHumidityWarnPlus() {
    this.setData({ humidityWarn: this.data.humidityWarn + 1 })
  },

  // 湿度 - 危及阈值
  onHumidityCritMinus() {
    this.setData({ humidityCrit: Math.max(0, this.data.humidityCrit - 1) })
  },
  onHumidityCritPlus() {
    this.setData({ humidityCrit: this.data.humidityCrit + 1 })
  },

  // 温度 - 警告偏差
  onTempWarnMinus() {
    this.setData({ tempWarn: Math.max(0, parseFloat((this.data.tempWarn - 0.5).toFixed(1))) })
  },
  onTempWarnPlus() {
    this.setData({ tempWarn: parseFloat((this.data.tempWarn + 0.5).toFixed(1)) })
  },

  // 温度 - 危及偏差
  onTempCritMinus() {
    this.setData({ tempCrit: Math.max(0, parseFloat((this.data.tempCrit - 0.5).toFixed(1))) })
  },
  onTempCritPlus() {
    this.setData({ tempCrit: parseFloat((this.data.tempCrit + 0.5).toFixed(1)) })
  },

  // 光照 - 警告阈值
  onLightWarnMinus() {
    this.setData({ lightWarn: Math.max(0, parseFloat((this.data.lightWarn - 0.5).toFixed(1))) })
  },
  onLightWarnPlus() {
    this.setData({ lightWarn: parseFloat((this.data.lightWarn + 0.5).toFixed(1)) })
  },

  // 光照 - 危及阈值
  onLightCritMinus() {
    this.setData({ lightCrit: Math.max(0, parseFloat((this.data.lightCrit - 0.5).toFixed(1))) })
  },
  onLightCritPlus() {
    this.setData({ lightCrit: parseFloat((this.data.lightCrit + 0.5).toFixed(1)) })
  },
  onNutrientWarnMinus() {
    this.setData({ nutrientWarn: Math.max(0, this.data.nutrientWarn - 1) })
  },
  onNutrientWarnPlus() {
    this.setData({ nutrientWarn: this.data.nutrientWarn + 1 })
  },
  onNutrientCritMinus() {
    this.setData({ nutrientCrit: Math.max(0, this.data.nutrientCrit - 1) })
  },
  onNutrientCritPlus() {
    this.setData({ nutrientCrit: this.data.nutrientCrit + 1 })
  },

  onSave() {
    const app = getApp()
    wx.showToast({ title: '保存成功', icon: 'success' })
    app.speakText('保存成功')
    setTimeout(() => wx.navigateBack(), 1200)
  }
})
