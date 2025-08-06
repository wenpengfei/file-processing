const axios = require('axios')
const fs = require('fs-extra')
const path = require('path')

/**
 * OpenAI服务类
 * 负责与OpenAI API进行交互，提供AI对话和文件分析功能
 * 遵循SOLID原则，每个方法职责单一，异常处理完善
 */
class OpenAIService {
  constructor() {
    this.baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    this.apiKey = process.env.OPENAI_API_KEY || 'sk-3e9176f8daa64c29a19e6d26f23de78d'
    this.defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'qwen-vl-max'
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7

    this.validateConfiguration()
  }

  /**
   * 验证OpenAI配置是否正确
   * @throws {Error} 配置错误时抛出异常
   */
  validateConfiguration() {
    if (!this.apiKey) {
      throw new Error('OpenAI API密钥未配置，请设置OPENAI_API_KEY环境变量')
    }

    if (!this.apiKey.startsWith('sk-')) {
      throw new Error('OpenAI API密钥格式不正确，应以sk-开头')
    }
  }

  /**
   * 创建axios实例用于OpenAI API调用
   * @returns {Object} 配置好的axios实例
   */
  createAxiosInstance() {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60秒超时，AI响应可能需要更长时间
    })
  }

  /**
   * 验证消息格式是否正确
   * @param {string} userMessage - 用户消息
   * @throws {Error} 消息格式错误时抛出异常
   */
  validateUserMessage(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('用户消息不能为空且必须是字符串')
    }

    if (userMessage.trim().length === 0) {
      throw new Error('用户消息不能为空')
    }
  }

  /**
   * 验证对话历史格式
   * @param {Array} conversationHistory - 对话历史
   * @throws {Error} 对话历史格式错误时抛出异常
   */
  validateConversationHistory(conversationHistory) {
    if (!Array.isArray(conversationHistory)) {
      throw new Error('对话历史必须是数组格式')
    }

    for (const message of conversationHistory) {
      if (!message.role || !message.content) {
        throw new Error('对话历史中的消息必须包含role和content字段')
      }

      if (!['user', 'assistant', 'system'].includes(message.role)) {
        throw new Error('消息角色必须是user、assistant或system')
      }
    }
  }

  /**
   * 构建OpenAI API请求数据
   * @param {string} userMessage - 用户消息
   * @param {string} targetModel - 目标模型
   * @param {Array} conversationHistory - 对话历史
   * @returns {Object} 请求数据对象
   */
  buildRequestData(userMessage, targetModel, conversationHistory) {
    const messages = [...conversationHistory, { role: 'user', content: userMessage }]

    return {
      model: targetModel,
      messages: messages,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      stream: false
    }
  }

  /**
   * 处理OpenAI API错误
   * @param {Error} error - 错误对象
   * @throws {Error} 重新抛出处理后的错误
   */
  handleOpenAIError(error) {
    if (error.response) {
      const statusCode = error.response.status
      const errorData = error.response.data

      switch (statusCode) {
        case 401:
          throw new Error('OpenAI API密钥无效或已过期')
        case 403:
          throw new Error('OpenAI API访问被拒绝，请检查API密钥权限')
        case 429:
          throw new Error('OpenAI API请求频率过高，请稍后重试')
        case 500:
          throw new Error('OpenAI服务器内部错误，请稍后重试')
        default:
          const errorMessage = errorData?.error?.message || 'OpenAI API错误'
          throw new Error(`OpenAI API错误 (${statusCode}): ${errorMessage}`)
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('OpenAI API请求超时，请检查网络连接')
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('无法连接到OpenAI API，请检查网络连接')
    } else {
      throw new Error(`OpenAI服务错误: ${error.message}`)
    }
  }

  /**
   * 发送聊天消息到OpenAI
   * @param {string} userMessage - 用户消息
   * @param {string} modelName - 模型名称（可选）
   * @param {Array} conversationHistory - 对话历史（可选）
   * @returns {Promise<Object>} AI响应结果
   */
  async sendMessage(userMessage, modelName = null, conversationHistory = []) {
    try {
      // 验证输入参数
      this.validateUserMessage(userMessage)
      this.validateConversationHistory(conversationHistory)

      const targetModel = modelName || this.defaultModel
      const axiosInstance = this.createAxiosInstance()
      const requestData = this.buildRequestData(userMessage, targetModel, conversationHistory)

      console.log(`发送消息到OpenAI，模型: ${targetModel}, 消息长度: ${userMessage.length}`)

      const response = await axiosInstance.post('/chat/completions', requestData)

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('OpenAI响应格式错误')
      }

      const aiResponse = response.data.choices[0].message.content
      const usage = response.data.usage

      console.log(`OpenAI响应成功，使用token: ${usage?.total_tokens || '未知'}`)

      return {
        success: true,
        message: aiResponse,
        usage: usage,
        model: targetModel
      }
    } catch (error) {
      console.error('OpenAI API调用失败:', error.message)
      this.handleOpenAIError(error)
    }
  }

  /**
   * 验证文件路径是否存在
   * @param {string} filePath - 文件路径
   * @throws {Error} 文件不存在时抛出异常
   */
  validateFilePath(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('文件不存在或路径无效')
    }
  }

  /**
   * 读取文件内容
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} 文件内容
   */
  async readFileContent(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8')
    } catch (error) {
      throw new Error(`读取文件失败: ${error.message}`)
    }
  }

  /**
   * 获取文件信息
   * @param {string} filePath - 文件路径
   * @returns {Object} 文件信息
   */
  getFileInfo(filePath) {
    const stats = fs.statSync(filePath)
    return {
      size: stats.size,
      extension: path.extname(filePath).toLowerCase(),
      name: path.basename(filePath)
    }
  }

  /**
   * 构建文件分析提示词
   * @param {string} fileContent - 文件内容
   * @param {string} fileName - 文件名
   * @param {string} userQuestion - 用户问题（可选）
   * @returns {string} 分析提示词
   */
  buildFileAnalysisPrompt(fileContent, fileName, userQuestion = '') {
    const basePrompt = `
请分析以下文件内容并提供详细报告：

文件名：${fileName}
文件内容：
${fileContent}

请提供以下分析：
1. 文件类型和格式
2. 主要内容概述
3. 关键信息提取
4. 潜在的问题或建议
5. 文件质量评估

请用中文回答，格式要清晰易读。
    `.trim()

    if (userQuestion) {
      return `
请分析以下文件内容并回答用户问题：

文件名：${fileName}
文件内容：
${fileContent}

用户问题：${userQuestion}

请提供详细的分析和回答。
      `.trim()
    }

    return basePrompt
  }

  /**
   * 分析文本文件内容
   * @param {string} filePath - 文件路径
   * @param {string} fileName - 文件名
   * @param {string} userQuestion - 用户问题（可选）
   * @param {string} modelName - 模型名称（可选）
   * @param {string} fileContent - 文件内容（可选，如果提供则跳过文件读取）
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeTextFile(filePath, fileName, userQuestion = '', modelName = null, fileContent = null) {
    try {
      let actualFileContent
      let fileInfo

      if (fileContent) {
        // 如果提供了文件内容，直接使用
        actualFileContent = fileContent
        fileInfo = {
          size: fileContent.length,
          extension: path.extname(fileName).toLowerCase(),
          name: fileName
        }
      } else {
        // 否则从文件路径读取
        this.validateFilePath(filePath)
        actualFileContent = await this.readFileContent(filePath)
        fileInfo = this.getFileInfo(filePath)
      }

      console.log(`分析文本文件: ${fileName}, 大小: ${fileInfo.size} bytes`)

      const analysisPrompt = this.buildFileAnalysisPrompt(actualFileContent, fileName, userQuestion)
      const result = await this.sendMessage(analysisPrompt, modelName)

      return {
        success: true,
        fileName: fileName,
        fileSize: fileInfo.size,
        fileExtension: fileInfo.extension,
        analysis: result.message,
        usage: result.usage,
        model: result.model
      }
    } catch (error) {
      console.error('文本文件分析失败:', error.message)
      throw new Error(`文本文件分析失败: ${error.message}`)
    }
  }

  /**
   * 读取图片文件并转换为base64
   * @param {string} imagePath - 图片路径
   * @returns {Promise<string>} base64编码的图片
   */
  async readImageAsBase64(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath)
      return imageBuffer.toString('base64')
    } catch (error) {
      throw new Error(`读取图片文件失败: ${error.message}`)
    }
  }

  /**
   * 构建图片分析提示词
   * @param {string} imageName - 图片名称
   * @param {string} imageFormat - 图片格式
   * @param {string} userQuestion - 用户问题（可选）
   * @returns {string} 图片分析提示词
   */
  buildImageAnalysisPrompt(imageName, imageFormat, userQuestion = '') {
    const basePrompt = `
请分析以下图片并提供详细描述：

图片名称：${imageName}
图片格式：${imageFormat}

请提供以下分析：
1. 图片内容描述
2. 图片质量评估
3. 主要元素识别
4. 颜色和构图分析
5. 可能的用途或场景

请用中文回答，格式要清晰易读。
    `.trim()

    if (userQuestion) {
      return `
请分析以下图片并回答用户问题：

图片名称：${imageName}
图片格式：${imageFormat}

用户问题：${userQuestion}

请提供详细的分析和回答。
      `.trim()
    }

    return basePrompt
  }

  /**
   * 分析图片文件（使用GPT-4 Vision模型）
   * @param {string} imagePath - 图片路径
   * @param {string} imageName - 图片名称
   * @param {string} userQuestion - 用户问题（可选）
   * @param {string} modelName - 模型名称（可选）
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeImage(imagePath, imageName, userQuestion = '', modelName = null) {
    try {
      this.validateFilePath(imagePath)

      const imageBase64 = await this.readImageAsBase64(imagePath)
      const imageInfo = this.getFileInfo(imagePath)
      const imageFormat = imageInfo.extension.substring(1)

      console.log(`分析图片: ${imageName}, 格式: ${imageFormat}`)

      const targetModel = modelName || 'gpt-4-vision-preview'
      const analysisPrompt = this.buildImageAnalysisPrompt(imageName, imageFormat, userQuestion)

      const axiosInstance = this.createAxiosInstance()
      const requestData = {
        model: targetModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/${imageFormat};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      }

      const response = await axiosInstance.post('/chat/completions', requestData)

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('OpenAI图片分析响应格式错误')
      }

      const aiResponse = response.data.choices[0].message.content
      const usage = response.data.usage

      console.log(`图片分析成功，使用token: ${usage?.total_tokens || '未知'}`)

      return {
        success: true,
        imageName: imageName,
        imageFormat: imageFormat,
        analysis: aiResponse,
        usage: usage,
        model: targetModel
      }
    } catch (error) {
      console.error('图片分析失败:', error.message)
      throw new Error(`图片分析失败: ${error.message}`)
    }
  }

  /**
   * 根据文件类型选择分析方法
   * @param {string} filePath - 文件路径
   * @param {string} fileName - 文件名
   * @param {string} userQuestion - 用户问题（可选）
   * @param {string} modelName - 模型名称（可选）
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeFile(filePath, fileName, userQuestion = '', modelName = null) {
    try {
      this.validateFilePath(filePath)

      const fileInfo = this.getFileInfo(filePath)
      const isImageFile = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileInfo.extension)

      if (isImageFile) {
        return await this.analyzeImage(filePath, fileName, userQuestion, modelName)
      } else {
        return await this.analyzeTextFile(filePath, fileName, userQuestion, modelName)
      }
    } catch (error) {
      console.error('文件分析失败:', error.message)
      throw new Error(`文件分析失败: ${error.message}`)
    }
  }

  /**
   * 生成文件摘要
   * @param {string} fileContent - 文件内容
   * @param {string} fileName - 文件名
   * @param {string} modelName - 模型名称（可选）
   * @returns {Promise<Object>} 摘要结果
   */
  async generateFileSummary(fileContent, fileName, modelName = null) {
    try {
      if (!fileContent || typeof fileContent !== 'string') {
        throw new Error('文件内容不能为空且必须是字符串')
      }

      const summaryPrompt = `
请为以下文件生成一个简洁的摘要：

文件名：${fileName}
文件内容：
${fileContent}

请生成一个200字以内的中文摘要，突出文件的核心要点。
      `.trim()

      const result = await this.sendMessage(summaryPrompt, modelName)

      return {
        success: true,
        fileName: fileName,
        summary: result.message,
        usage: result.usage,
        model: result.model
      }
    } catch (error) {
      console.error('生成文件摘要失败:', error.message)
      throw new Error(`生成摘要失败: ${error.message}`)
    }
  }

  /**
   * 获取可用的OpenAI模型列表
   * @returns {Promise<Array>} 模型列表
   */
  async getAvailableModels() {
    try {
      const axiosInstance = this.createAxiosInstance()
      const response = await axiosInstance.get('/models')

      if (!response.data || !response.data.data) {
        throw new Error('获取模型列表失败')
      }

      return response.data.data
        .filter((model) => model.id.includes('gpt'))
        .map((model) => ({
          id: model.id,
          name: model.id,
          description: `OpenAI ${model.id} 模型`,
          context_length: model.context_length || '未知',
          pricing: '请查看OpenAI官方定价'
        }))
    } catch (error) {
      console.error('获取OpenAI模型列表失败:', error.message)
      throw new Error(`获取模型列表失败: ${error.message}`)
    }
  }

  /**
   * 检查OpenAI服务状态
   * @returns {Promise<Object>} 服务状态
   */
  async checkServiceStatus() {
    try {
      const testMessage = 'Hello, this is a test message.'
      const result = await this.sendMessage(testMessage)

      return {
        success: true,
        status: 'connected',
        message: 'OpenAI服务连接正常',
        model: result.model
      }
    } catch (error) {
      return {
        success: false,
        status: 'error',
        message: `OpenAI服务连接失败: ${error.message}`
      }
    }
  }
}

module.exports = OpenAIService
