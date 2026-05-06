App({
  globalData: {
    baseUrl: "http://119.23.56.221:8080",
    userInfo: null,
    token: null,
    fontIndex: 0,
    darkMode: false,
    voiceBroadcast: false,
    currentParkId: null,
    currentPark: null,
    parkList: [],
    parkData: {},
    homePage: null
  },

  // 状态覆盖映射（与 home.js 保持一致）
  _statusOverride: {
    1: { status: 'healthy', healthScore: 92, healthStatus: '健康', healthClass: 'green', nutrient: 75, light: 54612, ventilationRpm: 40 },
    5: { status: 'warning', abnormalType: 'light', healthScore: 85, healthStatus: '注意', healthClass: 'yellow', nutrient: 42, light: 28000, ventilationRpm: 35, displayStatus: '注意' },
    6: { status: 'danger', abnormalType: 'soil', healthScore: 72, healthStatus: '危及', healthClass: 'red', nutrient: 28, light: 15000, ventilationRpm: 50, displayStatus: '危及' }
  },

  // 对园区对象应用状态覆盖
  applyParkStatus(park) {
    const ov = this._statusOverride[Number(park.id)]
    if (!ov) return park
    return Object.assign({}, park, {
      healthScore: ov.healthScore,
      healthStatus: ov.healthStatus,
      healthClass: ov.healthClass,
      light: ov.light,
      nutrient: ov.nutrient,
      displayStatus: ov.displayStatus
    })
  },

  onLaunch() {
    const saved = wx.getStorageSync('appSettings')
    if (saved) {
      this.globalData.fontIndex = saved.fontIndex || 0
      this.globalData.voiceBroadcast = saved.voiceBroadcast || false
      this.globalData.darkMode = saved.darkMode || false
    }
    const savedUser = wx.getStorageSync('userInfo')
    if (savedUser) {
      this.globalData.userInfo = savedUser.userInfo || null
      this.globalData.token = savedUser.token || null
      this.globalData.userId = 1
    }
    // 恢复上次选中的园区，并应用状态覆盖
    const savedParkId = wx.getStorageSync('currentParkId')
    const savedPark = wx.getStorageSync('currentPark')
    if (savedParkId && savedPark) {
      const normalizedPark = this.applyParkStatus(savedPark)
      this.globalData.currentParkId = Number(savedParkId)
      this.globalData.currentPark = normalizedPark
      this.globalData.homePage = { currentPark: normalizedPark }
    }
  },

  /**
   * 清除已删除的园区数据（各页面批量删除后调用，保持全局数据一致）
   */
  removeParks(deletedIds) {
    const ids = deletedIds.map(Number)
    // 清理 parkData
    if (this.globalData.parkData) {
      ids.forEach(id => delete this.globalData.parkData[id])
    }
    // 清理 parkList
    if (this.globalData.parkList && this.globalData.parkList.length > 0) {
      this.globalData.parkList = this.globalData.parkList.filter(p => !ids.includes(Number(p.id)))
    }
    // 如果删除的是当前园区，重置
    if (this.globalData.currentParkId && ids.includes(Number(this.globalData.currentParkId))) {
      const remaining = this.globalData.parkList
      if (remaining && remaining.length > 0) {
        this.globalData.currentParkId = Number(remaining[0].id)
        this.globalData.currentPark = remaining[0]
        wx.setStorageSync('currentParkId', remaining[0].id)
        wx.setStorageSync('currentPark', remaining[0])
      }
    }
  },

  applyTheme(pageInstance) {
    const isDark = this.globalData.darkMode
    if (pageInstance) {
      pageInstance.setData({ _isDark: isDark, _fontIndex: this.globalData.fontIndex })
    }
    if (isDark) {
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#1A1A1A', animation: { duration: 300, timingFunc: 'easeInOut' } })
      wx.setBackgroundColor({ backgroundColor: '#1A1A1A' })
    } else {
      wx.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#F5F6F8', animation: { duration: 300, timingFunc: 'easeInOut' } })
      wx.setBackgroundColor({ backgroundColor: '#F5F6F8' })
    }
  },

  updateSettings(settings) {
    if (settings.darkMode !== undefined) this.globalData.darkMode = settings.darkMode
    if (settings.voiceBroadcast !== undefined) this.globalData.voiceBroadcast = settings.voiceBroadcast
    if (settings.fontIndex !== undefined) {
      this.globalData.fontIndex = settings.fontIndex
      this.globalData.fontSize = ['标准', '较大', '农忙大字', '超大'][settings.fontIndex]
    }
    wx.setStorageSync('appSettings', {
      darkMode: this.globalData.darkMode,
      fontIndex: this.globalData.fontIndex,
      fontSize: this.globalData.fontSize,
      voiceBroadcast: this.globalData.voiceBroadcast
    })
  },

  speakText(text) {
    if (!text || !this.globalData.voiceBroadcast) return
    // 停止上一个正在播放的语音
    if (this.globalData._currentAudio) {
      this.globalData._currentAudio.stop()
      this.globalData._currentAudio.destroy()
      this.globalData._currentAudio = null
    }
    wx.request({
      url: this.globalData.baseUrl + '/api/tts/speak',
      method: 'POST',
      header: { 'Content-Type': 'text/plain' },
      data: text,
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const audio = wx.createInnerAudioContext()
          audio.src = this.globalData.baseUrl + res.data.data
          this.globalData._currentAudio = audio
          audio.play()
          audio.onError = () => {
            audio.destroy()
            this.globalData._currentAudio = null
          }
          audio.onPlay = () => setTimeout(() => {
            audio.destroy()
            this.globalData._currentAudio = null
          }, 30000)
        }
      }
    })
  },

  getFontConfig() {
    const cfg = {
      '标准': { size: '28rpx', titleSize: '36rpx', labelSize: '24rpx' },
      '较大': { size: '32rpx', titleSize: '40rpx', labelSize: '28rpx' },
      '农忙大字': { size: '36rpx', titleSize: '44rpx', labelSize: '36rpx' },
      '超大': { size: '40rpx', titleSize: '48rpx', labelSize: '36rpx' }
    }
    return cfg[this.globalData.fontSize] || cfg['标准']
  },

  // 保存当前选中的园区（切换时调用，持久化到 storage）
  saveCurrentPark(parkId, park) {
    this.globalData.currentParkId = Number(parkId)
    this.globalData.currentPark = park
    wx.setStorageSync('currentParkId', String(parkId))
    wx.setStorageSync('currentPark', park)
  }
})
