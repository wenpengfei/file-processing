const axios = require('axios')
const fs = require('fs-extra')
const path = require('path')

/**
 * OCR服务类
 * 负责调用OCR接口进行图像文字识别
 * 遵循SOLID原则，每个方法职责单一，异常处理完善
 */
class OCRService {
  constructor() {
    this.baseURL = 'https://im-test.youjiashuju.com'
    this.ocrEndpoint = '/clas_and_ocr'
    this.timeout = 30000 // 30秒超时
  }

  /**
   * 创建axios实例用于OCR API调用
   * @returns {Object} 配置好的axios实例
   */
  createAxiosInstance() {
    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: this.timeout
    })
  }

  /**
   * 验证图片路径是否存在且有效
   * @param {string} imagePath - 图片路径
   * @returns {Promise<boolean>} 图片是否有效
   */
  async validateImagePath(imagePath) {
    try {
      const stats = await fs.stat(imagePath)
      return stats.isFile() && stats.size > 0
    } catch (error) {
      console.error('图片路径验证失败:', error)
      return false
    }
  }

  /**
   * 将图片文件转换为Base64编码
   * @param {string} imagePath - 图片文件路径
   * @returns {Promise<string>} Base64编码的图片数据
   */
  async imageToBase64(imagePath) {
    try {
      const imageBuffer = await fs.readFile(imagePath)
      const base64Data = imageBuffer.toString('base64')
      return base64Data
    } catch (error) {
      console.error('图片转Base64失败:', error)
      throw new Error(`图片转Base64失败: ${error.message}`)
    }
  }

  /**
   * 构建OCR请求数据
   * @param {string} base64Image - Base64编码的图片数据
   * @returns {Object} 请求数据对象
   */
  buildOCRRequestData(base64Image) {
    return {
      img_flag: 1,
      images: base64Image
    }
  }

  /**
   * 处理OCR API错误
   * @param {Error} error - 错误对象
   * @throws {Error} 格式化的错误信息
   */
  handleOCRError(error) {
    console.error('OCR API调用失败:', error)

    if (error.response) {
      // 服务器返回了错误状态码
      const status = error.response.status
      const data = error.response.data

      console.error(`OCR API错误 - 状态码: ${status}, 响应数据:`, data)

      throw new Error(`OCR服务错误 (${status}): ${data?.message || data?.error || '未知错误'}`)
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('OCR API无响应:', error.request)
      throw new Error('OCR服务无响应，请检查网络连接')
    } else {
      // 请求设置时发生错误
      console.error('OCR API请求设置错误:', error.message)
      throw new Error(`OCR请求设置错误: ${error.message}`)
    }
  }

  /**
   * 调用OCR接口识别图片中的文字
   * @param {string} imagePath - 图片文件路径
   * @returns {Promise<Object>} OCR识别结果
   */
  async recognizeText(imagePath) {
    try {
      console.log(`开始OCR识别图片: ${imagePath}`)

      // 验证图片路径
      const isValidImage = await this.validateImagePath(imagePath)
      if (!isValidImage) {
        throw new Error('无效的图片文件路径')
      }

      // 将图片转换为Base64
      console.log('正在转换图片为Base64格式...')
      const base64Image = await this.imageToBase64(imagePath)
      console.log(`图片转换完成，Base64长度: ${base64Image.length}`)

      // 构建请求数据
      const requestData = this.buildOCRRequestData(base64Image)
      console.log('OCR请求数据构建完成')

      // 创建axios实例并发送请求
      const axiosInstance = this.createAxiosInstance()
      console.log(`正在调用OCR接口: ${this.baseURL}${this.ocrEndpoint}`)

      const response = await axiosInstance.post(this.ocrEndpoint, requestData)

      console.log('OCR接口调用成功')
      console.log('OCR响应数据:', response.data)

      return {
        success: true,
        message: 'OCR识别完成',
        data: response.data
      }
    } catch (error) {
      this.handleOCRError(error)
    }
  }

  /**
   * 从Base64数据直接进行OCR识别
   * @param {string} base64Image - Base64编码的图片数据
   * @returns {Promise<Object>} OCR识别结果
   */
  async recognizeTextFromBase64(base64Image) {
    try {
      console.log('开始OCR识别Base64图片数据')

      // 构建请求数据
      const requestData = this.buildOCRRequestData(base64Image)
      console.log('OCR请求数据构建完成', requestData)

      // 创建axios实例并发送请求
      const axiosInstance = this.createAxiosInstance()
      console.log(`正在调用OCR接口: ${this.baseURL}${this.ocrEndpoint}`)

      const response = await axiosInstance.post(this.ocrEndpoint, requestData)

      console.log('OCR接口调用成功')
      console.log('OCR响应数据:', response.data)

      return {
        success: true,
        message: 'OCR识别完成',
        data: response.data
      }
    } catch (error) {
      this.handleOCRError(error)
    }
  }

  /**
   * 检查OCR服务状态
   * @returns {Promise<Object>} 服务状态信息
   */
  async checkServiceStatus() {
    try {
      const axiosInstance = this.createAxiosInstance()
      const response = await axiosInstance.get('/health') // 假设有健康检查端点

      return {
        success: true,
        message: 'OCR服务正常',
        data: response.data
      }
    } catch (error) {
      return {
        success: false,
        message: 'OCR服务不可用',
        error: error.message
      }
    }
  }
}

module.exports = OCRService
