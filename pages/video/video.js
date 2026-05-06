const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    videoSrc: 'https://www.w3schools.com/html/mov_bbb.mp4',
    isPlaying: false,
    isFullScreen: false,
    showVideoOverlay: true,
    currentTime: '2023-11-24 14:32:51',
    videoProgress: 0,
    _videoDuration: 0,
    videoLoadFailed: false,

    irrigation: {
      on: true,
      auto: true,
      currentHumidity: 42,
      flow: 65,
      targetFlow: 65,
      isIrrigationOk: true
    },
    fertilizer: {
      on: true,
      auto: true,
      ec: 75,
      ph: 6.2,
      amount: 30,
      targetAmount: 30
    },
    ventilation: {
      on: true,
      auto: true,
      rpm: 40,
      targetRpm: 40
    },
    light: {
      on: true,
      auto: true,
      brightness: 850,
      targetBrightness: 25000
    },

    parkList: [],
    overviewData: {},
    weatherData: { windText: '无风' }
  },

  onLoad() {
    const app = getApp()
    const sysInfo = wx.getSystemInfoSync()
    const parkList = (app.globalData.parkList && app.globalData.parkList.length > 0)
      ? app.globalData.parkList
      : [
          { id: 1, name: '01号园区', status: 'healthy', abnormalType: '' },
          { id: 5, name: '02号园区', status: 'warning', abnormalType: 'light' },
          { id: 6, name: '03号园区', status: 'danger', abnormalType: 'soil' }
        ]
    const currentPark = app.globalData.currentPark || parkList[0]
    this.fetchOverview()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      parkList: parkList,
      currentParkName: currentPark.name || currentPark.displayName || '选择园区',
      currentPark: currentPark,
      weatherData: app.globalData.homePage ? app.globalData.homePage.weatherData : { windText: '无风' },
      overviewData: app.globalData.homePage && app.globalData.homePage.overviewData ? app.globalData.homePage.overviewData : {}
    })
  },

  onShow() {
      const app = getApp()
      if (app.globalData.homePage && app.globalData.homePage.weatherData) {
        this.setData({ weatherData: app.globalData.homePage.weatherData })
      }
      if (app.globalData.homePage && app.globalData.homePage.overviewData) {
        this.setData({ overviewData: app.globalData.homePage.overviewData })
      }
      if (app.globalData.currentPark) {
        this.setData({ currentPark: app.globalData.currentPark })
      }
      this.fetchOverview()
    },


  fetchOverview() {
    const app = getApp()
    const pid = app.globalData.currentParkId || 1
    wx.request({
      url: `${app.globalData.baseUrl}/api/analysis/overview/${pid}`,
      header: { 'X-User-Id': app.globalData.userId || 1 },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const d = res.data.data
          this.setData({ overviewData: d })
          const hp = app.globalData.homePage || {}
          app.globalData.homePage = Object.assign({}, hp, { overviewData: d })
          if (app.globalData.currentPark) {
            this.setData({ currentPark: app.globalData.currentPark })
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

  showParkPicker() {
    const app = getApp()
    wx.showActionSheet({
      itemList: this.data.parkList.map(p => p.name),
      success: (res) => {
        const parkName = this.data.parkList[res.tapIndex].name
        wx.showToast({ title: '切换园区：' + parkName, icon: 'none' })
        app.speakText('已切换到' + parkName)
      }
    })
  },

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

  onVideoError(e) {
    console.warn('视频加载失败，已切换到占位模式')
    this.setData({ videoSrc: '', videoLoadFailed: true, showVideoOverlay: false })
  },

  retryVideo() {
    this.setData({ videoLoadFailed: false, showVideoOverlay: true, videoSrc: 'https://www.w3schools.com/html/mov_bbb.mp4' })
    setTimeout(() => {
      const videoContext = wx.createVideoContext('myVideo')
      videoContext.play()
    }, 100)
  },

  onFullScreen(e) {
    this.setData({ isFullScreen: e.detail.fullScreen })
    if (e.detail.fullScreen) {
      this.setData({ showVideoOverlay: false })
    } else {
      this.setData({ showVideoOverlay: true })
    }
  },

  onTimeUpdate(e) {
    const duration = e.detail.duration
    const currentTime = e.detail.currentTime
    if (duration > 0) {
      this._videoDuration = duration
      const progress = (currentTime / duration) * 100
      this.setData({ videoProgress: progress })
    }
  },

  onVideoSeek(e) {
    const value = e.detail.value
    const duration = this._videoDuration || 0
    if (duration > 0) {
      const seekTime = (value / 100) * duration
      const videoContext = wx.createVideoContext('myVideo')
      videoContext.seek(seekTime)
    }
  },

  toggleFullScreen() {
    const videoContext = wx.createVideoContext('myVideo')
    videoContext.requestFullScreen()
  },

  takePhoto() {
    wx.showToast({ title: '拍照成功', icon: 'success' })
  },

  startRecord() {
    wx.showToast({ title: '开始录像', icon: 'none' })
  },

  toggleDevice(e) {
    const app = getApp()
    const key = e.currentTarget.dataset.key
    const device = this.data[key]
    device.on = !device.on
    device.auto = !device.auto
    this.setData({ [key]: device })
    const nameMap = { irrigation: '灌溉', ventilation: '通风', light: '补光', fertilizer: '施肥' }
    const name = nameMap[key] || key
    const onOff = device.on ? (device.auto ? '已开启自动' : '已开启手动') : '已关闭'
    wx.showToast({
      title: onOff,
      icon: 'success',
      duration: 1200
    })
    app.speakText(name + onOff)
  },

  onSliderChange(e) {
    const app = getApp()
    const key = e.currentTarget.dataset.key
    const value = e.detail.value
    const device = this.data[key]
    if (key === 'irrigation') {
      device.flow = value
      device.targetFlow = value
    }
    if (key === 'fertilizer') {
      device.targetAmount = value
    }
    if (key === 'ventilation') {
      device.rpm = value
      device.targetRpm = value
    }
    if (key === 'light') {
      device.targetBrightness = value
    }
    this.setData({ [key]: device })
    const nameMap = { irrigation: '灌溉流量', fertilizer: '施肥比例', ventilation: '通风转速', light: '补光亮度' }
    const name = nameMap[key] || key
    app.speakText(name + '调整为' + value)
  }
})
