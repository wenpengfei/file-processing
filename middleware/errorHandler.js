/**
 * 错误处理中间件
 * 统一处理各种错误情况
 */
class ErrorHandler {
  /**
   * 处理multer文件上传错误
   * @param {Error} error - 错误对象
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  static handleError(error, req, res, next) {
    console.error('服务器错误:', error)

    // 处理multer文件上传错误
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超出限制'
      })
    }

    // 处理文件格式错误
    if (error.message && error.message.includes('不支持的文件格式')) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }

    // 处理CORS错误
    if (error.message === '不允许的来源') {
      return res.status(403).json({
        success: false,
        message: 'CORS错误：不允许的来源',
        error: 'ORIGIN_NOT_ALLOWED'
      })
    }

    // 处理其他错误
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    })
  }
}

module.exports = ErrorHandler
