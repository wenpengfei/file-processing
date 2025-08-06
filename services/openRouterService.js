const axios = require('axios')
const fs = require('fs-extra')
const path = require('path')

/**
 * OpenRouter服务类
 * 负责与OpenRouter API进行交互，提供AI对话功能
 */
class OpenRouterService {
  constructor() {
    this.baseURL = 'https://openrouter.ai/api/v1'
    this.apiKey =
      process.env.OPENROUTER_API_KEY || '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'
    this.defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'deepseek/deepseek-chat-v3-0324:free'

    this.validateConfiguration()
  }

  /**
   * 验证配置是否正确
   */
  validateConfiguration() {
    if (!this.apiKey) {
      throw new Error('OpenRouter API密钥未配置，请设置OPENROUTER_API_KEY环境变量')
    }
  }

  /**
   * 创建axios实例
   * @returns {Object} axios实例
   */
  createAxiosInstance() {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3020',
        'X-Title': 'File Processing App'
      },
      timeout: 30000 // 30秒超时
    })
  }

  /**
   * 发送聊天消息到OpenRouter
   * @param {string} message - 用户消息
   * @param {string} model - 模型名称（可选）
   * @param {Array} conversationHistory - 对话历史（可选）
   * @returns {Promise<Object>} AI响应
   */
  async sendMessage(message, model = null, conversationHistory = []) {
    try {
      if (!message || typeof message !== 'string') {
        throw new Error('消息不能为空且必须是字符串')
      }

      const targetModel = model || this.defaultModel
      const axiosInstance = this.createAxiosInstance()

      // 构建消息历史
      const messages = [...conversationHistory, { role: 'user', content: message }]

      const requestData = {
        model: targetModel,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }

      console.log(`发送消息到OpenRouter，模型: ${targetModel}`)

      const response = await axiosInstance.post('/chat/completions', requestData)

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('OpenRouter响应格式错误')
      }

      const aiResponse = response.data.choices[0].message.content
      const usage = response.data.usage

      console.log(`OpenRouter响应成功，使用token: ${usage?.total_tokens || '未知'}`)

      return {
        success: true,
        message: aiResponse,
        usage: usage,
        model: targetModel
      }
    } catch (error) {
      console.error('OpenRouter API调用失败:', error.message)

      if (error.response) {
        // API错误响应
        const errorMessage = error.response.data?.error?.message || 'OpenRouter API错误'
        throw new Error(`OpenRouter API错误: ${errorMessage}`)
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('OpenRouter API请求超时')
      } else {
        throw new Error(`OpenRouter服务错误: ${error.message}`)
      }
    }
  }

  /**
   * 处理文件并发送到AI进行分析
   * @param {string} filePath - 文件路径
   * @param {string} fileName - 文件名
   * @param {string} message - 用户消息（可选）
   * @param {string} model - 模型名称（可选）
   * @returns {Promise<Object>} AI分析结果
   */
  async analyzeFile(filePath, fileName, message = '', model = null) {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('文件不存在或路径无效')
      }

      // 读取文件内容
      const fileContent = await fs.readFile(filePath, 'utf8')
      const fileSize = fs.statSync(filePath).size

      console.log(`分析文件: ${fileName}, 大小: ${fileSize} bytes`)

      // 构建分析提示
      const analysisPrompt = message
        ? `请分析以下文件内容并回答用户问题：

文件名：${fileName}
文件大小：${fileSize} bytes
文件内容：
${fileContent}

用户问题：${message}

请提供详细的分析和回答。`
        : `请分析以下文件内容并提供详细报告：

文件名：${fileName}
文件大小：${fileSize} bytes
文件内容：
${fileContent}

请提供以下分析：
1. 文件类型和格式
2. 主要内容概述
3. 关键信息提取
4. 潜在的问题或建议
5. 文件质量评估

请用中文回答，格式要清晰易读。`

      const result = await this.sendMessage(analysisPrompt, model)

      return {
        success: true,
        fileName: fileName,
        fileSize: fileSize,
        analysis: result.message,
        usage: result.usage,
        model: result.model
      }
    } catch (error) {
      console.error('文件分析失败:', error.message)
      throw new Error(`文件分析失败: ${error.message}`)
    }
  }

  /**
   * 处理图片文件并发送到AI进行分析
   * @param {string} imagePath - 图片文件路径
   * @param {string} imageName - 图片文件名
   * @param {string} message - 用户消息（可选）
   * @param {string} model - 模型名称（可选）
   * @returns {Promise<Object>} AI分析结果
   */
  async analyzeImage(imagePath, imageName, message = '', model = null) {
    try {
      if (!imagePath || !fs.existsSync(imagePath)) {
        throw new Error('图片文件不存在或路径无效')
      }

      // 读取图片文件并转换为base64
      const imageBuffer = await fs.readFile(imagePath)
      const base64Image = imageBuffer.toString('base64')
      const imageFormat = path.extname(imagePath).substring(1).toLowerCase()

      console.log(`分析图片: ${imageName}, 格式: ${imageFormat}`)

      // 构建图片分析提示
      const imagePrompt = message
        ? `请分析以下图片并回答用户问题：

图片名称：${imageName}
图片格式：${imageFormat}

用户问题：${message}

请提供详细的分析和回答。`
        : `请分析以下图片并提供详细描述：

图片名称：${imageName}
图片格式：${imageFormat}

请提供以下分析：
1. 图片内容描述
2. 图片质量评估
3. 主要元素识别
4. 颜色和构图分析
5. 可能的用途或场景

请用中文回答，格式要清晰易读。`

      // 注意：OpenRouter目前不支持图片分析，这里提供文本分析作为替代
      const result = await this.sendMessage(imagePrompt, model)

      return {
        success: true,
        imageName: imageName,
        imageFormat: imageFormat,
        analysis: result.message,
        usage: result.usage,
        model: result.model,
        note: 'OpenRouter目前不支持图片分析，这是基于图片信息的文本分析'
      }
    } catch (error) {
      console.error('图片分析失败:', error.message)
      throw new Error(`图片分析失败: ${error.message}`)
    }
  }

  /**
   * 获取可用的模型列表
   * @returns {Promise<Array>} 模型列表
   */
  async getAvailableModels() {
    try {
      const axiosInstance = this.createAxiosInstance()
      const response = await axiosInstance.get('/models')

      if (!response.data || !response.data.data) {
        throw new Error('获取模型列表失败')
      }

      return response.data.data.map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        context_length: model.context_length,
        pricing: model.pricing
      }))
    } catch (error) {
      console.error('获取模型列表失败:', error.message)
      throw new Error(`获取模型列表失败: ${error.message}`)
    }
  }

  /**
   * 分析文件内容（基于文本）
   * @param {string} fileContent - 文件内容
   * @param {string} fileName - 文件名
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeFileContent(fileContent, fileName) {
    try {
      const prompt = `
请分析以下文件内容并提供详细的分析报告：

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

      const result = await this.sendMessage(prompt)

      return {
        success: true,
        fileName: fileName,
        analysis: result.message,
        usage: result.usage
      }
    } catch (error) {
      console.error('文件内容分析失败:', error.message)
      throw new Error(`文件分析失败: ${error.message}`)
    }
  }

  /**
   * 生成文件摘要
   * @param {string} fileContent - 文件内容
   * @param {string} fileName - 文件名
   * @returns {Promise<Object>} 摘要结果
   */
  async generateFileSummary(fileContent, fileName) {
    try {
      const prompt = `
请为以下文件生成一个简洁的摘要：

文件名：${fileName}
文件内容：
${fileContent}

请生成一个200字以内的中文摘要，突出文件的核心要点。
      `.trim()

      const result = await this.sendMessage(prompt)

      return {
        success: true,
        fileName: fileName,
        summary: result.message,
        usage: result.usage
      }
    } catch (error) {
      console.error('生成文件摘要失败:', error.message)
      throw new Error(`生成摘要失败: ${error.message}`)
    }
  }

  /**
   * 检查服务状态
   * @returns {Promise<Object>} 服务状态
   */
  async checkServiceStatus() {
    try {
      const testMessage = 'Hello, this is a test message.'
      const result = await this.sendMessage(testMessage)

      return {
        success: true,
        status: 'connected',
        message: 'OpenRouter服务连接正常',
        model: result.model
      }
    } catch (error) {
      return {
        success: false,
        status: 'error',
        message: `OpenRouter服务连接失败: ${error.message}`
      }
    }
  }
}

module.exports = OpenRouterService
