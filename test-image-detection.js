const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const axios = require('axios')

/**
 * 图片检测API测试脚本
 * 用于验证图片检测功能是否正常工作
 */

const API_BASE_URL = 'http://localhost:3020'

/**
 * 测试图片检测API
 * @param {string} filePath - 测试文件路径
 * @param {string} targetText - 目标文字
 * @param {Object} options - 检测选项
 */
async function testImageDetection(filePath, targetText, options = {}) {
  try {
    console.log(`🔍 开始测试图片检测API`)
    console.log(`📁 文件: ${filePath}`)
    console.log(`🔤 目标文字: "${targetText}"`)
    console.log(`⚙️  选项:`, options)

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`)
      return
    }

    // 创建FormData
    const formData = new FormData()
    formData.append('file', fs.createReadStream(filePath))
    formData.append('targetText', targetText)

    // 添加可选参数
    if (options.searchRadius !== undefined) {
      formData.append('searchRadius', options.searchRadius.toString())
    }
    if (options.lineHeight !== undefined) {
      formData.append('lineHeight', options.lineHeight.toString())
    }
    if (options.tolerance !== undefined) {
      formData.append('tolerance', options.tolerance.toString())
    }
    if (options.fuzzyMatch !== undefined) {
      formData.append('fuzzyMatch', options.fuzzyMatch.toString())
    }

    // 发送请求
    const startTime = Date.now()
    const response = await axios.post(`${API_BASE_URL}/detect-image-after-text`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30秒超时
    })
    const endTime = Date.now()

    console.log(`✅ 请求成功 (耗时: ${endTime - startTime}ms)`)
    console.log(`📊 响应状态: ${response.status}`)

    const result = response.data

    if (result.success) {
      console.log(`📄 文档信息:`)
      console.log(`   - 文件名: ${result.data.documentInfo.fileName}`)
      console.log(`   - 文件类型: ${result.data.documentInfo.fileType}`)
      console.log(`   - 页数: ${result.data.documentInfo.pageCount}`)

      console.log(`🔍 检测结果:`)
      console.log(`   - 目标文字: "${result.data.targetText}"`)
      console.log(`   - 文字匹配置信度: ${(result.data.confidence * 100).toFixed(1)}%`)
      console.log(`   - 是否检测到图片: ${result.data.hasImageAfter ? '是' : '否'}`)

      if (result.data.hasImageAfter && result.data.imageDetails.length > 0) {
        console.log(`🖼️  图片详情:`)
        result.data.imageDetails.forEach((image, index) => {
          console.log(`   ${index + 1}. 图片 ${index + 1}`)
          console.log(`      位置: (${image.position.x}, ${image.position.y})`)
          console.log(`      尺寸: ${image.position.width} × ${image.position.height}`)
          console.log(`      距离文字: ${image.distance.toFixed(1)} 像素`)
          console.log(`      相对位置: ${image.relativePosition}`)
          console.log(`      是否在文字下方: ${image.isBelowText ? '是' : '否'}`)
          console.log('')
        })
      } else {
        console.log(`❌ 未检测到图片`)
        console.log(`   可能的原因:`)
        console.log(`   - 文字下方确实没有图片`)
        console.log(`   - 图片距离文字太远`)
        console.log(`   - 图片位置不在文字正下方`)
        console.log(`   - 需要调整检测参数`)
      }

      if (result.data.textPosition) {
        console.log(`📝 文字位置信息:`)
        console.log(`   - 位置: (${result.data.textPosition.x}, ${result.data.textPosition.y})`)
        console.log(`   - 尺寸: ${result.data.textPosition.width} × ${result.data.textPosition.height}`)
      }
    } else {
      console.error(`❌ 检测失败: ${result.message}`)
    }

    return result
  } catch (error) {
    console.error(`❌ 测试失败:`)
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`)
      console.error(`   错误信息: ${error.response.data?.message || error.message}`)
    } else {
      console.error(`   错误信息: ${error.message}`)
    }
    return null
  }
}

/**
 * 运行测试用例
 */
async function runTests() {
  console.log('🚀 开始运行图片检测API测试\n')

  // 测试用例1: 检测有图片的情况
  console.log('=== 测试用例1: 检测有图片的情况 ===')
  await testImageDetection('./test-document-with-images.docx', '重要信息', {
    searchRadius: 100,
    lineHeight: 20,
    tolerance: 0.8,
    fuzzyMatch: false
  })
  console.log('')

  // 测试用例2: 检测无图片的情况
  console.log('=== 测试用例2: 检测无图片的情况 ===')
  await testImageDetection('./test-document-text-only.docx', '普通文字', {
    searchRadius: 100,
    lineHeight: 20,
    tolerance: 0.8,
    fuzzyMatch: false
  })
  console.log('')

  // 测试用例3: 模糊匹配
  console.log('=== 测试用例3: 模糊匹配 ===')
  await testImageDetection('./test-document-with-images.docx', '重要', {
    searchRadius: 150,
    lineHeight: 25,
    tolerance: 0.7,
    fuzzyMatch: true
  })
  console.log('')

  // 测试用例4: 大搜索半径
  console.log('=== 测试用例4: 大搜索半径 ===')
  await testImageDetection('./test-document-with-images.docx', '重要信息', {
    searchRadius: 300,
    lineHeight: 30,
    tolerance: 0.8,
    fuzzyMatch: false
  })
  console.log('')

  console.log('✅ 所有测试用例执行完成')
}

/**
 * 创建测试文档说明
 */
function createTestDocumentGuide() {
  console.log('📝 测试文档准备指南:')
  console.log('')
  console.log('1. 创建包含图片的测试文档 (test-document-with-images.docx):')
  console.log('   - 添加文字: "重要信息"')
  console.log('   - 在文字下方插入图片')
  console.log('   - 保存为 .docx 格式')
  console.log('')
  console.log('2. 创建纯文本测试文档 (test-document-text-only.docx):')
  console.log('   - 添加文字: "普通文字"')
  console.log('   - 不包含任何图片')
  console.log('   - 保存为 .docx 格式')
  console.log('')
  console.log('3. 或者使用现有的PDF文档进行测试')
  console.log('')
}

// 主函数
async function main() {
  try {
    createTestDocumentGuide()

    // 检查服务器是否运行
    try {
      await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 })
      console.log('✅ 服务器运行正常')
    } catch (error) {
      console.error('❌ 服务器未运行，请先启动服务器: npm start')
      return
    }

    await runTests()
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

module.exports = {
  testImageDetection,
  runTests
}
