const express = require('express')
const path = require('path')
const cors = require('cors')

// 导入服务
const CorsService = require('./services/corsService')
const FileController = require('./controllers/fileController')
const OpenRouterController = require('./controllers/openRouterController')
const OpenAIController = require('./controllers/openaiController')
const OCRController = require('./controllers/ocrController')
const ErrorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3020

// 启用CORS
app.use(cors(CorsService.getCorsOptions()))

// 解析JSON请求体
app.use(express.json())

// 静态文件服务 - 用于访问提取的图片
app.use('/extracted_images', express.static(path.join(__dirname, 'extracted_images')))

// 创建控制器实例
const fileController = new FileController()
const openRouterController = new OpenRouterController()
const openaiController = new OpenAIController()
const ocrController = new OCRController()

// 文件处理路由
app.post(
  '/extract-images',
  fileController.getUploadMiddleware().single('file'),
  fileController.handleFileUpload.bind(fileController)
)
app.post(
  '/detect-image-after-text',
  fileController.getUploadMiddleware().single('file'),
  fileController.detectImageAfterText.bind(fileController)
)
app.post(
  '/find-text-position',
  fileController.getUploadMiddleware().single('file'),
  fileController.findTextPosition.bind(fileController)
)
app.post(
  '/extract-document-content',
  fileController.getUploadMiddleware().single('file'),
  fileController.handleDocumentContentExtraction.bind(fileController)
)
app.get('/images', fileController.getImagesList.bind(fileController))
app.get('/health', fileController.healthCheck.bind(fileController))

// OpenRouter AI路由
app.post('/ai/chat', openRouterController.handleChat.bind(openRouterController))
app.post(
  '/ai/upload-analyze',
  openRouterController.getFileUploadMiddleware(),
  openRouterController.handleFileAnalysis.bind(openRouterController)
)
app.get('/ai/models', openRouterController.getModels.bind(openRouterController))
app.post('/ai/analyze-file', openRouterController.analyzeFile.bind(openRouterController))
app.post('/ai/generate-summary', openRouterController.generateSummary.bind(openRouterController))
app.get('/ai/status', openRouterController.checkStatus.bind(openRouterController))

// OpenAI AI路由
app.post('/openai/chat', openaiController.handleChat.bind(openaiController))
app.post(
  '/openai/upload-analyze',
  openaiController.getFileUploadMiddleware(),
  openaiController.handleFileAnalysis.bind(openaiController)
)
app.get('/openai/models', openaiController.getModels.bind(openaiController))
app.post('/openai/analyze-file', openaiController.analyzeFileContent.bind(openaiController))
app.post('/openai/generate-summary', openaiController.generateSummary.bind(openaiController))
app.get('/openai/status', openaiController.checkStatus.bind(openaiController))

// OCR路由
app.post(
  '/ocr/recognize',
  ocrController.getOCRUploadMiddleware().single('image'),
  ocrController.handleImageOCR.bind(ocrController)
)
app.post('/ocr/recognize-base64', ocrController.handleBase64OCR.bind(ocrController))
app.post(
  '/ocr/batch-recognize',
  ocrController.getBatchOCRUploadMiddleware().array('images', 10),
  ocrController.handleBatchOCR.bind(ocrController)
)
app.get('/ocr/status', ocrController.checkOCRStatus.bind(ocrController))

// 错误处理中间件
app.use(ErrorHandler.handleError)

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 文件处理服务已启动，端口: ${PORT}`)
  console.log(`🌐 CORS状态: ${CorsService.getCorsStatus()}`)
  console.log(`📤 上传接口: POST http://localhost:${PORT}/extract-images`)
  console.log(`🔍 文档图片检测: POST http://localhost:${PORT}/detect-image-after-text`)
  console.log(`🔍 文字位置查找: POST http://localhost:${PORT}/find-text-position`)
  console.log(`📄 文档内容提取: POST http://localhost:${PORT}/convert-document-to-html`)
  console.log(`📋 图片列表: GET http://localhost:${PORT}/images`)
  console.log(`❤️  健康检查: GET http://localhost:${PORT}/health`)
  console.log(`🖼️  图片访问: http://localhost:${PORT}/extracted_images/`)
  console.log(`🤖 AI对话: POST http://localhost:${PORT}/ai/chat`)
  console.log(`📁 文件上传分析: POST http://localhost:${PORT}/ai/upload-analyze`)
  console.log(`📊 文件分析: POST http://localhost:${PORT}/ai/analyze-file`)
  console.log(`📝 文件摘要: POST http://localhost:${PORT}/ai/generate-summary`)
  console.log(`🔍 模型列表: GET http://localhost:${PORT}/ai/models`)
  console.log(`📡 AI状态: GET http://localhost:${PORT}/ai/status`)
  console.log(`🤖 OpenAI对话: POST http://localhost:${PORT}/openai/chat`)
  console.log(`📁 OpenAI文件上传分析: POST http://localhost:${PORT}/openai/upload-analyze`)
  console.log(`📊 OpenAI文件分析: POST http://localhost:${PORT}/openai/analyze-file`)
  console.log(`📝 OpenAI文件摘要: POST http://localhost:${PORT}/openai/generate-summary`)
  console.log(`🔍 OpenAI模型列表: GET http://localhost:${PORT}/openai/models`)
  console.log(`📡 OpenAI状态: GET http://localhost:${PORT}/openai/status`)
  console.log(`🔤 OCR识别: POST http://localhost:${PORT}/ocr/recognize`)
  console.log(`🔤 Base64 OCR识别: POST http://localhost:${PORT}/ocr/recognize-base64`)
  console.log(`🔤 批量OCR识别: POST http://localhost:${PORT}/ocr/batch-recognize`)
  console.log(`📡 OCR状态: GET http://localhost:${PORT}/ocr/status`)

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 热加载已启用 - 修改代码后自动重启`)
  }
})

module.exports = app
