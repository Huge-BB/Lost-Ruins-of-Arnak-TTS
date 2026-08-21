# 研究轨人工数据录入说明

本目录里与研究轨人工录入直接相关的文件只有两份：

- `research-manual-data.json`：填写研究路线的支付费用、路线限制、特殊层级修正、神庙到达分。
- `research-rewards-manual.json`：填写每个研究节点上，放大镜和书本各自获得的固定奖励。

节点 ID 和路线 `from/to` 已由程序从 TTS 数据生成。**不要自行新增、删除或改名节点 ID。** 如果实体版图与生成拓扑不一致，先保留原数据并单独标记问题。

## 1. 通用字段

### `verified`

人工对照实体版图确认后改为：

```json
"verified": true
```

尚未确认保持 `false`。引擎不会把未确认的研究路线当成正式可支付路线。

### 研究标记名称

| JSON | 含义 |
|---|---|
| `magnifying` | 放大镜 |
| `journal` | 书本 / 日志本 |

## 2. `research-manual-data.json`

### 2.1 普通资源费用 `cost`

可用字段：

| JSON | 游戏资源 |
|---|---|
| `coin` | 金币 |
| `compass` | 罗盘 |
| `tablet` | 石板 |
| `arrowhead` | 箭头 |
| `jewel` | 宝石 |
| `usableIdol` | 一个仍可用、尚未放进神像奖励槽的神像 |

没有用到的资源不要写 `0`。

例如支付 1 金币 + 2 石板：

```json
"cost": {
  "coin": 1,
  "tablet": 2
}
```

蛇庙支付一个可用神像：

```json
"cost": {
  "usableIdol": 1
}
```

这里的 `usableIdol` 只能使用玩家仍持有、未放进 idol slot 的神像；支付后神像移出游戏。

### 2.2 猴庙交通图标费用

交通费用写在 `cost.travel`：

| JSON | 交通图标 |
|---|---|
| `boot` | 步行 |
| `car` | 汽车 |
| `boat` | 船 |
| `plane` | 飞机 |

例如 1 船：

```json
"cost": {
  "travel": {
    "boat": 1
  }
}
```

例如 1 汽车 + 1 步行：

```json
"cost": {
  "travel": {
    "car": 1,
    "boot": 1
  }
}
```

交通支付最终由玩家从手牌选择带对应旅行图标的牌完成，引擎按阿纳克交通替代规则校验。

### 2.3 猴庙路线限制 `allowedTokens`

普通路线省略 `allowedTokens`，表示放大镜和书本都可以走。

仅放大镜可走：

```json
"allowedTokens": ["magnifying"]
```

仅书本可走：

```json
"allowedTokens": ["journal"]
```

猴庙有左右路线分别限定研究标记的情况，需要按实体版图填写这个字段。

### 2.4 神庙到达分 `templeArrivalPoints`

每张研究板分别填写：

```json
"templeArrivalPoints": [第一名, 第二名, 第三名, 第四名]
```

例如某张板图印的是 23 / 21 / 20 / 19：

```json
"templeArrivalPoints": [23, 21, 20, 19]
```

不要依据其他神庙推断数值，各板分别核对。

### 2.5 `nodeOverrides`

仅用于实体格跨越或跳过逻辑层级的特殊情况。普通格保持空数组。

例如一个实体格同时属于第 4、5 层：

```json
{
  "node": "example:r4:p1",
  "researchLevel": 5,
  "spansLevels": [4, 5],
  "verified": true
}
```

## 3. `research-rewards-manual.json`

每个条目已经预生成 `node + token`，只填写 `rewards` 并修改 `verified`。

```json
{
  "node": "bird:r0:p0",
  "token": "magnifying",
  "rewards": [],
  "verified": false
}
```

一个格子有多个效果时，在同一个 `rewards` 数组里依次写多个对象。

## 4. 奖励类型

### 4.1 获得资源 `GAIN_RESOURCE`

支持 `coin / compass / tablet / arrowhead / jewel`。

```json
{
  "type": "GAIN_RESOURCE",
  "resource": "compass",
  "amount": 1
}
```

多个资源直接写多个奖励：

```json
"rewards": [
  { "type": "GAIN_RESOURCE", "resource": "coin", "amount": 1 },
  { "type": "GAIN_RESOURCE", "resource": "tablet", "amount": 1 }
]
```

### 4.2 抽牌 `DRAW_CARD`

```json
{
  "type": "DRAW_CARD",
  "amount": 1
}
```

### 4.3 获得恐惧牌 `GAIN_FEAR_CARD`

蛇庙等负面奖励使用：

```json
{
  "type": "GAIN_FEAR_CARD",
  "amount": 1
}
```

### 4.4 获得银助手 `CLAIM_ASSISTANT`

```json
{
  "type": "CLAIM_ASSISTANT",
  "level": "silver"
}
```

需要玩家从可用助手供应中选择。

### 4.5 升级助手 `UPGRADE_ASSISTANT`

```json
{
  "type": "UPGRADE_ASSISTANT",
  "level": "gold"
}
```

需要玩家选择自己已有的助手升级。

### 4.6 重置助手 `REFRESH_ASSISTANTS`

