/**
 * CORS服务类
 * 负责处理跨域资源共享配置
 */
class CorsService {
  /**
   * 获取CORS配置选项
   * @returns {Object} CORS配置对象
   */
  static getCorsOptions() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000']

    return {
      origin: function (origin, callback) {
        // 开发环境允许所有来源
        if (process.env.NODE_ENV === 'development') {
          return callback(null, true)
        }

        // 生产环境检查允许的域名
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('不允许的来源'))
        }
      },
      credentials: true, // 允许携带凭证
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Length', 'X-Requested-With']
    }
  }

  /**
   * 获取CORS状态信息
   * @returns {string} CORS状态描述
   */
  static getCorsStatus() {
    return process.env.NODE_ENV === 'development' ? '开发模式（允许所有来源）' : '生产模式（限制来源）'
  }
}

module.exports = CorsService
