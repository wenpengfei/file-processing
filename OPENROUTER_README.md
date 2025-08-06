# OpenRouter AI 功能

## 环境配置

1. 获取OpenRouter API密钥
2. 设置环境变量：
```bash
OPENROUTER_API_KEY=your_api_key
OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
```

## API接口

### AI对话
POST /ai/chat
```json
{
  "message": "你好",
  "model": "anthropic/claude-3.5-sonnet"
}
```

### 文件分析
POST /ai/analyze-file
```json
{
  "fileName": "test.txt",
  "fileContent": "文件内容"
}
```

### 文件上传分析
POST /ai/upload-analyze
```
Content-Type: multipart/form-data
file: 文件
message: 分析提示（可选）
```

### 服务状态
GET /ai/status

## 测试页面
访问 http://localhost:3020/ai-test.html 