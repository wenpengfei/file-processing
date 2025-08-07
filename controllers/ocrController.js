const { v4: uuidv4 } = require('uuid')
const OCRService = require('../services/ocrService')
const FileUploadService = require('../services/fileUploadService')

/**
 * OCR控制器类
 * 负责处理OCR文字识别的业务逻辑
 */
class OCRController {
  constructor() {
    this.ocrService = new OCRService()
    this.fileUploadService = new FileUploadService()
  }

  /**
   * 处理图片OCR识别
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async handleImageOCR(req, res) {
    try {
      console.log('收到图片OCR识别请求')
      console.log('请求头:', req.headers)

      if (!req.file) {
        console.log('没有接收到图片文件')
        return res.status(400).json({
          success: false,
          message: '请上传图片文件'
        })
      }

      const uploadedImagePath = req.file.path
      const originalFileName = req.file.originalname
      const fileSize = req.file.size

      console.log(`开始处理图片: ${originalFileName}, 大小: ${fileSize} bytes, 路径: ${uploadedImagePath}`)

      // 验证图片文件
      const isValidImage = await this.fileUploadService.validateFile(uploadedImagePath)
      if (!isValidImage) {
        console.log('图片文件验证失败')
        await this.fileUploadService.cleanupTempFile(uploadedImagePath)
        return res.status(400).json({
          success: false,
          message: '无效的图片文件'
        })
      }

      console.log('图片文件验证通过，开始OCR识别')

      // 调用OCR服务进行文字识别
      const ocrResult = await this.ocrService.recognizeText(uploadedImagePath)

      console.log('OCR识别完成')

      // 清理上传的临时文件
      await this.fileUploadService.cleanupTempFile(uploadedImagePath)

      const responseData = {
        success: true,
        message: 'OCR识别完成',
        data: {
          fileName: originalFileName,
          fileSize: fileSize,
          ocrResult: ocrResult.data
        }
      }

      console.log('返回OCR响应:', responseData)
      res.json(responseData)
    } catch (error) {
      console.error('处理OCR识别时出错:', error)

      // 清理上传的文件（如果存在）
      if (req.file) {
        await this.fileUploadService.cleanupTempFile(req.file.path)
      }

      res.status(500).json({
        success: false,
        message: `OCR识别失败: ${error.message}`
      })
    }
  }

  /**
   * 处理Base64图片数据的OCR识别
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async handleBase64OCR(req, res) {
    try {
      console.log('收到Base64图片OCR识别请求')

      const { base64Image } = req.body

      if (!base64Image) {
        console.log('没有接收到Base64图片数据')
        return res.status(400).json({
          success: false,
          message: '请提供Base64编码的图片数据'
        })
      }

      console.log('开始处理Base64图片OCR识别')

      // 调用OCR服务进行文字识别
      const ocrResult = await this.ocrService.recognizeTextFromBase64(base64Image)

      console.log('Base64图片OCR识别完成')

      const responseData = {
        success: true,
        message: 'OCR识别完成',
        data: {
          ocrResult: ocrResult.data
        }
      }

      console.log('返回Base64 OCR响应:', responseData)
      res.json(responseData)
    } catch (error) {
      console.error('处理Base64 OCR识别时出错:', error)

      res.status(500).json({
        success: false,
        message: `OCR识别失败: ${error.message}`
      })
    }
  }

  /**
   * 批量处理多张图片的OCR识别
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async handleBatchOCR(req, res) {
    try {
      console.log('收到批量OCR识别请求')

      if (!req.files || req.files.length === 0) {
        console.log('没有接收到图片文件')
        return res.status(400).json({
          success: false,
          message: '请上传图片文件'
        })
      }

      console.log(`开始批量处理 ${req.files.length} 张图片`)

      const results = []
      const errors = []

      // 并行处理所有图片
      const ocrPromises = req.files.map(async (file) => {
        try {
          const uploadedImagePath = file.path
          const originalFileName = file.originalname

          // 验证图片文件
          const isValidImage = await this.fileUploadService.validateFile(uploadedImagePath)
          if (!isValidImage) {
            throw new Error('无效的图片文件')
          }

          // 调用OCR服务进行文字识别
          const ocrResult = await this.ocrService.recognizeText(uploadedImagePath)

          // 清理临时文件
          await this.fileUploadService.cleanupTempFile(uploadedImagePath)

          return {
            fileName: originalFileName,
            success: true,
            ocrResult: ocrResult.data
          }
        } catch (error) {
          // 清理临时文件
          if (file.path) {
            await this.fileUploadService.cleanupTempFile(file.path)
          }

          return {
            fileName: file.originalname,
            success: false,
            error: error.message
          }
        }
      })

      // 等待所有OCR处理完成
      const batchResults = await Promise.all(ocrPromises)

      // 分离成功和失败的结果
      batchResults.forEach((result) => {
        if (result.success) {
          results.push(result)
        } else {
          errors.push(result)
        }
      })

      console.log(`批量OCR处理完成，成功: ${results.length}, 失败: ${errors.length}`)

      const responseData = {
        success: true,
        message: '批量OCR识别完成',
        data: {
          totalFiles: req.files.length,
          successCount: results.length,
          errorCount: errors.length,
          results: results,
          errors: errors
        }
      }

      console.log('返回批量OCR响应:', responseData)
      res.json(responseData)
    } catch (error) {
      console.error('处理批量OCR识别时出错:', error)

      // 清理所有上传的文件
      if (req.files) {
        for (const file of req.files) {
          await this.fileUploadService.cleanupTempFile(file.path)
        }
      }

      res.status(500).json({
        success: false,
        message: `批量OCR识别失败: ${error.message}`
      })
    }
  }

  /**
   * 检查OCR服务状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkOCRStatus(req, res) {
    try {
      console.log('收到OCR服务状态检查请求')

      const status = await this.ocrService.checkServiceStatus()

      res.json(status)
    } catch (error) {
      console.error('检查OCR服务状态时出错:', error)

      res.status(500).json({
        success: false,
        message: `OCR服务状态检查失败: ${error.message}`
      })
    }
  }

  /**
   * 获取OCR上传中间件（用于图片文件上传）
   * @returns {Object} multer上传中间件
   */
  getOCRUploadMiddleware() {
    return this.fileUploadService.getUploadMiddleware()
  }

  /**
   * 获取批量OCR上传中间件（用于多张图片上传）
   * @returns {Object} multer上传中间件
   */
  getBatchOCRUploadMiddleware() {
    return this.fileUploadService.getUploadMiddleware()
  }
}

module.exports = OCRController
