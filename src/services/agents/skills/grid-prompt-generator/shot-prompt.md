# 镜头画面提示词模板

## 目标

镜头画面提示词用于首帧、尾帧、镜头图和宫格格子。它必须像电影定帧一样清楚：谁在画面中、在哪里、做什么、光线怎样、构图怎样。

## 模板结构

```text
[Shot type] shot, [camera angle], [composition],
[character names and visual descriptions], [pose/action/expression],
[location and key environment details],
[lighting source, color palette, atmosphere],
cinematic quality, consistent art style, high quality, detailed, no text, no watermark
```

## 首帧提示词

```text
Opening frame, [shot type], [angle],
[character] begins [visible action], [starting pose/expression],
[environment], [lighting],
cinematic quality, consistent art style, no text, no watermark
```

## 尾帧提示词

```text
Ending frame, [shot type], [angle],
[character] ends in [new pose/state], [changed expression or result],
[environment continuity], [lighting continuity],
continuous motion implied, cinematic quality, consistent art style, no text, no watermark
```

## 生成要点

- 镜头提示词必须服务画面，不写不可见心理。
- 对角色图像一致性敏感时，加入服装、发型、显著特征。
- 对场景一致性敏感时，加入具体地点、光线和关键道具。
- 宫格中每格提示词要独立可读，同时保留整体风格一致。

## 示例

```text
Medium close-up shot, slightly low angle, centered composition,
a young man with messy dark hair grips a rusty wrench tightly, tense jaw, sweat on his forehead, determined expression,
dim repair shop interior with tool boards and scattered metal parts in the background,
single overhead fluorescent light casting harsh blue-grey shadows,
cinematic quality, consistent art style, high quality, dramatic lighting, no text, no watermark
```
