const express = require('express')
const path = require('path')
const cors = require('cors')

// 导入服务
const CorsService = require('./services/corsService')
const FileController = require('./controllers/fileController')
const ErrorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3020

// 启用CORS
app.use(cors(CorsService.getCorsOptions()))

// 静态文件服务 - 用于访问提取的图片
app.use('/extracted_images', express.static(path.join(__dirname, 'extracted_images')))

// 创建文件控制器实例
const fileController = new FileController()

// 路由配置
app.post(
  '/extract-images',
  fileController.getUploadMiddleware().single('file'),
  fileController.handleFileUpload.bind(fileController)
)
app.get('/images', fileController.getImagesList.bind(fileController))
app.get('/health', fileController.healthCheck.bind(fileController))

// 错误处理中间件
app.use(ErrorHandler.handleError)

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 文件处理服务已启动，端口: ${PORT}`)
  console.log(`🌐 CORS状态: ${CorsService.getCorsStatus()}`)
  console.log(`📤 上传接口: POST http://localhost:${PORT}/extract-images`)
  console.log(`📋 图片列表: GET http://localhost:${PORT}/images`)
  console.log(`❤️  健康检查: GET http://localhost:${PORT}/health`)
  console.log(`🖼️  图片访问: http://localhost:${PORT}/extracted_images/`)

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 热加载已启用 - 修改代码后自动重启`)
  }
})

module.exports = app
