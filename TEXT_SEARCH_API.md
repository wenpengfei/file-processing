# 文字位置查找 API 文档

## 概述

文字位置查找 API 允许用户在文档中查找指定文字的位置信息，支持 PDF、DOCX 和 DOC 格式的文档。

## API 端点

### POST /find-text-position

在文档中查找指定文字的位置。

#### 请求参数

**Content-Type:** `multipart/form-data`

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 要搜索的文档文件 (PDF, DOCX, DOC) |
| searchText | string | 是 | 要查找的文字 |
| caseSensitive | boolean | 否 | 是否区分大小写，默认 false |
| fuzzyMatch | boolean | 否 | 是否启用模糊匹配，默认 false |
| tolerance | number | 否 | 模糊匹配容差 (0.1-1.0)，默认 0.8 |
| maxResults | number | 否 | 最大返回结果数 (1-50)，默认 10 |

#### 请求示例

```bash
curl -X POST http://localhost:3020/find-text-position \
  -F "file=@document.pdf" \
  -F "searchText=重要信息" \
  -F "caseSensitive=false" \
  -F "fuzzyMatch=false" \
  -F "tolerance=0.8" \
  -F "maxResults=10"
```

#### 响应格式

**成功响应 (200):**

```json
{
  "success": true,
  "message": "文字位置查找完成",
  "data": {
    "searchText": "重要信息",
    "totalMatches": 2,
    "matches": [
      {
        "page": 1,
        "position": {
          "x": 100,
          "y": 200,
          "width": 800,
          "height": 600
        },
        "matchedText": "这是一段包含重要信息的文本内容",
        "confidence": 1.0,
        "matchType": "exact",
        "matchIndex": 8,
        "context": "...这是一段包含重要信息的文本内容..."
      },
      {
        "page": 3,
        "position": {
          "x": 150,
          "y": 300,
          "width": 800,
          "height": 600
        },
        "matchedText": "另一个重要信息的位置",
        "confidence": 0.9,
        "matchType": "fuzzy",
        "context": "...另一个重要信息的位置..."
      }
    ],
    "documentInfo": {
      "pageCount": 5,
      "fileType": ".pdf",
      "fileName": "document.pdf"
    }
  }
}
```

**错误响应 (400/500):**

```json
{
  "success": false,
  "message": "错误描述"
}
```

#### 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 请求是否成功 |
| message | string | 响应消息 |
| data.searchText | string | 搜索的文字 |
| data.totalMatches | number | 找到的匹配总数 |
| data.matches | array | 匹配结果列表 |
| data.matches[].page | number | 匹配文字所在的页码 |
| data.matches[].position | object | 文字在页面中的位置信息 |
| data.matches[].matchedText | string | 匹配到的完整文本 |
| data.matches[].confidence | number | 匹配置信度 (0-1) |
| data.matches[].matchType | string | 匹配类型 ("exact" 或 "fuzzy") |
| data.matches[].matchIndex | number | 在文本中的匹配位置索引 (仅精确匹配) |
| data.matches[].context | string | 匹配文字的上下文 |
| data.documentInfo | object | 文档信息 |
| data.documentInfo.pageCount | number | 文档总页数 |
| data.documentInfo.fileType | string | 文件类型 |
| data.documentInfo.fileName | string | 文件名 |

## 功能特性

### 1. 精确匹配
- 默认模式，查找完全匹配的文字
- 区分大小写选项可控制是否忽略大小写
- 返回匹配文字在文档中的精确位置

### 2. 模糊匹配
- 启用后可进行相似度匹配
- 通过容差参数控制匹配精度
- 适用于处理OCR识别或格式不规范的文档

### 3. 上下文提取
- 自动提取匹配文字周围的上下文
- 帮助用户理解匹配文字的语境
- 上下文长度可配置

### 4. 多页支持
- 支持在文档的所有页面中搜索
- 返回匹配文字所在的页码信息
- 按置信度排序显示结果

## 使用场景

1. **文档内容检索**: 快速定位文档中的关键信息
2. **合同审查**: 查找特定条款或关键词的位置
3. **学术研究**: 在论文中查找引用或术语
4. **法律文档**: 定位法律条款和重要声明
5. **技术文档**: 查找配置参数或代码示例

## 测试页面

项目提供了测试页面 `text-search-test.html`，可以通过浏览器访问进行功能测试：

1. 启动服务器: `npm start`
2. 打开浏览器访问: `http://localhost:3020/text-search-test.html`
3. 上传文档文件并输入要查找的文字
4. 查看查找结果

## 注意事项

1. **文件格式支持**: 目前支持 PDF、DOCX、DOC 格式
2. **文件大小限制**: 建议文件大小不超过 50MB
3. **处理时间**: 大文件或复杂文档可能需要较长的处理时间
4. **内存使用**: 处理大文件时注意服务器内存使用情况
5. **临时文件**: 上传的文件会在处理完成后自动清理

## 错误处理

常见错误及解决方案：

| 错误类型 | 原因 | 解决方案 |
|----------|------|----------|
| 文件格式不支持 | 上传了不支持的格式 | 确保文件为 PDF、DOCX 或 DOC 格式 |
| 文件不存在 | 文件上传失败 | 检查文件是否完整上传 |
| 搜索文字为空 | 未提供搜索文字 | 输入有效的搜索文字 |
| 处理超时 | 文件过大或复杂 | 尝试使用较小的文件或简化搜索条件 |

## 性能优化建议

1. **合理设置参数**: 根据需求调整模糊匹配容差和最大结果数
2. **文件预处理**: 确保文档格式规范，提高识别准确率
3. **分批处理**: 对于大量文档，考虑分批处理
4. **缓存机制**: 对于重复搜索，可以考虑添加缓存功能
