# 场景图片提示词模板

## 目标

场景提示词用于生成可复用纯背景资产。必须避免人物出现，重点是空间结构、光线、氛围、材质和可拍摄细节。

## 模板结构

```text
A cinematic pure background scene of [location] at [time],
[spatial layout and architecture],
[key props, materials, textures],
[lighting source, shadow direction, color temperature],
[weather or atmosphere],
[color palette and mood],
consistent art style, atmospheric lighting, high quality, rich details,
no characters, no people, no figures, no faces, no text, no watermark
```

## 生成要点

- location 要具体到可拍摄空间。
- time 决定光线和色温。
- prompt 必须是纯背景，不能出现角色、剪影、人群、脸或身体。
- 写清空间层次：前景、中景、背景或入口、窗户、走廊、家具等。
- 保持风格一致，避免过多互相冲突的艺术风格词。

## 示例

```text
A cinematic pure background scene of a narrow hospital corridor at midnight,
long symmetrical hallway with closed ward doors on both sides, empty metal benches along the pale green walls,
glossy tiled floor reflecting cold fluorescent ceiling lights, a red emergency sign glowing at the far end,
quiet sterile atmosphere, blue-green color palette, tense and lonely mood,
consistent art style, atmospheric lighting, high quality, rich details,
no characters, no people, no figures, no faces, no text, no watermark
```
