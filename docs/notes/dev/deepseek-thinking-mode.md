---
title: DeepSeek 思考模式
order: 1
date: 2026-11-19
type: reference
status: settled
verified: yes
source: https://api-docs.deepseek.com/zh-cn/guides/thinking_mode
---

# DeepSeek 思考模式

模型在输出最终答案前先输出一段思维链，用来提升准确率。**默认开启，默认强度 `high`**——
不写参数就是最强推理，成本会悄悄变高。

## 控制参数矩阵

同一件事，三种协议三种写法：

| | OpenAI 格式 | Anthropic 格式 | Responses API 格式 |
| --- | --- | --- | --- |
| **开关** <sup>(1)</sup> | `{"thinking": {"type": "enabled/disabled"}}`（需放进 `extra_body`） | 同左 | `{"reasoning": {"effort": "none/low/high/max"}}`（`none` 即关闭） |
| **强度** <sup>(2)</sup> | `{"reasoning_effort": "low/high/max"}` | `{"output_config": {"effort": "low/high/max"}}` | 同开关列 |

(1) 思考模式默认打开，且 effort 默认为 `high`。
(2) 用户传入的 effort 会被映射到模型实际的推理档位，见下表。

## effort 映射

| 请求传入 | 实际映射 |
| --- | --- |
| `minimal` | `low` |
| `low` | `low` |
| `medium` | `high` |
| `high` | `high` |
| `xhigh` | `high` |
| `max` | `max` |
| `ultra` | `max` |

::: warning 这张表最重要的一行
`medium` 实际是 `high`，`xhigh` 实际也是 `high`。也就是说传 `medium` 不会更省，
只会在文档里显得你更克制。
:::

## 最小示例

```python
from openai import OpenAI

client = OpenAI(api_key="<key>", base_url="https://api.deepseek.com")

response = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "9.11 和 9.8 哪个大？"}],
    reasoning_effort="high",
    extra_body={"thinking": {"type": "enabled"}},
)

reasoning = response.choices[0].message.reasoning_content
content = response.choices[0].message.content
```

::: danger 坑
用 OpenAI SDK 时，`thinking` 必须塞进 `extra_body`，直接当关键字参数传会被丢掉且不报错。
:::

## 我的判断

> 这一段是官方文档没有的，也是最该记的部分。

- **默认 `high` 适合写代码、做数学、长链路推理**；但做分类、抽取、格式转换这类任务，
  思维链纯属浪费 token 和延迟，应显式传 `minimal`。
- **不要传 `medium`**：它等价于 `high`，唯一的区别是让你以为省了。
- 多轮对话里 `reasoning_content` 不需要回传，API 会忽略它；但**不要伪造**，容易被当成上下文污染。
- 真正该调的往往不是 effort，而是**问题本身**——思维链会放大模糊提问。

## 出处

官方文档（2026-11 抓取）：<https://api-docs.deepseek.com/zh-cn/guides/thinking_mode>

::: tip 保质期
这类页面 3 个月要复查一次。表里的映射关系随时可能变，但「我的判断」那段通常还成立。
:::
