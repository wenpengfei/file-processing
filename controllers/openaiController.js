const OpenAIService = require('../services/openaiService')
const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')

/**
 * OpenAI控制器类
 * 负责处理OpenAI AI对话和文件分析的业务逻辑
 * 遵循SOLID原则，每个方法职责单一，异常处理完善
 */
class OpenAIController {
  constructor() {
    this.openaiService = new OpenAIService()
    this.setupFileUpload()
  }

  /**
   * 设置文件上传配置
   */
  setupFileUpload() {
    this.upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(__dirname, '..', 'uploads', 'openai-files')
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
   * 验证请求体是否存在
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @returns {boolean} 验证结果
   */
  validateRequestBody(req, res) {
    if (!req.body) {
      res.status(400).json({
        success: false,
        message: '请求体不能为空'
      })
      return false
    }
    return true
  }

  /**
   * 验证用户消息
   * @param {string} userMessage - 用户消息
   * @param {Object} res - 响应对象
   * @returns {boolean} 验证结果
   */
  validateUserMessage(userMessage, res) {
    if (!userMessage || typeof userMessage !== 'string') {
      res.status(400).json({
        success: false,
        message: '用户消息不能为空且必须是字符串'
      })
      return false
    }
    return true
  }

  /**
   * 验证文件内容
   * @param {string} fileContent - 文件内容
   * @param {Object} res - 响应对象
   * @returns {boolean} 验证结果
   */
  validateFileContent(fileContent, res) {
    if (!fileContent || typeof fileContent !== 'string') {
      res.status(400).json({
        success: false,
        message: '文件内容不能为空且必须是字符串'
      })
      return false
    }
    return true
  }

  /**
   * 验证文件名
   * @param {string} fileName - 文件名
   * @param {Object} res - 响应对象
   * @returns {boolean} 验证结果
   */
  validateFileName(fileName, res) {
    if (!fileName || typeof fileName !== 'string') {
      res.status(400).json({
        success: false,
        message: '文件名不能为空且必须是字符串'
      })
      return false
    }
    return true
  }

  /**
   * 处理AI对话请求
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async handleChat(req, res) {
    try {
      console.log('收到OpenAI AI对话请求')

      if (!this.validateRequestBody(req, res)) {
        return
      }

      const { message, model, conversationHistory = [] } = req.body

      if (!this.validateUserMessage(message, res)) {
        return
      }

      console.log(`处理OpenAI AI对话，模型: ${model || '默认'}, 消息长度: ${message.length}`)

      const result = await this.openaiService.sendMessage(message, model, conversationHistory)

      console.log('OpenAI AI对话处理完成')

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('OpenAI AI对话处理失败:', error.message)
      res.status(500).json({
        success: false,
        message: `OpenAI AI对话失败: ${error.message}`
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
      console.log('收到OpenAI文件分析请求')

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文件'
        })
      }

      const filePath = req.file.path
      const fileName = req.file.originalname
      const userQuestion = req.body.message || ''
      const modelName = req.body.model || null

      console.log(`分析文件: ${fileName}, 大小: ${req.file.size} bytes`)

      const result = await this.openaiService.analyzeFile(filePath, fileName, userQuestion, modelName)

      // 清理上传的文件
      await fs.remove(filePath)

      console.log('OpenAI文件分析完成')

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('OpenAI文件分析失败:', error.message)

      // 清理上传的文件（如果存在）
      if (req.file) {
        await fs.remove(req.file.path)
      }

      res.status(500).json({
        success: false,
        message: `OpenAI文件分析失败: ${error.message}`
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
      console.log('获取OpenAI可用模型列表')

      const models = await this.openaiService.getAvailableModels()

      console.log(`获取到 ${models.length} 个可用OpenAI模型`)

      res.json({
        success: true,
        data: {
          totalModels: models.length,
          models: models
        }
      })
    } catch (error) {
      console.error('获取OpenAI模型列表失败:', error.message)
      res.status(500).json({
        success: false,
        message: `获取OpenAI模型列表失败: ${error.message}`
      })
    }
  }

  /**
   * 分析文件内容
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async analyzeFileContent(req, res) {
    try {
      console.log('收到OpenAI文件内容分析请求')

      if (!this.validateRequestBody(req, res)) {
        return
      }

      const { fileContent, fileName } = req.body

      if (!this.validateFileContent(fileContent, res)) {
        return
      }

      if (!this.validateFileName(fileName, res)) {
        return
      }

      console.log(`开始分析文件: ${fileName}, 内容长度: ${fileContent.length}`)

      const result = await this.openaiService.analyzeTextFile(null, fileName, '', null, fileContent)

      console.log('OpenAI文件内容分析完成')

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('OpenAI文件内容分析失败:', error.message)
      res.status(500).json({
        success: false,
        message: `OpenAI文件内容分析失败: ${error.message}`
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
      console.log('收到OpenAI文件摘要生成请求')

      if (!this.validateRequestBody(req, res)) {
        return
      }

      const { fileContent, fileName, model } = req.body

      if (!this.validateFileContent(fileContent, res)) {
        return
      }

      if (!this.validateFileName(fileName, res)) {
        return
      }

      console.log(`开始生成文件摘要: ${fileName}, 内容长度: ${fileContent.length}`)

      const result = await this.openaiService.generateFileSummary(fileContent, fileName, model)

      console.log('OpenAI文件摘要生成完成')

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('OpenAI生成文件摘要失败:', error.message)
      res.status(500).json({
        success: false,
        message: `OpenAI生成文件摘要失败: ${error.message}`
      })
    }
  }

  /**
   * 检查OpenAI服务状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkStatus(req, res) {
    try {
      console.log('检查OpenAI服务状态')

      const status = await this.openaiService.checkServiceStatus()

      console.log(`OpenAI服务状态: ${status.status}`)

      res.json({
        success: true,
        data: status
      })
    } catch (error) {
      console.error('检查OpenAI服务状态失败:', error.message)
      res.status(500).json({
        success: false,
        message: `检查OpenAI服务状态失败: ${error.message}`
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

module.exports = OpenAIController
