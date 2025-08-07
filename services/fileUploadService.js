const multer = require('multer')
const fs = require('fs-extra')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

/**
 * 文件上传服务类
 * 负责处理文件上传、验证和存储
 */
class FileUploadService {
  constructor() {
    this.storage = this.createStorage()
    this.upload = this.createUploadMiddleware()
  }

  /**
   * 创建multer存储配置
   * @returns {Object} multer存储配置
   */
  createStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads')
        fs.ensureDirSync(uploadDir)
        cb(null, uploadDir)
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`
        cb(null, uniqueName)
      }
    })
  }

  /**
   * 创建multer上传中间件
   * @returns {Object} multer上传中间件
   */
  createUploadMiddleware() {
    return multer({
      storage: this.storage,
      fileFilter: this.fileFilter.bind(this)
    })
  }

  /**
   * 文件类型过滤器
   * @param {Object} req - 请求对象
   * @param {Object} file - 文件对象
   * @param {Function} cb - 回调函数
   */
  fileFilter(req, file, cb) {
    // 根据请求路径决定允许的文件类型
    const isOCRRequest = req.path && req.path.includes('/ocr')
    
    let allowedTypes
    let errorMessage
    
    if (isOCRRequest) {
      // OCR请求允许图片格式
      allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']
      errorMessage = '只支持图片格式文件 (JPG, PNG, GIF, BMP, TIFF, WEBP)'
    } else {
      // 默认允许文档格式
      allowedTypes = ['.pdf', '.docx', '.doc']
      errorMessage = '只支持 PDF 和 Word 文档'
    }
    
    const fileExtension = path.extname(file.originalname).toLowerCase()

    console.log('文件上传验证:', {
      originalName: file.originalname,
      fileExtension: fileExtension,
      allowedTypes: allowedTypes,
      isAllowed: allowedTypes.includes(fileExtension),
      isOCRRequest: isOCRRequest
    })

    if (allowedTypes.includes(fileExtension)) {
      cb(null, true)
    } else {
      const errorMsg = `不支持的文件格式: ${fileExtension}。${errorMessage}`
      console.log('文件格式验证失败:', errorMsg)
      cb(new Error(errorMsg), false)
    }
  }

  /**
   * 获取上传中间件
   * @returns {Object} multer上传中间件
   */
  getUploadMiddleware() {
    return this.upload
  }

  /**
   * 验证文件是否存在且有效
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 文件是否有效
   */
  async validateFile(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return stats.isFile() && stats.size > 0
    } catch (error) {
      console.error('文件验证失败:', error)
      return false
    }
  }

  /**
   * 清理临时文件
   * @param {string} filePath - 文件路径
   */
  async cleanupTempFile(filePath) {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath)
        console.log(`已清理临时文件: ${filePath}`)
      }
    } catch (error) {
      console.error('清理临时文件失败:', error)
    }
  }
}

module.exports = FileUploadService
