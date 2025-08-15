# 图片检测 API 文档

## 概述

图片检测 API 用于判断文档中指定文字的下一行是否包含图片。该功能基于文字和图片的位置关系进行智能分析，支持多种文档格式。

## API 端点

### POST /detect-image-after-text

检测文档中指定文字后面的内容是否为图片。

#### 请求参数

**Content-Type:** `multipart/form-data`

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | 要检测的文档文件 (PDF, DOCX, DOC) |
| targetText | string | 是 | 要检测的目标文字 |
| searchRadius | number | 否 | 搜索半径（像素），默认 100 |
| lineHeight | number | 否 | 行高（像素），默认 20 |
| tolerance | number | 否 | 文本匹配容差 (0.1-1.0)，默认 0.8 |
| fuzzyMatch | boolean | 否 | 是否启用模糊匹配，默认 false |

#### 请求示例

```bash
curl -X POST http://localhost:3020/detect-image-after-text \
  -F "file=@document.pdf" \
  -F "targetText=重要信息" \
  -F "searchRadius=100" \
  -F "lineHeight=20" \
  -F "tolerance=0.8" \
  -F "fuzzyMatch=false"
```

#### 响应格式

**成功响应 (200):**

```json
{
  "success": true,
  "message": "图片检测完成",
  "data": {
    "targetText": "重要信息",
    "hasImageAfter": true,
    "imageDetails": [
      {
        "position": {
          "x": 150,
          "y": 300,
          "width": 200,
          "height": 150
        },
        "type": "image",
        "index": 0,
        "distance": 85.2,
        "isBelowText": true,
        "relativePosition": "图片位于文字center下方"
      }
    ],
    "textPosition": {
      "x": 100,
      "y": 200,
      "width": 800,
      "height": 25
    },
    "confidence": 1.0,
    "documentInfo": {
      "pageCount": 5,
      "fileType": ".pdf",
      "fileName": "document.pdf"
    }
  }
}
```

**未检测到图片的响应:**

```json
{
  "success": true,
  "message": "图片检测完成",
  "data": {
    "targetText": "重要信息",
    "hasImageAfter": false,
    "imageDetails": [],
    "textPosition": {
      "x": 100,
      "y": 200,
      "width": 800,
      "height": 25
    },
    "confidence": 1.0,
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
| data.targetText | string | 目标文字 |
| data.hasImageAfter | boolean | 是否检测到图片 |
| data.imageDetails | array | 图片详细信息列表 |
| data.imageDetails[].position | object | 图片位置信息 |
| data.imageDetails[].type | string | 图片类型 |
| data.imageDetails[].index | number | 图片索引 |
| data.imageDetails[].distance | number | 与文字的距离（像素） |
| data.imageDetails[].isBelowText | boolean | 是否在文字下方 |
| data.imageDetails[].relativePosition | string | 相对位置描述 |
| data.textPosition | object | 文字位置信息 |
| data.confidence | number | 文字匹配置信度 (0-1) |
| data.documentInfo | object | 文档信息 |

## 检测算法

### 1. 文字定位
- 在文档中搜索目标文字
- 支持精确匹配和模糊匹配
- 返回文字的位置坐标和尺寸

### 2. 图片检测
- 分析文档中的所有图片位置
- 计算图片与文字的距离
- 判断图片是否在文字下方

### 3. 位置关系判断
- **垂直关系**: 图片顶部必须在文字底部下方
- **距离限制**: 图片与文字的距离在合理范围内
- **水平对齐**: 考虑图片相对于文字的水平位置

### 4. 参数说明

#### searchRadius (搜索半径)
- 定义图片与文字的最大距离
- 默认值: 100 像素
- 建议范围: 10-500 像素

#### lineHeight (行高)
- 用于计算文字底部位置
- 默认值: 20 像素
- 影响图片检测的精确度

#### tolerance (匹配容差)
- 控制文字匹配的精确度
- 默认值: 0.8
- 范围: 0.1-1.0

#### fuzzyMatch (模糊匹配)
- 是否启用模糊匹配模式
- 默认值: false
- 适用于OCR识别或格式不规范的文档

## 使用场景

1. **文档结构分析**: 分析文档中文字与图片的布局关系
2. **内容验证**: 检查特定文字是否配有相应的图片
3. **自动化处理**: 根据文字-图片关系进行文档处理
4. **质量检查**: 验证文档格式是否符合要求
5. **内容提取**: 提取与特定文字相关的图片

## 测试页面

项目提供了专门的测试页面 `image-detection-test.html`：

1. 启动服务器: `npm start`
2. 打开浏览器访问: `http://localhost:3020/image-detection-test.html`
3. 上传文档文件并输入目标文字
4. 调整检测参数
5. 查看检测结果

## 检测逻辑详解

### 图片位置判断标准

```javascript
// 判断图片是否在文字下方
function isImageBelowText(textPosition, imagePosition, lineHeight) {
  const textBottom = textPosition.y + textPosition.height
  const imageTop = imagePosition.y
  
  // 最小距离：行高的一半
  const minDistance = lineHeight * 0.5
  // 最大距离：行高的3倍
  const maxDistance = lineHeight * 3
  
  return imageTop >= textBottom + minDistance && 
         imageTop <= textBottom + maxDistance
}
```

### 相对位置计算

```javascript
// 计算图片相对于文字的水平位置
function getRelativePosition(textPosition, imagePosition) {
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
```

## 性能优化建议

1. **合理设置参数**: 根据文档特点调整搜索半径和行高
2. **预处理文档**: 确保文档格式规范，提高检测准确率
3. **批量处理**: 对于大量文档，考虑批量处理
4. **缓存机制**: 对于重复检测，可以考虑添加缓存功能

## 常见问题

### Q: 为什么检测不到图片？
A: 可能的原因：
- 图片距离文字太远（超出搜索半径）
- 图片位置不在文字正下方
- 文字匹配失败
- 需要调整检测参数

### Q: 如何提高检测准确率？
A: 建议：
- 调整搜索半径参数
- 启用模糊匹配（适用于OCR文档）
- 根据文档特点调整行高
- 确保文档格式规范

### Q: 支持哪些文档格式？
A: 目前支持：
- PDF (.pdf)
- Word文档 (.docx, .doc)

### Q: 检测结果包含哪些信息？
A: 检测结果包含：
- 是否检测到图片
- 图片的详细位置信息
- 图片与文字的距离
- 相对位置关系
- 文字位置信息

## 错误处理

常见错误及解决方案：

| 错误类型 | 原因 | 解决方案 |
|----------|------|----------|
| 文件格式不支持 | 上传了不支持的格式 | 确保文件为 PDF、DOCX 或 DOC 格式 |
| 文件不存在 | 文件上传失败 | 检查文件是否完整上传 |
| 目标文字为空 | 未提供目标文字 | 输入有效的目标文字 |
| 处理超时 | 文件过大或复杂 | 尝试使用较小的文件或简化检测条件 |
