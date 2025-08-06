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
    this.imagesDir = path.join(__dirname, '..', 'extracted_images')
    this.ensureImagesDirectory()
  }

  /**
   * 确保图片目录存在
   */
  ensureImagesDirectory() {
    fs.ensureDirSync(this.imagesDir)
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
          图片描述: `PDF文档第${i + 1}页`,
          图片地址: '',
          图片格式: 'PDF_PAGE',
          图片路径: pdfPath,
          原始文件名: originalFileName,
          页面信息: {
            页码: i + 1,
            宽度: width,
            高度: height
          }
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

            // 保存图片到本地
            const imageFileName = `${uuidv4()}.${imageFormat.toLowerCase()}`
            const imagePath = path.join(this.imagesDir, imageFileName)

            await fs.writeFile(imagePath, imageBuffer)

            const imageInfo = {
              图片描述: `Word文档图片${imageIndex + 1}`,
              图片地址: `/extracted_images/${imageFileName}`,
              图片格式: imageFormat,
              图片路径: imagePath,
              原始路径: entry.entryName,
              原始文件名: originalFileName
            }

            imagesList.push(imageInfo)
            imageIndex++
          }
        }
      } else {
        // 处理.doc文件（二进制格式）
        // 注意：.doc文件格式较复杂，这里提供基础信息
        const imageInfo = {
          图片描述: 'Word文档图片',
          图片地址: '',
          图片格式: 'DOC',
          图片路径: docxPath,
          原始文件名: originalFileName,
          备注: '.doc文件格式复杂，需要专门的库处理'
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
   * 获取所有提取的图片列表
   * @returns {Promise<Array>} 图片信息列表
   */
  async getAllImages() {
    try {
      const imageFiles = await fs.readdir(this.imagesDir)
      const imagesList = []

      for (const fileName of imageFiles) {
        const filePath = path.join(this.imagesDir, fileName)
        const stats = await fs.stat(filePath)

        imagesList.push({
          图片描述: fileName,
          图片地址: `/extracted_images/${fileName}`,
          图片格式: path.extname(fileName).substring(1).toUpperCase(),
          图片路径: filePath,
          文件大小: stats.size,
          创建时间: stats.birthtime
        })
      }

      return imagesList
    } catch (error) {
      console.error('获取图片列表失败:', error)
      throw new Error(`获取图片列表失败: ${error.message}`)
    }
  }
}

module.exports = ImageExtractionService
