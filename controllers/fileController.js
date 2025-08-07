const { v4: uuidv4 } = require('uuid')
const FileUploadService = require('../services/fileUploadService')
const ImageExtractionService = require('../services/imageExtractionService')

/**
 * 文件控制器类
 * 负责处理文件上传和图片提取的业务逻辑
 */
class FileController {
  constructor() {
    this.fileUploadService = new FileUploadService()
    this.imageExtractionService = new ImageExtractionService()
  }

  /**
   * 处理文件上传和图片提取
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async handleFileUpload(req, res) {
    try {
      console.log('收到文件上传请求')
      console.log('请求头:', req.headers)

      if (!req.file) {
        console.log('没有接收到文件')
        return res.status(400).json({
          success: false,
          message: '请上传文件'
        })
      }

      const uploadedFilePath = req.file.path
      const originalFileName = uuidv4()
      const fileSize = req.file.size

      console.log(`开始处理文件: ${originalFileName}, 大小: ${fileSize} bytes, 路径: ${uploadedFilePath}`)

      // 验证文件
      const isValidFile = await this.fileUploadService.validateFile(uploadedFilePath)
      if (!isValidFile) {
        console.log('文件验证失败')
        await this.fileUploadService.cleanupTempFile(uploadedFilePath)
        return res.status(400).json({
          success: false,
          message: '无效的文件'
        })
      }

      console.log('文件验证通过，开始提取图片')

      // 提取图片信息
      const imagesList = await this.imageExtractionService.extractImagesFromFile(uploadedFilePath, originalFileName)

      console.log(`提取完成，共找到 ${imagesList.length} 张图片`)

      // 清理上传的临时文件
      await this.fileUploadService.cleanupTempFile(uploadedFilePath)

      const responseData = {
        success: true,
        message: '图片提取完成',
        data: {
          fileName: originalFileName,
          totalImages: imagesList.length,
          images: imagesList
        }
      }

      console.log('返回响应:', responseData)
      res.json(responseData)
    } catch (error) {
      console.error('处理文件时出错:', error)

      // 清理上传的文件（如果存在）
      if (req.file) {
        await this.fileUploadService.cleanupTempFile(req.file.path)
      }

      res.status(500).json({
        success: false,
        message: `处理失败: ${error.message}`
      })
    }
  }

  /**
   * 获取所有提取的图片列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getImagesList(req, res) {
    try {
      // 由于图片现在以base64格式返回，不再保存到本地
      // 这个端点主要用于兼容性，返回空列表
      res.json({
        success: true,
        message: '图片现在以base64格式返回，不再保存到本地文件',
        data: {
          totalImages: 0,
          images: []
        }
      })
    } catch (error) {
      console.error('获取图片列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取图片列表失败'
      })
    }
  }

  /**
   * 健康检查
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  healthCheck(req, res) {
    res.json({
      success: true,
      message: '服务运行正常',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 获取上传中间件
   * @returns {Object} multer上传中间件
   */
  getUploadMiddleware() {
    return this.fileUploadService.getUploadMiddleware()
  }
}

module.exports = FileController