重置所有助手：

```json
{
  "type": "REFRESH_ASSISTANTS",
  "amount": "all"
}
```

如果明确只重置固定数量，也可以写整数：

```json
{
  "type": "REFRESH_ASSISTANTS",
  "amount": 1
}
```

### 4.7 免费获得神器 `ACQUIRE_ARTIFACT_FREE`

```json
{
  "type": "ACQUIRE_ARTIFACT_FREE"
}
```

玩家从当前神器市场中选择，忽略罗盘费用。

### 4.8 触发一个已探索一级地点 `ACTIVATE_DISCOVERED_LEVEL1_SITE`

```json
{
  "type": "ACTIVATE_DISCOVERED_LEVEL1_SITE"
}
```

对应基础双筒望远镜式效果，需要玩家选择一个已经探索的一级地点并执行其效果。

### 4.9 触发供应堆顶银助手并沉底 `ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM`

```json
{
  "type": "ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM"
}
```

对应猴庙效果：触发当前供应堆顶部可见银助手能力，然后把该助手放到该堆底部。

### 4.10 随机研究奖励板块 `BONUS_TILE`

```json
{
  "type": "BONUS_TILE"
}
```

普通情况下**不需要人工填写**。哪些节点放随机 research bonus tile 会从 TTS 数据自动提取，具体奖励在每局 setup 时随机确定。

### 4.11 多选一 `CHOOSE`

例如“获得一个银助手 / 升级一个已有助手”二选一：

```json
{
  "type": "CHOOSE",
  "count": 1,
  "options": [
    {
      "type": "CLAIM_ASSISTANT",
      "level": "silver"
    },
    {
      "type": "UPGRADE_ASSISTANT",
      "level": "gold"
    }
  ]
}
```

`count` 表示需要选择多少项。

### 4.12 顺序组合 `SEQUENCE`

只有效果明确要求顺序执行时才使用：

```json
{
  "type": "SEQUENCE",
  "rewards": [
    { "type": "GAIN_RESOURCE", "resource": "coin", "amount": 1 },
    { "type": "DRAW_CARD", "amount": 1 }
  ]
}
```

普通“同时获得 A 和 B”直接在外层 `rewards` 数组写两项即可。

### 4.13 尚未建模的神庙专属效果 `TEMPLE_SPECIAL`

已经确认实体效果，但 README 里没有对应类型时，可以暂时记录：

```json
{
  "type": "TEMPLE_SPECIAL",
  "code": "LIZARD_SOME_EFFECT",
  "data": {}
}
```

`code` 请写能说明语义的英文大写名称，并把实际效果告诉开发侧，随后会建立正式专属 action。不要用 `TEMPLE_SPECIAL` 代替已经存在的明确奖励类型。

## 5. 四张当前研究轨的特殊点

### Bird

基础研究轨，费用主要是五种普通资源。节点奖励依照放大镜 / 书本分别填写。

### Snake

已知特殊规则包括：

- 中段存在支付一个可用神像的路线，使用 `usableIdol`。
- 存在获得恐惧牌的负面奖励，使用 `GAIN_FEAR_CARD`。
- 存在免费获得神器的奖励，使用 `ACQUIRE_ARTIFACT_FREE`。

### Monkey

已知特殊规则包括：

- 研究费用出现交通图标，使用 `cost.travel`。
- 部分路线/位置只允许放大镜或书本，使用 `allowedTokens`。
- 重置双助手：`REFRESH_ASSISTANTS` + `amount: "all"`。
- 获得助手 / 升级助手二选一：`CHOOSE`。
- 重新触发已探索一级地点：`ACTIVATE_DISCOVERED_LEVEL1_SITE`。
- 触发供应堆顶部银助手并沉底：`ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM`。
- Setup 时从费用为 3 的神器中随机一张放到研究轨指定格；只有放大镜触发该神器。此机制由 Monkey temple rules plugin 管理，不要在普通节点奖励里重复写市场神器奖励。

`research-rewards-manual.json` 中 Monkey 暂时带 `needsTokenAccessCheck: true`。只填写实体版图实际允许的 token；另一条保持空和 `verified: false`。

### Lizard

已知特殊规则包括：

- 轨道存在守护者/怪物实体，会阻挡后续玩家研究移动；可被特定卡牌/行动击败。该状态由 Lizard temple rules plugin 管理。
- 存在“触发一个已探索一级地点，并烧毁该地点以及其上的守护者”的专属效果。当前具体节点录入时先使用 `TEMPLE_SPECIAL` 并提供清晰 `code`，开发侧再映射成正式 Lizard action。

## 6. 录入约定

1. 不修改自动生成的 `node`、`from`、`to`。
2. `cost` 只填跨越路线时支付的东西；节点奖励只填在 rewards 文件。
3. 每个节点的放大镜和书本奖励分别填写，不合并。
4. Monkey 的单 token 节点只填写合法 token 的条目。
5. 核对完成后才设 `verified: true`。
6. 看不懂的新图标、费用或奖励保持空，不自行创造字段名。
7. 神庙到达分按每张板自己的第 1/2/3/4 名填写。

数据校验命令：

```bash
cd web
npm run validate:research
npm test
```
