# StepFun 抠图实现计划与结论

## 可行性结论

StepFun 官方 `step-image-edit-2` 提供 `POST /v1/images/edits`，输入图最高 4096×4096，输出保持输入尺寸，适合把复杂背景统一成色幕。但该接口没有承诺直接返回透明 Alpha，因此不应把“生成透明 PNG”作为唯一方案。

本项目采用混合方案：

1. 浏览器将待处理照片压缩到最长边 2048 像素。
2. 服务端 `/api/qijing/cutout` 以 `multipart/form-data` 调用 StepFun，要求保持主体并把背景变为 `#FF00FF`。
3. 浏览器从四边向内做品红连通域搜索，生成透明蒙版。
4. 蒙版应用到上传前的原图像素，而不是直接使用模型生成的主体像素。
5. StepFun 不可用时自动回退 IMG.LY/ONNX 本地抠图，再失败才使用原有中央裁切。

## 取舍

- 优点：复杂背景先被生成模型简化；API Key 不下发；保留原图主体纹理；已有离线回退可继续使用。
- 风险：生成编辑可能轻微移动轮廓；细发丝与半透明材质仍可能出现色边；云端路径涉及照片上传和按张计费。
- 后续：用人物、建筑、食物、多人、低对比、发丝六类样本建立 IoU/边缘质量测试；若对精确轮廓要求提升，应接入专用分割模型，而不是继续提高生成步数。

## 验收标准

- 配置 StepFun Key 时，个人页扫描状态展示“StepFun 增强抠图完成”。
- 未配置 Key、超时或 5xx 时，用户流程不中断并自动切到本地 AI。
- 前端与日志均不包含 API Key。
- 服务端拒绝非 JPEG/PNG/WebP、超过 10MB 或畸形 Data URI。
- 输出贴纸使用透明 PNG，主体 RGB 来自上传前原图。

官方参考：

- https://platform.stepfun.com/docs/zh/guides/models/step-image-edit-2
- https://platform.stepfun.com/docs/zh/api-reference/images/edits
- https://platform.stepfun.com/docs/zh/guides/developer/image-edit
