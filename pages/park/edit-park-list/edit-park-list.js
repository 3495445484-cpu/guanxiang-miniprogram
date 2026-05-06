const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    parkList: [],
    showAddPark: false,
    // 批量删除模式
    batchMode: false,
    selectedIds: {},   // { id: true/false }
    selectedCount: 0
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sysInfo.statusBarHeight || 20 })
    this.fetchParkList()
  },

  onShow() {
    // 每次显示时重新获取园区列表确保最新
    this.fetchParkList()
  },

  // 从 API 获取真实园区列表
  fetchParkList() {
    const app = getApp()
    const userId = app.globalData.userId || 1
    wx.request({
      url: `${app.globalData.baseUrl}/api/park/list`,
      header: { 'X-User-Id': userId },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const list = res.data.data.map(p => ({
            id: p.id,
            name: p.name || ('园区' + p.id),
            address: p.address || ''
          }))
          this.setData({ parkList: list })
        }
      }
    })
  },

  // ====== 批量删除模式 ======

  // 进入批量删除模式
  enterBatchMode() {
    this.setData({
      batchMode: true,
      selectedIds: {},
      selectedCount: 0
    })
  },

  // 退出批量删除模式
  exitBatchMode() {
    this.setData({
      batchMode: false,
      selectedIds: {},
      selectedCount: 0
    })
  },

  // 点击园区卡片（批量模式：切换勾选）
  onParkCardTap(e) {
    if (!this.data.batchMode) {
      // 普通模式：跳转编辑
      this.onParkTap(e)
      return
    }
    const id = Number(e.currentTarget.dataset.id)
    this.toggleSelect(id)
  },

  // 点击勾选框（单独触发）
  onCheckboxTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.toggleSelect(id)
  },

  // 切换单个园区勾选状态
  toggleSelect(id) {
    const selectedIds = { ...this.data.selectedIds }
    selectedIds[id] = !selectedIds[id]
    const selectedCount = Object.values(selectedIds).filter(Boolean).length
    this.setData({ selectedIds, selectedCount })
  },

  // 执行批量删除
  doBatchDelete() {
    const selectedIds = this.data.selectedIds
    const idsToDelete = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([k]) => Number(k))

    if (idsToDelete.length === 0) return

    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${idsToDelete.length} 个园区吗？删除后不可恢复。`,
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (!res.confirm) return
        this._doDelete(idsToDelete)
      }
    })
  },

  // 真正执行删除
  _doDelete(ids) {
    const app = getApp()
    wx.request({
      url: `${app.globalData.baseUrl}/api/park/batch-delete`,
      method: 'POST',
      header: {
        'X-User-Id': app.globalData.userId || 1,
        'Content-Type': 'application/json'
      },
      data: { ids },
      success: (res) => {
        if (res.data.code === 200) {
          // 从全局数据中清除已删除的园区
          app.removeParks(ids)
          wx.showToast({ title: '删除成功', icon: 'success' })
          this.exitBatchMode()
          this.fetchParkList()
        } else {
          wx.showToast({ title: res.data.msg || '删除失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络请求失败', icon: 'none' })
      }
    })
  },

  // ====== 添加园区 ======

  showAddPark() { this.setData({ showAddPark: true }) },
  hideAddPark() { this.setData({ showAddPark: false }) },
  onParkAddSuccess() {
    this.setData({ showAddPark: false })
    this.fetchParkList()
  },

  // ====== 正常编辑 ======

  goBack() {
    const app = getApp()
    app.speakText('正在返回')
    wx.navigateBack()
  },

  onParkTap(e) {
    const app = getApp()
    app.speakText('正在打开编辑园区')
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/park/edit-park/edit-park?id=${id}` })
  }
})
