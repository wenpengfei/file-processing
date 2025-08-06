const OpenRouterService = require('../services/openRouterService')
const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')

/**
 * OpenRouter控制器类
 * 负责处理AI对话和文件分析的业务逻辑
 */
class OpenRouterController {
  constructor() {
    this.openRouterService = new OpenRouterService()
    this.setupFileUpload()
  }

  /**
   * 设置文件上传配置
   */
  setupFileUpload() {
    this.upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(__dirname, '..', 'uploads', 'ai-files')
          fs.ensureDirSync(uploadDir)
          cb(null, uploadDir)
        },
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
          cb(null, uniqueName)
        }
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB限制
        files: 1
      },
      fileFilter: (req, file, cb) => {
        // 允许的文件类型
        const allowedTypes = [
          'text/plain',
          'text/csv',
          'application/json',
          'application/xml',
          'text/xml',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp'
        ]

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true)
        } else {
          cb(new Error('不支持的文件类型'), false)
        }
      }
    })
  }

  /**
   * 处理AI对话请求
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async handleChat(req, res) {
    try {
      console.log('收到AI对话请求')

      // 检查请求体是否存在
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: '请求体不能为空'
        })
      }

      const { message, model, conversationHistory = [] } = req.body

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: '消息不能为空且必须是字符串'
        })
      }

      console.log(`处理AI对话，模型: ${model || '默认'}, 消息长度: ${message.length}`)

      const result = await this.openRouterService.sendMessage(message, model, conversationHistory)

      console.log('AI对话处理完成')

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('AI对话处理失败:', error.message)
      res.status(500).json({
        success: false,
        message: `AI对话失败: ${error.message}`
      })
    }
  }

  /**
   * 处理文件上传和AI分析
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async handleFileAnalysis(req, res) {
    try {
      console.log('收到文件分析请求')

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文件'
        })
      }

      const filePath = req.file.path
      const fileName = req.file.originalname
      const message = req.body.message || ''
      const model = req.body.model || null

      console.log(`分析文件: ${fileName}, 大小: ${req.file.size} bytes`)

      let result
      const fileExtension = path.extname(fileName).toLowerCase()

      // 根据文件类型选择分析方法
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension)) {
        // 图片文件
        result = await this.openRouterService.analyzeImage(filePath, fileName, message, model)
      } else {
        // 文本文件
        result = await this.openRouterService.analyzeFile(filePath, fileName, message, model)
      }

      // 清理上传的文件
      await fs.remove(filePath)

      console.log('文件分析完成')

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('文件分析失败:', error.message)

      // 清理上传的文件（如果存在）
      if (req.file) {
        await fs.remove(req.file.path)
      }

      res.status(500).json({
        success: false,
        message: `文件分析失败: ${error.message}`
      })
    }
  }

  /**
   * 获取可用模型列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getModels(req, res) {
    try {
      console.log('获取可用模型列表')

      const models = await this.openRouterService.getAvailableModels()

      console.log(`获取到 ${models.length} 个可用模型`)

      res.json({
        success: true,
        data: {
          totalModels: models.length,
          models: models
        }
      })
    } catch (error) {
      console.error('获取模型列表失败:', error.message)
      res.status(500).json({
        success: false,
        message: `获取模型列表失败: ${error.message}`
      })
    }
  }

  /**
   * 分析文件内容
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async analyzeFile(req, res) {
    try {
      console.log('收到文件分析请求')

      // 检查请求体是否存在
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: '请求体不能为空'
        })
      }

      const { fileContent, fileName } = req.body

      if (!fileContent || typeof fileContent !== 'string') {
        return res.status(400).json({
          success: false,
          message: '文件内容不能为空且必须是字符串'
        })
      }

      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({
          success: false,
          message: '文件名不能为空且必须是字符串'
        })
      }

      console.log(`开始分析文件: ${fileName}, 内容长度: ${fileContent.length}`)

      const result = await this.openRouterService.analyzeFileContent(fileContent, fileName)

      console.log('文件分析完成')

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('文件分析失败:', error.message)
      res.status(500).json({
        success: false,
        message: `文件分析失败: ${error.message}`
      })
    }
  }

  /**
   * 生成文件摘要
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateSummary(req, res) {
    try {
      console.log('收到文件摘要生成请求')

      // 检查请求体是否存在
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: '请求体不能为空'
        })
      }

      const { fileContent, fileName } = req.body

      if (!fileContent || typeof fileContent !== 'string') {
        return res.status(400).json({
          success: false,
          message: '文件内容不能为空且必须是字符串'
        })
      }

      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({
          success: false,
          message: '文件名不能为空且必须是字符串'
        })
      }

      console.log(`开始生成文件摘要: ${fileName}, 内容长度: ${fileContent.length}`)

      const result = await this.openRouterService.generateFileSummary(fileContent, fileName)

      console.log('文件摘要生成完成')

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('生成文件摘要失败:', error.message)
      res.status(500).json({
        success: false,
        message: `生成文件摘要失败: ${error.message}`
      })
    }
  }

  /**
   * 检查OpenRouter服务状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkStatus(req, res) {
    try {
      console.log('检查OpenRouter服务状态')

      const status = await this.openRouterService.checkServiceStatus()

      console.log(`OpenRouter服务状态: ${status.status}`)

      res.json({
        success: true,
        data: status
      })
    } catch (error) {
      console.error('检查服务状态失败:', error.message)
      res.status(500).json({
        success: false,
        message: `检查服务状态失败: ${error.message}`
      })
    }
  }

  /**
   * 获取文件上传中间件
   * @returns {Object} multer上传中间件
   */
  getFileUploadMiddleware() {
    return this.upload.single('file')
  }
}

module.exports = OpenRouterController
