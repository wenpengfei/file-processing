const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const axios = require('axios')

/**
 * 文字位置查找API测试脚本
 * 用于验证API功能是否正常工作
 */

const API_BASE_URL = 'http://localhost:3020'

/**
 * 测试文字位置查找API
 * @param {string} filePath - 测试文件路径
 * @param {string} searchText - 要查找的文字
 * @param {Object} options - 查找选项
 */
async function testTextSearch(filePath, searchText, options = {}) {
  try {
    console.log(`🔍 开始测试文字位置查找API`)
    console.log(`📁 文件: ${filePath}`)
    console.log(`🔤 搜索文字: "${searchText}"`)
    console.log(`⚙️  选项:`, options)

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`)
      return
    }

    // 创建FormData
    const formData = new FormData()
    formData.append('file', fs.createReadStream(filePath))
    formData.append('searchText', searchText)

    // 添加可选参数
    if (options.caseSensitive !== undefined) {
      formData.append('caseSensitive', options.caseSensitive.toString())
    }
    if (options.fuzzyMatch !== undefined) {
      formData.append('fuzzyMatch', options.fuzzyMatch.toString())
    }
    if (options.tolerance !== undefined) {
      formData.append('tolerance', options.tolerance.toString())
    }
    if (options.maxResults !== undefined) {
      formData.append('maxResults', options.maxResults.toString())
    }

    // 发送请求
    const startTime = Date.now()
    const response = await axios.post(`${API_BASE_URL}/find-text-position`, formData, {
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

      console.log(`🔍 查找结果:`)
      console.log(`   - 搜索文字: "${result.data.searchText}"`)
      console.log(`   - 匹配数量: ${result.data.totalMatches}`)

      if (result.data.matches.length > 0) {
        console.log(`📋 匹配详情:`)
        result.data.matches.forEach((match, index) => {
          console.log(`   ${index + 1}. 第${match.page}页`)
          console.log(`      匹配类型: ${match.matchType}`)
          console.log(`      置信度: ${(match.confidence * 100).toFixed(1)}%`)
          console.log(`      位置: (${match.position.x}, ${match.position.y})`)
          console.log(`      上下文: ${match.context}`)
          console.log('')
        })
      } else {
        console.log(`❌ 未找到匹配的文字`)
      }
    } else {
      console.error(`❌ 查找失败: ${result.message}`)
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
  console.log('🚀 开始运行文字位置查找API测试\n')

  // 测试用例1: 精确匹配
  console.log('=== 测试用例1: 精确匹配 ===')
  await testTextSearch(
    './test-document.docx', // 需要准备测试文档
    '重要信息',
    {
      caseSensitive: false,
      fuzzyMatch: false,
      maxResults: 5
    }
  )
  console.log('')

  // 测试用例2: 模糊匹配
  console.log('=== 测试用例2: 模糊匹配 ===')
  await testTextSearch('./test-document.docx', '重要', {
    caseSensitive: false,
    fuzzyMatch: true,
    tolerance: 0.7,
    maxResults: 3
  })
  console.log('')

  // 测试用例3: 区分大小写
  console.log('=== 测试用例3: 区分大小写 ===')
  await testTextSearch('./test-document.docx', 'Important', {
    caseSensitive: true,
    fuzzyMatch: false,
    maxResults: 2
  })
  console.log('')

  // 测试用例4: 不存在的文字
  console.log('=== 测试用例4: 不存在的文字 ===')
  await testTextSearch('./test-document.docx', '不存在的文字内容', {
    caseSensitive: false,
    fuzzyMatch: false,
    maxResults: 1
  })
  console.log('')

  console.log('✅ 所有测试用例执行完成')
}

/**
 * 创建测试文档（如果不存在）
 */
function createTestDocument() {
  const testDocPath = './test-document.docx'

  if (!fs.existsSync(testDocPath)) {
    console.log('📝 创建测试文档...')

    // 这里可以创建一个简单的测试文档
    // 由于创建.docx文件比较复杂，这里只是提示
    console.log('⚠️  请手动创建一个测试文档 test-document.docx')
    console.log('   文档内容建议包含以下文字:')
    console.log('   - "重要信息"')
    console.log('   - "Important Information"')
    console.log('   - "关键数据"')
    console.log('   - "重要通知"')
    console.log('')
  }
}

// 主函数
async function main() {
  try {
    createTestDocument()

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
  testTextSearch,
  runTests
}
