const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    totalCount: 2,
    criticalCount: 2,
    warningCount: 3,
    alertList: []
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    this.fetchAlertData()
  },

  fetchAlertData() {
    const baseUrl = app.globalData.baseUrl || 'http://119.23.56.221:8080'
    wx.request({
      url: `${baseUrl}/api/alarm/list/01?level=warning`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.code === 200) {
          const d = res.data.data
          const list = (d.list || []).map(item => {
            let iconImg = ''
            const t = item.title || ''
            if (t.includes('湿度')) iconImg = '/pages/home/img-health/wet.png'
            else if (t.includes('温度')) iconImg = '/pages/home/img-health/temperture.png'
            else if (t.includes('光照')) iconImg = '/pages/home/img-health/sun-1.png'
            else if (t.includes('养分') || t.includes('土壤')) iconImg = '/pages/home/img-health/plant.png'
            return { ...item, iconImg }
          })
          this.setData({
            totalCount: d.totalCount || 2,
            criticalCount: d.criticalCount || 2,
            warningCount: d.warningCount || 3,
            alertList: list
          })
          if (list.length === 0) {
            this.loadMockData()
          }
        } else {
          this.loadMockData()
        }
      },
      fail: () => {
        this.loadMockData()
      }
    })
  },

  loadMockData() {
    this.setData({
      totalCount: 2,
      criticalCount: 2,
      warningCount: 3,
      alertList: [
        {
          id: '001',
          level: 'warning',
          levelText: '警告',
          icon: '💧',
          iconImg: '/pages/home/img-health/wet.png',
          iconBg: '#FFF8E1',
          title: '02 号园区 湿度过高',
          currentLabel: '当前数值',
          currentValue: '82%',
          thresholdLabel: '阈值上限',
          thresholdValue: '75%',
          time: '刚刚'
        },
        {
          id: '002',
          level: 'alert',
          levelText: '警告',
          icon: '🌡️',
          iconImg: '/pages/home/img-health/temperture.png',
          iconBg: '#FFEBEA',
          title: '03 号园区 温度过高',
          currentLabel: '实时数值',
          currentValue: '32.4℃',
          thresholdLabel: '告警阈值',
          thresholdValue: '28.0℃',
          time: '刚刚'
        }
      ]
    })
  },

  onAlertTap(e) {
    const { title } = e.currentTarget.dataset
    // 从标题中提取园区号，如 "02 号园区 湿度过高" → 提取 "02"
    const match = title.match(/(\d+)(?:\s*号)?园区/)
    const parkNum = match ? match[1] : '01'
    // 园区号 → parkId → 对应设备
    const parkIdMap = { '01': 1, '1': 1, '02': 5, '2': 5, '03': 6, '3': 6 }
    const deviceMap = { '01': 'irrigation', '1': 'irrigation', '02': 'nutrient', '2': 'nutrient', '03': 'ventilation', '3': 'ventilation' }
    const parkNameMap = { '01': '01号园区', '1': '01号园区', '02': '02号园区', '2': '02号园区', '03': '03号园区', '3': '03号园区' }
    const pid = parkIdMap[parkNum] || 1
    const deviceKey = deviceMap[parkNum] || 'irrigation'
    const parkName = parkNameMap[parkNum] || '01号园区'
    // 通过 URL 参数传递目标园区，remote 页面临时展示，不修改 globalData
    wx.navigateTo({
      url: `/pages/remote/remote?from=home&park=${encodeURIComponent(parkName)}&device=${deviceKey}`
    })
    const app = getApp()
    app.speakText('正在打开远程控制页面')
  },

  goBack() {
    const app = getApp()
    app.speakText('正在返回')
    wx.navigateBack()
  }
})
