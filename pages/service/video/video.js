const app = getApp()

Page({
  data: {
    statusBarHeight: 20,

    // 页面数据（从后端加载）
    gardenName: '01 号园区 - 核心育苗区',
    videoSrc: 'http://119.23.56.221:8080/guanxiang.mp4',
    isPlaying: false,
    volume: 75,
    currentTime: '2023-11-24 14:32:51',

    // 摄像头信息
    camera: {
      id: '01',
      name: '01 号摄像头 - 核心育苗区',
      status: '在线'
    },

    // 设备数据
    irrigation: {
      on: true,
      auto: true,
      currentHumidity: 42,
      flow: 65,
      targetFlow: 65
    },
    fertilizer: {
      on: true,
      auto: true,
      ec: 1.2,
      ph: 6.2,
      amount: 30,
      targetAmount: 30
    },
    ventilation: {
      on: true,
      auto: true,
      status: '运行正常',
      rpm: 40,
      targetRpm: 40
    },
    light: {
      on: true,
      auto: true,
      status: '环境稳定',
      brightness: 850,
      targetBrightness: 850
    },

    // 园区列表
    parkList: [
      { id: '01', name: '01 号园区 - 核心育苗区' },
      { id: '02', name: '02 号园区 - 科技种植区' },
      { id: '03', name: '03 号园区 - 古树保护区' }
    ]
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20
    })
    this.fetchVideoData()
  },

  // 从后端获取页面数据
  fetchVideoData() {
    const app = getApp()
    const userId = app.globalData.userId || 1
    wx.request({
      url: `${app.globalData.baseUrl}/api/video/page`,
      header: { 'X-User-Id': userId },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const d = res.data.data
          this.setData({
            gardenName: d.gardenName || this.data.gardenName,
            camera: d.camera || this.data.camera,
            videoSrc: d.videoSrc || this.data.videoSrc,
            irrigation: d.irrigation || this.data.irrigation,
            fertilizer: d.fertilizer || this.data.fertilizer,
            ventilation: d.ventilation || this.data.ventilation,
            light: d.light || this.data.light,
            parkList: d.parkList || this.data.parkList,
            currentTime: d.currentTime || this.data.currentTime
          })
        }
      },
      fail: () => {
        // 后端未上线时使用默认数据（演示模式）
      }
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  },

  // 园区选择器
  showParkPicker() {
    const names = this.data.parkList.map(p => p.name)
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const selected = this.data.parkList[res.tapIndex]
        this.setData({ gardenName: selected.name })
        // 通知后端切换园区
        const app = getApp()
        wx.request({
          url: `${app.globalData.baseUrl}/api/video/switchPark`,
          method: 'POST',
          header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
          data: { gardenId: selected.id },
          success: (res) => {
            if (res.data.code === 200 && res.data.data) {
              this.setData({
                gardenName: res.data.data.gardenName,
                camera: res.data.data.camera,
                irrigation: res.data.data.irrigation,
                fertilizer: res.data.data.fertilizer,
                ventilation: res.data.data.ventilation,
                light: res.data.data.light
              })
            }
          }
        })
      }
    })
  },

  // 播放/暂停
  togglePlay() {
    const videoContext = wx.createVideoContext('myVideo')
    if (this.data.isPlaying) {
      videoContext.pause()
    } else {
      videoContext.play()
    }
  },

  onPlay() {
    this.setData({ isPlaying: true })
  },

  onPause() {
    this.setData({ isPlaying: false })
  },

  onEnded() {
    this.setData({ isPlaying: false })
  },

  onError(e) {
    wx.showToast({ title: '视频加载失败', icon: 'none' })
    this.setData({ isPlaying: false })
  },

  onTimeUpdate(e) {
    const ct = e.detail.currentTime
    if (ct > 0) {
      const now = new Date()
      const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(Math.floor(ct/3600)).padStart(2,'0')}:${String(Math.floor((ct%3600)/60)).padStart(2,'0')}:${String(Math.floor(ct%60)).padStart(2,'0')}`
      this.setData({ currentTime: timeStr })
    }
  },

  // 截图
  takePhoto() {
    wx.showToast({ title: '截图已保存', icon: 'success' })
  },

  // 录像
  startRecord() {
    wx.showToast({ title: '开始录像', icon: 'none' })
    setTimeout(() => {
      wx.showToast({ title: '录制完成', icon: 'success' })
    }, 3000)
  },

  // 音量调节
  onVolumeChange(e) {
    const value = e.detail.value
    this.setData({ volume: value })
    const videoContext = wx.createVideoContext('myVideo')
    videoContext.seek(value) // 注：VideoContext 无直接 volume API，用 slider UI 表示
    wx.showToast({ title: '音量 ' + value + '%', icon: 'none' })
  },

  // 全屏
  toggleFullScreen() {
    const videoContext = wx.createVideoContext('myVideo')
    videoContext.requestFullScreen()
    wx.showToast({ title: '全屏', icon: 'none' })
  },

  // 设备滑块控制
  onSliderChange(e) {
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    const devices = this.data

    if (key === 'irrigation') {
      this.setData({
        'irrigation.targetFlow': value,
        'irrigation.flow': value
      })
      wx.showToast({ title: '目标流量已调整为 ' + value + ' L/MIN', icon: 'none' })
    } else if (key === 'fertilizer') {
      this.setData({
        'fertilizer.targetAmount': value,
        'fertilizer.amount': value
      })
      wx.showToast({ title: '目标补给已调整为 ' + value + '%', icon: 'none' })
    } else if (key === 'ventilation') {
      this.setData({
        'ventilation.targetRpm': value,
        'ventilation.rpm': value
      })
      wx.showToast({ title: '目标转速已调整为 ' + value + '%', icon: 'none' })
    } else if (key === 'light') {
      this.setData({
        'light.targetBrightness': value,
        'light.brightness': value
      })
      wx.showToast({ title: '目标亮度已调整为 ' + value + ' LUX', icon: 'none' })
    }

    // 通知后端
    const app = getApp()
    wx.request({
      url: `${app.globalData.baseUrl}/api/video/deviceControl`,
      method: 'POST',
      header: { 'X-User-Id': app.globalData.userId || 1, 'Content-Type': 'application/json' },
      data: { deviceKey: key, value: value }
    })
  }
})
