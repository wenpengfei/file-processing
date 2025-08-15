const { v4: uuidv4 } = require('uuid')
const FileUploadService = require('../services/fileUploadService')
const ImageExtractionService = require('../services/imageExtractionService')
const OCRService = require('../services/ocrService')
const DocumentAnalysisService = require('../services/documentAnalysisService')

/**
 * 文件控制器类
 * 负责处理文件上传和图片提取的业务逻辑
 */
class FileController {
  constructor() {
    this.fileUploadService = new FileUploadService()
    this.imageExtractionService = new ImageExtractionService()
    this.ocrService = new OCRService()
    this.documentAnalysisService = new DocumentAnalysisService()
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

      console.log('imagesList', imagesList)

      // 过滤出真正的图片文件
      const actualImages = imagesList.filter((image) => {
        // 检查是否有有效的imageUrl（base64数据）
        return image.imageUrl && image.imageUrl.startsWith('data:image/') && image.imageUrl.length > 100 // 确保有足够的base64数据
      })

      console.log(`过滤后，共有 ${actualImages.length} 张真实图片需要进行OCR`)

      // 将图片按10个一组进行分组
      const batchSize = 10
      const imagesBase64 = actualImages.map((image) =>
        image.imageUrl.replace('data:image/png;base64,', '').replace('data:image/jpeg;base64,', '')
      )

      function chunkArray(arr, size) {
        if (!Array.isArray(arr) || size <= 0) {
          return []
        }
        const result = []
        for (let i = 0; i < arr.length; i += size) {
          result.push(arr.slice(i, i + size))
        }
        return result
      }

      const promises = chunkArray(imagesBase64, 4)
        .slice(0, 2)
        .map((item) => {
          return this.ocrService.recognizeTextFromBase64(item)
        })

      const promisesResult = await Promise.all(promises)
      console.log('promisesResult', promisesResult)
      // responseData.data.ocrResult = promisesResult
      responseData.data = [
        [
          {
            data: [
              {
                confidence: '0.9703987',
                key: 'expired_date',
                text: '2024-02-03',
                text_region: [
                  [55, 349],
                  [601, 354],
                  [601, 381],
                  [55, 376]
                ]
              }
            ],
            has_seal: 0,
            image_path: '',
            label: ['2', '估价师证', '0.7750943', false],
            original_image_path: ''
          },
          {
            data: [
              {
                confidence: '0.9703987',
                key: 'name',
                text: '张三',
                text_region: [
                  [11, 22],
                  [22, 33],
                  [33, 44],
                  [44, 55]
                ]
              }
            ],
            has_seal: 0,
            image_path: '',
            label: ['2', '估价师证', '0.7750943', false],
            original_image_path: ''
          }
        ]
      ]

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

  /**
   * 检测文档中指定文字后面的内容是否为图片
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async detectImageAfterText(req, res) {
    try {
      console.log('收到文档图片检测请求')
      console.log('请求体:', req.body)

      // 验证请求参数
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文档文件'
        })
      }

      const { targetText, searchRadius, tolerance, lineHeight, fuzzyMatch } = req.body

      if (!targetText || typeof targetText !== 'string') {
        await this.fileUploadService.cleanupTempFile(req.file.path)
        return res.status(400).json({
          success: false,
          message: '请提供有效的目标文字'
        })
      }

      const uploadedFilePath = req.file.path
      console.log(`开始检测文档: ${req.file.originalname}, 目标文字: "${targetText}"`)

      // 检测选项
      const options = {
        searchRadius: searchRadius ? parseInt(searchRadius) : 100,
        tolerance: tolerance ? parseFloat(tolerance) : 0.8,
        lineHeight: lineHeight ? parseInt(lineHeight) : 20,
        fuzzyMatch: fuzzyMatch === 'true' || fuzzyMatch === true
      }

      // 执行检测
      const detectionResult = await this.documentAnalysisService.checkImageAfterText(
        uploadedFilePath,
        targetText,
        options
      )

      // 清理上传的临时文件
      await this.fileUploadService.cleanupTempFile(uploadedFilePath)

      console.log('检测完成，返回结果:', detectionResult)
      res.json(detectionResult)
    } catch (error) {
      console.error('文档图片检测失败:', error)

      // 清理上传的文件（如果存在）
      if (req.file) {
        await this.fileUploadService.cleanupTempFile(req.file.path)
      }

      res.status(500).json({
        success: false,
        message: `检测失败: ${error.message}`
      })
    }
  }

  /**
   * 在文档中查找指定文字的位置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async findTextPosition(req, res) {
    try {
      console.log('收到文字位置查找请求')
      console.log('请求体:', req.body)

      // 验证请求参数
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文档文件'
        })
      }

      const { searchText, caseSensitive = false, fuzzyMatch = false, tolerance = 0.8, maxResults = 10 } = req.body

      if (!searchText || typeof searchText !== 'string' || searchText.trim().length === 0) {
        await this.fileUploadService.cleanupTempFile(req.file.path)
        return res.status(400).json({
          success: false,
          message: '请提供有效的搜索文字'
        })
      }

      const uploadedFilePath = req.file.path
      console.log(`开始查找文字位置: ${req.file.originalname}, 搜索文字: "${searchText}"`)

      // 查找选项
      const options = {
        caseSensitive: caseSensitive === 'true' || caseSensitive === true,
        fuzzyMatch: fuzzyMatch === 'true' || fuzzyMatch === true,
        tolerance: tolerance ? parseFloat(tolerance) : 0.8,
        maxResults: maxResults ? parseInt(maxResults) : 10
      }

      // 执行文字位置查找
      const searchResult = await this.documentAnalysisService.findTextPosition(uploadedFilePath, searchText, options)

      // 清理上传的临时文件
      await this.fileUploadService.cleanupTempFile(uploadedFilePath)

      console.log('文字位置查找完成，返回结果:', searchResult)
      res.json(searchResult)
    } catch (error) {
      console.error('文字位置查找失败:', error)

      // 清理上传的文件（如果存在）
      if (req.file) {
        await this.fileUploadService.cleanupTempFile(req.file.path)
      }

      res.status(500).json({
        success: false,
        message: `查找失败: ${error.message}`
      })
    }
  }

  /**
   * 提取文档内容（支持 Word/PDF 转换为文本）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async handleDocumentContentExtraction(req, res) {
    try {
      console.log('收到文档内容提取请求')
      console.log('请求体:', req.query)

      // 验证请求参数
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传文档文件'
        })
      }

      const uploadedFilePath = req.file.path
      const originalFileName = req.file.originalname
      const fileExtension = originalFileName.toLowerCase().split('.').pop()

      // 验证文件格式
      if (!['doc', 'docx', 'pdf'].includes(fileExtension)) {
        await this.fileUploadService.cleanupTempFile(uploadedFilePath)
        return res.status(400).json({
          success: false,
          message: '只支持 .doc、.docx 和 .pdf 格式的文件'
        })
      }

      console.log(`开始提取文档内容: ${originalFileName}`)

      // 转换选项
      const {
        includeImages = true,
        ignoreEmptyParagraphs = false,
        idPrefix = 'doc-content',
        includeStyles = true,
        responsive = true
      } = req.body

      const options = {
        includeImages: includeImages === 'true' || includeImages === true,
        ignoreEmptyParagraphs: ignoreEmptyParagraphs === 'true' || ignoreEmptyParagraphs === true,
        idPrefix: idPrefix || 'doc-content',
        targetText: req.query.targetText || ''
      }

      // 执行文档内容提取
      const conversionResult = await this.documentAnalysisService.extractDocumentContent(uploadedFilePath, options)

      // 清理上传的临时文件
      await this.fileUploadService.cleanupTempFile(uploadedFilePath)

      console.log('文档内容提取完成，返回结果')
      res.json(conversionResult)
    } catch (error) {
      console.error('文档内容提取失败:', error)

      // 清理上传的文件（如果存在）
      if (req.file) {
        await this.fileUploadService.cleanupTempFile(req.file.path)
      }

      res.status(500).json({
        success: false,
        message: `提取失败: ${error.message}`
      })
    }
  }
}

module.exports = FileController
