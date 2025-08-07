const fs = require('fs-extra')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const { PDFDocument } = require('pdf-lib')
const mammoth = require('mammoth')
const AdmZip = require('adm-zip')

/**
 * 图片提取服务类
 * 负责从PDF和Word文档中提取图片
 */
class ImageExtractionService {
  constructor() {
    // 移除本地存储目录，改为返回base64
    this.imagesDir = path.join(__dirname, '..', 'extracted_images')
    this.ensureImagesDirectory()
  }

  /**
   * 确保图片目录存在（用于临时存储，如果需要的话）
   */
  ensureImagesDirectory() {
    fs.ensureDirSync(this.imagesDir)
  }

  /**
   * 将Buffer转换为base64字符串
   * @param {Buffer} buffer - 图片数据
   * @param {string} format - 图片格式
   * @returns {string} base64编码的图片
   */
  bufferToBase64(buffer, format) {
    const base64 = buffer.toString('base64')
    const mimeType = this.getMimeType(format)
    return `data:${mimeType};base64,${base64}`
  }

  /**
   * 根据文件扩展名获取MIME类型
   * @param {string} format - 文件格式
   * @returns {string} MIME类型
   */
  getMimeType(format) {
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      tiff: 'image/tiff',
      svg: 'image/svg+xml'
    }
    return mimeTypes[format.toLowerCase()] || 'image/jpeg'
  }

  /**
   * 提取PDF中的图片
   * @param {string} pdfPath - PDF文件路径
   * @param {string} originalFileName - 原始文件名
   * @returns {Promise<Array>} 图片信息列表
   */
  async extractImagesFromPdf(pdfPath, originalFileName) {
    try {
      const pdfBytes = await fs.readFile(pdfPath)
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const pages = pdfDoc.getPages()

      const imagesList = []

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()

        // 注意：pdf-lib主要用于创建和修改PDF，不直接支持图片提取
        // 这里提供一个基础实现，实际项目中可能需要使用其他专门的库
        const pageInfo = {
          description: `PDF文档第${i + 1}页`,
          imageUrl: '',
          format: 'PDF_PAGE',
          filePath: pdfPath,
          originalFileName: originalFileName,
          pageInfo: {
            pageNumber: i + 1,
            width: width,
            height: height
          },
          note: 'PDF页面信息，实际图片提取需要专门的PDF图片提取库'
        }

        imagesList.push(pageInfo)
      }

      return imagesList
    } catch (error) {
      console.error('提取PDF图片时出错:', error)
      throw new Error(`PDF处理失败: ${error.message}`)
    }
  }

  /**
   * 提取Word文档中的图片
   * @param {string} docxPath - Word文档路径
   * @param {string} originalFileName - 原始文件名
   * @returns {Promise<Array>} 图片信息列表
   */
  async extractImagesFromWord(docxPath, originalFileName) {
    try {
      const imagesList = []

      // 处理.docx文件（ZIP格式）
      if (path.extname(docxPath).toLowerCase() === '.docx') {
        const zip = new AdmZip(docxPath)
        const zipEntries = zip.getEntries()

        let imageIndex = 0

        for (const entry of zipEntries) {
          if (entry.entryName.startsWith('word/media/')) {
            const imageBuffer = entry.getData()
            const imageFormat = path.extname(entry.entryName).substring(1).toUpperCase()

            // 转换为base64而不是保存到本地
            const base64Data = this.bufferToBase64(imageBuffer, imageFormat)

            const imageInfo = {
              description: `Word文档图片${imageIndex + 1}`,
              imageUrl: base64Data, // 直接返回base64数据
              format: imageFormat,
              size: imageBuffer.length,
              originalPath: entry.entryName,
              originalFileName: originalFileName
            }

            imagesList.push(imageInfo)
            imageIndex++
          }
        }
      } else {
        // 处理.doc文件（二进制格式）
        // 注意：.doc文件格式较复杂，这里提供基础信息
        const imageInfo = {
          description: 'Word文档图片',
          imageUrl: '',
          format: 'DOC',
          filePath: docxPath,
          originalFileName: originalFileName,
          note: '.doc文件格式复杂，需要专门的库处理'
        }

        imagesList.push(imageInfo)
      }

      return imagesList
    } catch (error) {
      console.error('提取Word图片时出错:', error)
      throw new Error(`Word文档处理失败: ${error.message}`)
    }
  }

  /**
   * 根据文件类型提取图片
   * @param {string} filePath - 文件路径
   * @param {string} originalFileName - 原始文件名
   * @returns {Promise<Array>} 图片信息列表
   */
  async extractImagesFromFile(filePath, originalFileName) {
    const fileExtension = path.extname(filePath).toLowerCase()

    switch (fileExtension) {
      case '.pdf':
        return await this.extractImagesFromPdf(filePath, originalFileName)
      case '.docx':
      case '.doc':
        return await this.extractImagesFromWord(filePath, originalFileName)
      default:
        throw new Error(`不支持的文件格式: ${fileExtension}`)
    }
  }

  /**
   * 获取所有提取的图片列表（保留此方法以兼容现有代码，但返回空数组）
   * @returns {Promise<Array>} 图片信息列表
   */
  async getAllImages() {
    try {
      // 由于现在图片不再保存到本地，返回空数组
      console.log('图片现在以base64格式返回，不再保存到本地文件')
      return []
    } catch (error) {
      console.error('获取图片列表失败:', error)
      throw new Error(`获取图片列表失败: ${error.message}`)
    }
  }
}

module.exports = ImageExtractionService
