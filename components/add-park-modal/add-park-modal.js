const app = getApp()

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    parkName: '',
    locationText: '',
    address: '',

    // 湿度阈值
    humidityWarn: 3,
    humidityCrit: 5,

    // 温度偏差
    tempWarn: 10.0,
    tempCrit: 20.0,

    // 光照阈值
    lightWarn: 10.5,
              nutrientWarn: 5,
              nutrientCrit: 10,
    lightCrit: 7.0,
    nutrientWarn: 5,
    nutrientCrit: 10,
  },

  methods: {
    onOverlayTap() {
      this.triggerEvent('close')
    },

    stopProp() {
      return
    },

    onClose() {
      this.triggerEvent('close')
    },

    onNameInput(e) {
      this.setData({ parkName: e.detail.value })
    },

    onAddressInput(e) {
      this.setData({ address: e.detail.value, locationText: e.detail.value })
    },

    onGetLocation() {
      // 直接用 wx.chooseLocation，弹出地图让用户选位置，不需要先申请权限
      wx.chooseLocation({
        success: (res) => {
          if (!res.name && !res.address) {
            wx.showToast({ title: '未选择位置', icon: 'none' })
            return
          }
          // 直接用返回的地址，省市区拼接
          const addr = res.address || ''
          // 去掉省市区重复的字（比如"广东省"和"广东省"重了）
          let locationText = addr
          // 如果地址太短（只有省或市），直接用
          this.setData({
            locationText: locationText,
            address: locationText
          })
          wx.showToast({ title: '已获取位置', icon: 'none', duration: 2000 })
        },
        fail: (err) => {
          wx.showToast({ title: '请在设置中允许位置权限', icon: 'none' })
        }
      })
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

    onConfirm() {
      if (!this.data.parkName) {
        wx.showToast({ title: '请输入园区名称', icon: 'none' })
        return
      }

      const userId = app.globalData.userId || 1

      wx.request({
        method: 'POST',
        url: `${app.globalData.baseUrl}/api/park/add`,
        header: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        data: {
          name: this.data.parkName,
          address: this.data.address || '',
          humidityWarnThreshold: this.data.humidityWarn,
          humidityCritThreshold: this.data.humidityCrit,
          tempWarnThreshold: this.data.tempWarn,
          tempCritThreshold: this.data.tempCrit,
          lightWarnThreshold: this.data.lightWarn,
          nutrientWarnThreshold: this.data.nutrientWarn,
          nutrientCritThreshold: this.data.nutrientCrit,
          lightCritThreshold: this.data.lightCrit,
        },
        success: (res) => {
          if (res.data.code === 200) {
            wx.showToast({ title: '添加成功', icon: 'success' })
            this.triggerEvent('success')
            this.triggerEvent('close')
            // 重置表单
            this.setData({
              parkName: '',
              locationText: '',
              address: '',
              humidityWarn: 3,
              humidityCrit: 5,
              tempWarn: 10.0,
              tempCrit: 20.0,
              lightWarn: 10.5,
              nutrientWarn: 5,
              nutrientCrit: 10,
              lightCrit: 7.0,
            })
          } else {
            wx.showToast({ title: res.data.msg || '添加失败', icon: 'none' })
          }
        },
        fail: () => {
          wx.showToast({ title: '添加失败：网络错误', icon: 'none' })
        }
      })
    }
  }
})
