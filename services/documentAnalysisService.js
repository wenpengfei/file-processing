const fs = require('fs-extra')
const path = require('path')
const { PDFDocument } = require('pdf-lib')
const mammoth = require('mammoth')
const AdmZip = require('adm-zip')
const pdf2html = require('pdf2html')
/**
 * 文档分析服务类
 * 负责分析文档中指定文字后面的内容是否为图片
 * 遵循SOLID原则，每个方法职责单一，异常处理完善
 */
class DocumentAnalysisService {
  constructor() {
    this.supportedFormats = ['.pdf', '.docx', '.doc']
  }

  /**
   * 验证文件格式是否支持
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否支持该格式
   */
  validateFileFormat(filePath) {
    const fileExtension = path.extname(filePath).toLowerCase()
    return this.supportedFormats.includes(fileExtension)
  }

  /**
   * 从PDF文档中提取文本和图片位置信息
   * @param {string} pdfPath - PDF文件路径
   * @returns {Promise<Object>} 包含文本和图片位置的信息
   */
  async extractPdfContent(pdfPath) {
    try {
      console.log('开始分析PDF文档内容')

      const pdfBytes = await fs.readFile(pdfPath)
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const pages = pdfDoc.getPages()

      const contentInfo = {
        textContent: [],
        imagePositions: [],
        pageCount: pages.length
      }

      // 使用pdf-lib提取基础信息
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()

        // 由于pdf-lib主要用于创建和修改PDF，这里提供模拟的文本内容
        // 在实际项目中，建议使用专门的PDF文本提取库如pdf-parse或pdf2pic
        const mockTextContent = `第${
          i + 1
        }页内容 - 这是一个示例文档页面，包含各种文本内容。在实际应用中，这里会包含从PDF中提取的真实文本内容。`

        contentInfo.textContent.push({
          page: i + 1,
          text: mockTextContent,
          position: { x: 50, y: height - 100, width: width - 100, height: height - 200 }
        })

        // 模拟图片位置信息
        if (i % 2 === 0) {
          // 偶数页添加图片
          contentInfo.imagePositions.push({
            page: i + 1,
            position: { x: width / 2, y: height / 2, width: 200, height: 150 },
            type: 'image',
            index: i
          })
        }
      }

      console.log(`PDF分析完成，共${pages.length}页`)
      return contentInfo
    } catch (error) {
      console.error('PDF内容提取失败:', error)
      throw new Error(`PDF内容提取失败: ${error.message}`)
    }
  }

  /**
   * 从Word文档中提取文本和图片位置信息
   * @param {string} docxPath - Word文档路径
   * @returns {Promise<Object>} 包含文本和图片位置的信息
   */
  async extractWordContent(docxPath) {
    try {
      console.log('开始分析Word文档内容')

      const contentInfo = {
        textContent: [],
        imagePositions: [],
        pageCount: 1
      }

      if (path.extname(docxPath).toLowerCase() === '.docx') {
        // 使用mammoth处理.docx文件
        try {
          const result = await mammoth.extractRawText({ path: docxPath })
          const extractedText = result.value

          console.log('extractedText', extractedText)

          // 将提取的文本按段落分割
          const paragraphs = extractedText.split('\n').filter((p) => p.trim().length > 0)

          paragraphs.forEach((paragraph, index) => {
            contentInfo.textContent.push({
              page: 1,
              text: paragraph.trim(),
              position: { x: 50, y: 100 + index * 30, width: 700, height: 25 }
            })
          })

          // 提取图片信息
          const zip = new AdmZip(docxPath)
          const zipEntries = zip.getEntries()

          let imageIndex = 0
          for (const entry of zipEntries) {
            if (entry.entryName.startsWith('word/media/')) {
              contentInfo.imagePositions.push({
                page: 1,
                position: { x: 100 + imageIndex * 250, y: 300, width: 200, height: 150 },
                type: 'image',
                index: imageIndex++,
                originalPath: entry.entryName
              })
            }
          }
        } catch (mammothError) {
          console.warn('mammoth提取失败，使用备用方法:', mammothError.message)
          // 备用方法：使用AdmZip直接解析
          const zip = new AdmZip(docxPath)
          const documentXml = zip.getEntry('word/document.xml')

          if (documentXml) {
            const xmlContent = documentXml.getData().toString('utf8')
            // 简单的XML文本提取（移除XML标签）
            const textContent = xmlContent
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()

            contentInfo.textContent.push({
              page: 1,
              text: textContent || 'Word文档内容',
              position: { x: 50, y: 100, width: 700, height: 600 }
            })
          }
        }
      } else {
        // 处理.doc文件（需要专门的库如antiword或catdoc）
        contentInfo.textContent.push({
          page: 1,
          text: 'Word文档内容 (.doc格式需要专门的解析库)',
          position: { x: 50, y: 100, width: 700, height: 600 }
        })
      }

      console.log(
        `Word文档分析完成，找到${contentInfo.textContent.length}段文本，${contentInfo.imagePositions.length}张图片`
      )
      return contentInfo
    } catch (error) {
      console.error('Word文档内容提取失败:', error)
      throw new Error(`Word文档内容提取失败: ${error.message}`)
    }
  }

  /**
   * 检测指定文字后面的内容是否为图片
   * @param {string} filePath - 文件路径
   * @param {string} targetText - 目标文字
   * @param {Object} options - 检测选项
   * @returns {Promise<Object>} 检测结果
   */
  async detectImageAfterText(filePath, targetText, options = {}) {
    try {
      console.log(`开始检测文字"${targetText}"后面的内容是否为图片`)

      // 验证文件格式
      if (!this.validateFileFormat(filePath)) {
        throw new Error(`不支持的文件格式: ${path.extname(filePath)}`)
      }

      // 验证文件存在
      if (!(await fs.pathExists(filePath))) {
        throw new Error('文件不存在')
      }

      // 根据文件类型提取内容
      const fileExtension = path.extname(filePath).toLowerCase()
      let contentInfo

      if (fileExtension === '.pdf') {
        contentInfo = await this.extractPdfContent(filePath)
      } else {
        contentInfo = await this.extractWordContent(filePath)
      }

      console.log('contentInfo', contentInfo)

      // 分析文本和图片的位置关系
      const analysisResult = this.analyzeTextImageRelationship(contentInfo, targetText, options)

      console.log('检测完成:', analysisResult)
      return {
        success: true,
        message: '检测完成',
        // data: analysisResult
        data: contentInfo
      }
    } catch (error) {
      console.error('检测失败:', error)
      throw new Error(`检测失败: ${error.message}`)
    }
  }

  /**
   * 提取匹配文字的上下文
   * @param {string} fullText - 完整文本
   * @param {string} searchText - 搜索文字
   * @param {number} contextLength - 上下文长度
   * @returns {string} 上下文文本
   */
  extractContext(fullText, searchText, contextLength) {
    const searchIndex = fullText.toLowerCase().indexOf(searchText.toLowerCase())
    if (searchIndex === -1) {
      return fullText.substring(0, Math.min(contextLength, fullText.length))
    }

    const startIndex = Math.max(0, searchIndex - contextLength / 2)
    const endIndex = Math.min(fullText.length, searchIndex + searchText.length + contextLength / 2)

    let context = fullText.substring(startIndex, endIndex)

    // 添加省略号表示截断
    if (startIndex > 0) {
      context = '...' + context
    }
    if (endIndex < fullText.length) {
      context = context + '...'
    }

    return context
  }

  /**
   * 检测指定文字的下一行是否是图片
   * @param {string} filePath - 文件路径
   * @param {string} targetText - 目标文字
   * @param {Object} options - 检测选项
   * @returns {Promise<Object>} 检测结果
   */
  async checkImageAfterText(filePath, targetText, options = {}) {
    try {
      console.log(`开始检测文字"${targetText}"的下一行是否是图片`)

      // 验证文件格式
      if (!this.validateFileFormat(filePath)) {
        throw new Error(`不支持的文件格式: ${path.extname(filePath)}`)
      }

      // 验证文件存在
      if (!(await fs.pathExists(filePath))) {
        throw new Error('文件不存在')
      }

      // 验证目标文字
      if (!targetText || typeof targetText !== 'string' || targetText.trim().length === 0) {
        throw new Error('请提供有效的目标文字')
      }

      const {
        searchRadius = 100, // 搜索半径（像素）
        tolerance = 0.8, // 文本匹配容差
        lineHeight = 20, // 行高（像素）
        fuzzyMatch = false // 是否启用模糊匹配
      } = options

      // 根据文件类型提取内容
      const fileExtension = path.extname(filePath).toLowerCase()
      let contentInfo

      if (fileExtension === '.pdf') {
        contentInfo = await this.extractPdfContent(filePath)
      } else {
        contentInfo = await this.extractWordContent(filePath)
      }

      // 分析文本和图片的位置关系
      const analysisResult = this.analyzeTextImageRelationship(contentInfo, targetText, {
        searchRadius,
        tolerance,
        lineHeight,
        fuzzyMatch
      })

      console.log('检测完成:', analysisResult)
      return {
        success: true,
        message: '图片检测完成',
        data: {
          targetText: targetText,
          hasImageAfter: analysisResult.hasImageAfter,
          imageDetails: analysisResult.imageDetails,
          textPosition: analysisResult.textPosition,
          confidence: analysisResult.confidence,
          documentInfo: {
            pageCount: contentInfo.pageCount,
            fileType: fileExtension,
            fileName: path.basename(filePath)
          }
        }
      }
    } catch (error) {
      console.error('图片检测失败:', error)
      throw new Error(`图片检测失败: ${error.message}`)
    }
  }

  /**
   * 分析文本和图片的位置关系（改进版）
   * @param {Object} contentInfo - 内容信息
   * @param {string} targetText - 目标文字
   * @param {Object} options - 检测选项
   * @returns {Object} 分析结果
   */
  analyzeTextImageRelationship(contentInfo, targetText, options) {
    const {
      searchRadius = 100, // 搜索半径（像素）
      tolerance = 0.8, // 文本匹配容差
      lineHeight = 20, // 行高（像素）
      fuzzyMatch = false // 是否启用模糊匹配
    } = options

    const results = {
      targetText: targetText,
      foundText: false,
      hasImageAfter: false,
      imageDetails: [],
      textPosition: null,
      confidence: 0,
      analysisMethod: 'position_based'
    }

    // 在文本内容中搜索目标文字
    for (const textItem of contentInfo.textContent) {
      const isMatch = fuzzyMatch
        ? this.isTextMatch(textItem.text, targetText, tolerance)
        : this.isTextMatch(textItem.text, targetText, 1.0) // 精确匹配

      if (isMatch) {
        results.foundText = true
        results.textPosition = textItem.position
        results.confidence = this.calculateTextConfidence(textItem.text, targetText)

        // 查找该文字后面的图片
        const nearbyImages = this.findImagesAfterText(
          contentInfo.imagePositions,
          textItem.position,
          searchRadius,
          lineHeight
        )

        if (nearbyImages.length > 0) {
          results.hasImageAfter = true
          results.imageDetails = nearbyImages.map((img) => ({
            position: img.position,
            type: img.type,
            index: img.index || 0,
            distance: this.calculateDistance(textItem.position, img.position),
            isBelowText: this.isImageBelowText(textItem.position, img.position, lineHeight),
            relativePosition: this.getRelativePosition(textItem.position, img.position)
          }))
        }

        break
      }
    }

    return results
  }

  /**
   * 查找文字后面的图片
   * @param {Array} imagePositions - 图片位置列表
   * @param {Object} textPosition - 文本位置
   * @param {number} searchRadius - 搜索半径
   * @param {number} lineHeight - 行高
   * @returns {Array} 附近的图片列表
   */
  findImagesAfterText(imagePositions, textPosition, searchRadius, lineHeight) {
    return imagePositions.filter((img) => {
      const distance = this.calculateDistance(textPosition, img.position)
      const isNearby = distance <= searchRadius
      const isBelow = this.isImageBelowText(textPosition, img.position, lineHeight)

      // 图片必须在文字附近且在文字下方
      return isNearby && isBelow
    })
  }

  /**
   * 判断图片是否在文字下方
   * @param {Object} textPosition - 文本位置
   * @param {Object} imagePosition - 图片位置
   * @param {number} lineHeight - 行高
   * @returns {boolean} 图片是否在文字下方
   */
  isImageBelowText(textPosition, imagePosition, lineHeight) {
    // 图片的Y坐标应该大于文字的Y坐标（考虑行高）
    const textBottom = textPosition.y + textPosition.height
    const imageTop = imagePosition.y

    // 图片顶部应该在文字底部下方，但不要太远
    const minDistance = lineHeight * 0.5 // 最小距离
    const maxDistance = lineHeight * 3 // 最大距离

    return imageTop >= textBottom + minDistance && imageTop <= textBottom + maxDistance
  }

  /**
   * 获取图片相对于文字的位置关系
   * @param {Object} textPosition - 文本位置
   * @param {Object} imagePosition - 图片位置
   * @returns {string} 位置关系描述
   */
  getRelativePosition(textPosition, imagePosition) {
    const textCenterX = textPosition.x + textPosition.width / 2
    const imageCenterX = imagePosition.x + imagePosition.width / 2

    let horizontalPosition = 'center'
    if (imageCenterX < textCenterX - 50) {
      horizontalPosition = 'left'
    } else if (imageCenterX > textCenterX + 50) {
      horizontalPosition = 'right'
    }

    return `图片位于文字${horizontalPosition}下方`
  }

  /**
   * 检查文本是否匹配目标文字
   * @param {string} text - 待检查文本
   * @param {string} targetText - 目标文字
   * @param {number} tolerance - 容差
   * @returns {boolean} 是否匹配
   */
  isTextMatch(text, targetText, tolerance) {
    if (!text || !targetText) return false

    const normalizedText = text.toLowerCase().trim()
    const normalizedTarget = targetText.toLowerCase().trim()

    // 完全匹配
    if (normalizedText.includes(normalizedTarget)) {
      return true
    }

    // 模糊匹配（简化版，实际可以使用更复杂的算法）
    const similarity = this.calculateSimilarity(normalizedText, normalizedTarget)
    return similarity >= tolerance
  }

  /**
   * 计算文本相似度（简化版）
   * @param {string} text1 - 文本1
   * @param {string} text2 - 文本2
   * @returns {number} 相似度 (0-1)
   */
  calculateSimilarity(text1, text2) {
    if (text1 === text2) return 1
    if (!text1 || !text2) return 0

    const words1 = text1.split(/\s+/)
    const words2 = text2.split(/\s+/)

    const commonWords = words1.filter((word) => words2.includes(word))
    const totalWords = Math.max(words1.length, words2.length)

    return totalWords > 0 ? commonWords.length / totalWords : 0
  }

  /**
   * 计算文本匹配置信度
   * @param {string} text - 文本
   * @param {string} targetText - 目标文字
   * @returns {number} 置信度 (0-1)
   */
  calculateTextConfidence(text, targetText) {
    return this.calculateSimilarity(text.toLowerCase(), targetText.toLowerCase())
  }

  /**
   * 查找附近的图片
   * @param {Array} imagePositions - 图片位置列表
   * @param {Object} textPosition - 文本位置
   * @param {number} searchRadius - 搜索半径
   * @returns {Array} 附近的图片列表
   */
  findNearbyImages(imagePositions, textPosition, searchRadius) {
    return imagePositions.filter((img) => {
      const distance = this.calculateDistance(textPosition, img.position)
      return distance <= searchRadius
    })
  }

  /**
   * 计算两个位置之间的距离
   * @param {Object} pos1 - 位置1
   * @param {Object} pos2 - 位置2
   * @returns {number} 距离
   */
  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 在文档中查找指定文字的位置
   * @param {string} filePath - 文件路径
   * @param {string} searchText - 要查找的文字
   * @param {Object} options - 查找选项
   * @returns {Promise<Object>} 查找结果
   */
  async findTextPosition(filePath, searchText, options = {}) {
    try {
      console.log(`开始查找文字"${searchText}"在文档中的位置`)

      // 验证文件格式
      if (!this.validateFileFormat(filePath)) {
        throw new Error(`不支持的文件格式: ${path.extname(filePath)}`)
      }

      // 验证文件存在
      if (!(await fs.pathExists(filePath))) {
        throw new Error('文件不存在')
      }

      // 验证搜索文字
      if (!searchText || typeof searchText !== 'string' || searchText.trim().length === 0) {
        throw new Error('请提供有效的搜索文字')
      }

      const {
        caseSensitive = false, // 是否区分大小写
        fuzzyMatch = false, // 是否启用模糊匹配
        tolerance = 0.8, // 模糊匹配容差
        maxResults = 10 // 最大返回结果数
      } = options

      // 根据文件类型提取内容
      const fileExtension = path.extname(filePath).toLowerCase()
      let contentInfo

      if (fileExtension === '.pdf') {
        contentInfo = await this.extractPdfContent(filePath)
      } else {
        contentInfo = await this.extractWordContent(filePath)
      }

      // 在文档中搜索文字
      const searchResults = this.searchTextInDocument(contentInfo, searchText, {
        caseSensitive,
        fuzzyMatch,
        tolerance,
        maxResults
      })

      console.log(`查找完成，找到 ${searchResults.length} 个匹配项`)
      return {
        success: true,
        message: '文字位置查找完成',
        data: {
          searchText: searchText,
          totalMatches: searchResults.length,
          matches: searchResults,
          documentInfo: {
            pageCount: contentInfo.pageCount,
            fileType: fileExtension,
            fileName: path.basename(filePath)
          }
        }
      }
    } catch (error) {
      console.error('文字位置查找失败:', error)
      throw new Error(`文字位置查找失败: ${error.message}`)
    }
  }

  /**
   * 在文档内容中搜索文字
   * @param {Object} contentInfo - 文档内容信息
   * @param {string} searchText - 搜索文字
   * @param {Object} options - 搜索选项
   * @returns {Array} 搜索结果列表
   */
  searchTextInDocument(contentInfo, searchText, options) {
    const { caseSensitive = false, fuzzyMatch = false, tolerance = 0.8, maxResults = 10 } = options

    const results = []
    const normalizedSearchText = caseSensitive ? searchText : searchText.toLowerCase()

    // 遍历所有文本内容
    for (const textItem of contentInfo.textContent) {
      const documentText = caseSensitive ? textItem.text : textItem.text.toLowerCase()

      if (fuzzyMatch) {
        // 模糊匹配
        const similarity = this.calculateSimilarity(documentText, normalizedSearchText)
        if (similarity >= tolerance) {
          results.push({
            page: textItem.page,
            position: textItem.position,
            matchedText: textItem.text,
            confidence: similarity,
            matchType: 'fuzzy',
            context: this.extractContext(textItem.text, searchText, 50)
          })
        }
      } else {
        // 精确匹配
        const matchIndex = documentText.indexOf(normalizedSearchText)
        if (matchIndex !== -1) {
          results.push({
            page: textItem.page,
            position: textItem.position,
            matchedText: textItem.text,
            confidence: 1.0,
            matchType: 'exact',
            matchIndex: matchIndex,
            context: this.extractContext(textItem.text, searchText, 50)
          })
        }
      }

      // 限制结果数量
      if (results.length >= maxResults) {
        break
      }
    }

    // 按置信度排序
    results.sort((a, b) => b.confidence - a.confidence)

    return results
  }

  /**
   * 提取文档内容（支持 Word/PDF 转换为文本）
   * @param {string} documentPath - 文档路径（支持 .doc、.docx 和 .pdf）
   * @param {Object} options - 转换选项
   * @returns {Promise<Object>} 提取结果
   */
  async extractDocumentContent(documentPath, options = {}) {
    try {
      console.log('开始提取文档内容')

      // 验证文件存在
      if (!(await fs.pathExists(documentPath))) {
        throw new Error('文件不存在')
      }

      // 验证文件格式
      const fileExtension = path.extname(documentPath).toLowerCase()
      if (!['.doc', '.docx', '.pdf'].includes(fileExtension)) {
        throw new Error(`不支持的文件格式: ${fileExtension}，只支持 .doc、.docx 和 .pdf 格式`)
      }

      const {
        includeImages = true, // 是否包含图片
        styleMap = null, // 自定义样式映射
        convertImage = null, // 图片转换函数
        ignoreEmptyParagraphs = false, // 是否忽略空段落
        idPrefix = 'doc-content', // HTML ID 前缀
        targetText = '' // 目标文字
      } = options

      let htmlContent,
        messages = [],
        warnings = [],
        errors = []

      // 根据文件类型选择不同的转换方法
      if (['.doc', '.docx'].includes(fileExtension)) {
        // 使用 mammoth 转换 Word 文档为 HTML
        const conversionOptions = {
          convertImage: includeImages ? convertImage : null,
          styleMap: styleMap,
          ignoreEmptyParagraphs: ignoreEmptyParagraphs,
          idPrefix: idPrefix
        }

        const result = await mammoth.convertToHtml({ path: documentPath }, conversionOptions)

        if (!result.value) {
          throw new Error('Word 文档转换失败，未获取到 HTML 内容')
        }

        htmlContent = result.value
        messages = result.messages || []
      } else if (fileExtension === '.pdf') {
        // 使用 pdf-parse 转换 PDF 为 HTML
        try {
          const pdfParse = require('pdf-parse')
          const pdfBuffer = await fs.readFile(documentPath)

          // 检查文件大小和内容
          if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('PDF文件为空或损坏')
          }

          console.log(`PDF文件大小: ${pdfBuffer.length} bytes`)

          const pdfData = await pdfParse(pdfBuffer)

          // 详细检查PDF解析结果
          console.log('PDF解析结果:', {
            textLength: pdfData.text ? pdfData.text.length : 0,
            pageCount: pdfData.numpages || 0,
            info: pdfData.info || {},
            metadata: pdfData.metadata || {}
          })

          // 检查提取的文本内容
          if (!pdfData.text || pdfData.text.trim().length === 0) {
            console.warn('PDF文本提取失败，可能原因：')
            console.warn('- PDF是扫描版图片，没有可提取的文本')
            console.warn('- PDF有密码保护')
            console.warn('- PDF文件损坏')
            console.warn('- PDF是纯图片格式')

            // 尝试使用OCR或其他方法
            htmlContent = this.handlePdfWithoutText(documentPath, options)
            messages = [
              {
                type: 'warning',
                message: 'PDF无法提取文本，可能需要OCR处理'
              }
            ]
          } else {
            // 将 PDF 文本转换为简单的 HTML
            htmlContent = this.convertPdfTextToHtml(pdfData.text, options)
            console.log(`PDF文本转换成功，HTML长度: ${htmlContent.length}`)
            messages = []
          }
        } catch (pdfError) {
          console.error('PDF 解析失败:', pdfError)
          console.warn('尝试使用基础方法:', pdfError.message)
          // 如果 pdf-parse 不可用，使用基础方法
          htmlContent = this.convertPdfToHtmlBasic(documentPath, options)
          messages = [{ type: 'warning', message: `PDF解析失败: ${pdfError.message}` }]
        }
      }

      // 检查是否有警告或错误（健壮性处理，兼容非标准消息结构）
      const normalizedMessages = Array.isArray(messages)
        ? messages
            .filter((msg) => msg != null)
            .map((msg) => {
              if (typeof msg === 'string') {
                return { type: 'info', message: msg }
              }
              if (typeof msg === 'object') {
                return {
                  type: msg.type || 'info',
                  message: typeof msg.message === 'string' && msg.message.length > 0 ? msg.message : JSON.stringify(msg)
                }
              }
              return { type: 'info', message: String(msg) }
            })
        : []

      warnings = normalizedMessages.filter((msg) => msg && msg.type === 'warning')
      errors = normalizedMessages.filter((msg) => msg && msg.type === 'error')

      if (errors.length > 0) {
        console.warn('转换过程中出现错误:', errors)
      }

      if (warnings.length > 0) {
        console.warn('转换过程中出现警告:', warnings)
      }

      // 生成完整的 HTML 文档
      // const fullHtmlDocument = this.generateCompleteHtmlDocument(htmlContent, {
      //   title: path.basename(documentPath, path.extname(documentPath)),
      //   includeStyles: true,
      //   responsive: true
      // })

      console.log('文档内容提取完成')

      return {
        success: true,
        message: '',
        data: {
          cleanedHtmlText: this.extractTextFromHtml(htmlContent),
          result: targetText.split(',').map((text) => {
            return this.isFollowedByImage(this.extractTextFromHtml(htmlContent), text) ? `` : `缺少${text}`
          }),
          targetText,
          originalFile: path.basename(documentPath)
        }
      }
    } catch (error) {
      console.error('文档内容提取失败:', error)
      throw new Error(`文档内容提取失败: ${error.message}`)
    }
  }

  /**
   * 生成完整的 HTML 文档
   * @param {string} content - HTML 内容
   * @param {Object} options - 选项
   * @returns {string} 完整的 HTML 文档
   */
  //   generateCompleteHtmlDocument(content, options = {}) {
  //     const { title = '转换的文档', includeStyles = true, responsive = true } = options

  //     const styles = includeStyles
  //       ? `
  //       <style>
  //         body {
  //           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  //           line-height: 1.6;
  //           color: #333;
  //           max-width: 800px;
  //           margin: 0 auto;
  //           padding: 20px;
  //           background-color: #f9f9f9;
  //         }

  //         .document-container {
  //           background: white;
  //           padding: 40px;
  //           border-radius: 8px;
  //           box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  //         }

  //         h1, h2, h3, h4, h5, h6 {
  //           color: #2c3e50;
  //           margin-top: 1.5em;
  //           margin-bottom: 0.5em;
  //         }

  //         h1 { font-size: 2em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
  //         h2 { font-size: 1.5em; border-bottom: 1px solid #ecf0f1; padding-bottom: 0.2em; }
  //         h3 { font-size: 1.3em; }

  //         p {
  //           margin-bottom: 1em;
  //           text-align: justify;
  //         }

  //         img {
  //           max-width: 100%;
  //           height: auto;
  //           border-radius: 4px;
  //           box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  //           margin: 1em 0;
  //         }

  //         table {
  //           border-collapse: collapse;
  //           width: 100%;
  //           margin: 1em 0;
  //         }

  //         table, th, td {
  //           border: 1px solid #ddd;
  //         }

  //         th, td {
  //           padding: 12px;
  //           text-align: left;
  //         }

  //         th {
  //           background-color: #f8f9fa;
  //           font-weight: 600;
  //         }

  //         ul, ol {
  //           margin-bottom: 1em;
  //           padding-left: 2em;
  //         }

  //         li {
  //           margin-bottom: 0.5em;
  //         }

  //         blockquote {
  //           border-left: 4px solid #3498db;
  //           margin: 1em 0;
  //           padding-left: 1em;
  //           font-style: italic;
  //           color: #555;
  //         }

  //         code {
  //           background-color: #f8f9fa;
  //           padding: 2px 4px;
  //           border-radius: 3px;
  //           font-family: 'Courier New', monospace;
  //           font-size: 0.9em;
  //         }

  //         pre {
  //           background-color: #f8f9fa;
  //           padding: 1em;
  //           border-radius: 4px;
  //           overflow-x: auto;
  //           border: 1px solid #e9ecef;
  //         }

  //         pre code {
  //           background: none;
  //           padding: 0;
  //         }

  //         ${
  //           responsive
  //             ? `
  //         @media (max-width: 768px) {
  //           body {
  //             padding: 10px;
  //           }

  //           .document-container {
  //             padding: 20px;
  //           }

  //           h1 { font-size: 1.5em; }
  //           h2 { font-size: 1.3em; }
  //           h3 { font-size: 1.1em; }
  //         }
  //         `
  //             : ''
  //         }
  //       </style>
  //     `
  //       : ''

  //     return `<!DOCTYPE html>
  // <html lang="zh-CN">
  // <head>
  //     <meta charset="UTF-8">
  //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //     <title>${title}</title>
  //     ${styles}
  // </head>
  // <body>
  //     <div class="document-container">
  //         ${content}
  //     </div>
  // </body>
  // </html>`
  //   }

  /**
   * 将PDF文本转换为HTML格式
   * @param {string} pdfText - PDF 提取的文本
   * @param {Object} options - 转换选项
   * @returns {string} HTML 内容
   */
  convertPdfTextToHtml(pdfText, options = {}) {
    const { idPrefix = 'doc-content' } = options

    // 边界情况检查
    if (!pdfText) {
      console.warn('PDF文本为空: pdfText is null/undefined')
      return '<p>PDF 文档为空或无法提取文本内容</p>'
    }

    if (typeof pdfText !== 'string') {
      console.warn(`PDF文本类型错误: expected string, got ${typeof pdfText}`)
      return '<p>PDF 文档格式错误，无法处理</p>'
    }

    if (pdfText.trim().length === 0) {
      console.warn('PDF文本为空字符串或只包含空白字符')
      return '<p>PDF 文档为空或无法提取文本内容</p>'
    }

    console.log(`开始转换PDF文本，长度: ${pdfText.length}`)

    try {
      // 将文本按行分割
      const lines = pdfText.split('\n').filter((line) => line.trim().length > 0)

      if (lines.length === 0) {
        console.warn('PDF文本分割后没有有效行')
        return '<p>PDF 文档内容为空或格式异常</p>'
      }

      console.log(`PDF文本分割后有效行数: ${lines.length}`)

      // 转换为 HTML
      const htmlLines = lines.map((line, index) => {
        const trimmedLine = line.trim()

        // 检测标题（简单规则）
        if (trimmedLine.length < 100 && (trimmedLine.endsWith('.') || trimmedLine.endsWith(':'))) {
          return `<h3 id="${idPrefix}-${index}">${this.escapeHtml(trimmedLine)}</h3>`
        }

        // 检测列表项
        if (trimmedLine.match(/^[\d\-•]+\.?\s/)) {
          return `<li>${this.escapeHtml(trimmedLine.replace(/^[\d\-•]+\.?\s/, ''))}</li>`
        }

        // 普通段落
        return `<p id="${idPrefix}-${index}">${this.escapeHtml(trimmedLine)}</p>`
      })

      const result = htmlLines.join('\n')
      console.log(`PDF文本转换完成，HTML长度: ${result.length}`)
      return result
    } catch (error) {
      console.error('PDF文本转换过程中出错:', error)
      return `<p>PDF 文本转换失败: ${this.escapeHtml(error.message)}</p>`
    }
  }

  /**
   * 基础 PDF 转换方法（当 pdf-parse 不可用时使用）
   * @param {string} pdfPath - PDF 文件路径
   * @param {Object} options - 转换选项
   * @returns {string} HTML 内容
   */
  convertPdfToHtmlBasic(pdfPath, options = {}) {
    const { idPrefix = 'doc-content' } = options
    const fileName = path.basename(pdfPath)

    return `
      <div id="${idPrefix}-container">
        <h2>PDF 文档转换</h2>
        <p>由于PDF解析失败，无法提取PDF内容。</p>
        <p>文件路径：${fileName}</p>
        <p>请检查PDF文件是否损坏或尝试其他PDF文件。</p>
      </div>
    `
  }

  /**
   * 处理无法提取文本的PDF文件
   * @param {string} pdfPath - PDF 文件路径
   * @param {Object} options - 处理选项
   * @returns {string} HTML 内容
   */
  handlePdfWithoutText(pdfPath, options = {}) {
    const { idPrefix = 'doc-content' } = options
    const fileName = path.basename(pdfPath)

    return `
      <div id="${idPrefix}-container">
        <h2>PDF 文档分析结果</h2>
        <div class="pdf-info">
          <h3>文件信息</h3>
          <p><strong>文件名：</strong>${fileName}</p>
          <p><strong>文件路径：</strong>${pdfPath}</p>
          <p><strong>状态：</strong><span class="warning">无法提取文本内容</span></p>
        </div>

        <div class="possible-reasons">
          <h3>可能的原因</h3>
          <ul>
            <li>PDF是扫描版图片，没有可提取的文本</li>
            <li>PDF有密码保护</li>
            <li>PDF文件损坏</li>
            <li>PDF是纯图片格式</li>
          </ul>
        </div>

        <div class="suggestions">
          <h3>建议解决方案</h3>
          <ul>
            <li>检查PDF是否为扫描版，如果是，建议使用OCR服务</li>
            <li>确认PDF没有密码保护</li>
            <li>尝试用其他PDF阅读器打开验证文件完整性</li>
            <li>如果包含图片，可以提取图片进行分析</li>
          </ul>
        </div>

        <div class="next-steps">
          <h3>下一步操作</h3>
          <p>由于无法提取文本内容，建议：</p>
          <ol>
            <li>使用OCR服务处理扫描版PDF</li>
            <li>手动检查PDF文件内容</li>
            <li>联系文档提供方获取可编辑版本</li>
          </ol>
        </div>
      </div>
    `
  }

  /**
   * 转义 HTML 特殊字符
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
  }

  /**
   * 清理HTML标签，提取纯文本内容
   * 将图片标签替换为[image]标记
   * @param {string} htmlContent - HTML字符串
   * @returns {string} 清理后的纯文本内容
   */
  extractTextFromHtml(htmlContent) {
    try {
      // 边界情况处理
      if (!htmlContent || typeof htmlContent !== 'string') {
        return ''
      }

      let processedContent = htmlContent.trim()

      // 如果内容为空，直接返回
      if (processedContent.length === 0) {
        return ''
      }

      // 处理图片标签 - 替换为[image]标记
      // 匹配所有可能的图片标签：img, image, picture等
      const imageTagPattern = /<img[^>]*>/gi
      processedContent = processedContent.replace(imageTagPattern, '[image]')

      // 处理其他可能的图片相关标签
      const otherImagePatterns = [
        /<image[^>]*>/gi,
        /<picture[^>]*>.*?<\/picture>/gi,
        /<figure[^>]*>.*?<\/figure>/gi,
        /<svg[^>]*>.*?<\/svg>/gi,
        /<canvas[^>]*>.*?<\/canvas>/gi
      ]

      otherImagePatterns.forEach((pattern) => {
        processedContent = processedContent.replace(pattern, '[image]')
      })

      // 移除所有剩余的HTML标签
      // 使用正则表达式匹配所有HTML标签
      const htmlTagPattern = /<[^>]*>/g
      processedContent = processedContent.replace(htmlTagPattern, '')

      // 处理HTML实体
      const htmlEntities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&nbsp;': ' ',
        '&copy;': '©',
        '&reg;': '®',
        '&trade;': '™',
        '&hellip;': '...',
        '&mdash;': '—',
        '&ndash;': '–',
        '&lsquo;': "'",
        '&rsquo;': "'",
        '&ldquo;': '"',
        '&rdquo;': '"'
      }

      // 替换HTML实体
      Object.entries(htmlEntities).forEach(([entity, replacement]) => {
        processedContent = processedContent.replace(new RegExp(entity, 'g'), replacement)
      })

      // 处理连续的空白字符
      processedContent = processedContent
        .replace(/\s+/g, ' ') // 将多个空白字符替换为单个空格
        .trim() // 移除首尾空白

      // 处理连续的[image]标记
      processedContent = processedContent.replace(/\[image\]\s*\[image\]/g, '[image]')

      return processedContent
    } catch (error) {
      console.error('HTML文本提取失败:', error)
      throw new Error(`HTML文本提取失败: ${error.message}`)
    }
  }

  isFollowedByImage(originalStr, givenStr) {
    // 使用 split 简化：parts = A givenStr B givenStr C ...
    // 若任意一次出现后紧跟 [image]，则对应的下一段 parts[i+1] 以 [image] 开头
    if (!originalStr || !givenStr) return false

    const parts = originalStr.split(givenStr)
    if (parts.length <= 1) return false

    for (let i = 0; i < parts.length - 1; i++) {
      const nextSegment = parts[i + 1]
      if (typeof nextSegment === 'string' && nextSegment.startsWith('[image]')) {
        return true
      }
    }

    return false
  }

  /**
   * 获取所有后面紧跟 [image] 的匹配位置
   * @param {string} originalStr - 原始字符串
   * @param {string} givenStr - 要查找的字符串
   * @returns {Array<{startIndex:number,endIndex:number}>} 紧跟图片的匹配区间
   */
  // getOccurrencesFollowedByImage(originalStr, givenStr) {
  //   const matches = []
  //   if (!originalStr || !givenStr) return matches

  //   let searchStartIndex = 0
  //   let currentIndex = -1

  //   while ((currentIndex = originalStr.indexOf(givenStr, searchStartIndex)) !== -1) {
  //     const endPos = currentIndex + givenStr.length
  //     if (originalStr.substring(endPos, endPos + 7) === '[image]') {
  //       matches.push({ startIndex: currentIndex, endIndex: endPos })
  //     }
  //     searchStartIndex = currentIndex + givenStr.length
  //   }

  //   return matches
  // }

  /**
   * 判断所有出现的 givenStr 是否都紧跟 [image]
   * @param {string} originalStr - 原始字符串
   * @param {string} givenStr - 要查找的字符串
   * @returns {boolean} 若至少有一次出现且每次出现后都紧跟 [image] 则返回 true
   */
  // areAllOccurrencesFollowedByImage(originalStr, givenStr) {
  //   if (!originalStr || !givenStr) return false

  //   let searchStartIndex = 0
  //   let currentIndex = -1
  //   let foundAny = false

  //   while ((currentIndex = originalStr.indexOf(givenStr, searchStartIndex)) !== -1) {
  //     foundAny = true
  //     const endPos = currentIndex + givenStr.length
  //     if (originalStr.substring(endPos, endPos + 7) !== '[image]') {
  //       return false
  //     }
  //     searchStartIndex = currentIndex + givenStr.length
  //   }

  //   return foundAny
  // }
}

module.exports = DocumentAnalysisService
