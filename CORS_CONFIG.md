# CORS 配置说明

## 功能特性

✅ **已添加的CORS支持**：
- 自动处理预检请求（OPTIONS）
- 支持凭证携带（credentials）
- 环境感知的域名控制
- 静态文件服务支持

## 环境配置

### 开发环境
```bash
NODE_ENV=development
```
- 允许所有来源访问
- 适合本地开发和测试

### 生产环境
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```
- 只允许指定域名访问
- 提高安全性

## 支持的请求头

- `Content-Type`
- `Authorization` 
- `X-Requested-With`

## 支持的HTTP方法

- GET
- POST
- PUT
- DELETE
- OPTIONS

## 使用示例

### 前端调用示例
```javascript
// 上传文件
const formData = new FormData()
formData.append('file', file)

fetch('http://localhost:3020/extract-images', {
  method: 'POST',
  body: formData,
  credentials: 'include'
})

// 获取图片列表
fetch('http://localhost:3020/images', {
  credentials: 'include'
})
```

## 错误处理

- `403` - 不允许的来源
- `500` - 服务器内部错误

## 安全建议

1. **生产环境**：设置具体的 `ALLOWED_ORIGINS`
2. **HTTPS**：生产环境使用HTTPS
3. **域名限制**：避免使用通配符 `*`
4. **定期审查**：定期检查允许的域名列表 