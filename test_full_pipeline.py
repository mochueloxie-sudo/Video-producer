#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""完整测试：用新文档跑 Step 0-4，验证 LLM 增强效果"""

import os
import sys
from pathlib import Path

os.environ['LLM_PROVIDER'] = 'stepfun'
os.environ['STEPFUN_API_KEY'] = '1Jj2goyzxAxUp2uUjbHiimFk5dbjabksIvM2Ebh0OZhW5HihlaH2An9y4NRNh5GC2'

sys.path.insert(0, str(Path(__file__).parent / "steps"))

# 导入各步骤（按实际文件名）
from step0_outline import step0_outline
from step1_llm_slides import step1_llm_slides  # Step 1.5
from step2_llm_scripts import step2_llm_scripts  # Step 2
from step3_design import step3_get_design_params
from step4_html import step4_html

# 文档内容（直接使用已读内容，模拟 URL 读取）
DOC_TEXT = """AI新鲜事 2026-04-05

本期要点：
Andreessen："八十年 overnight success"，LLM + Reasoning + Agent + RSI 全部已经 work
Cursor Composer 2 发布，2x 用量提升
Microsoft 365 全连接 Claude，企业 AI 落地规模化

X / Twitter
swyx @swyx
AI Engineering Podcast 主播 / Cursor 工程师
展示了 Devin（AI 编程工具）的一个惊人能力：直接把博客文章和推文内容粘贴进去，AI 能 one-shot 实现完整功能。这说明 AI coding 的能力已经严重超出预期。

Aaron Levie @levie
Box CEO
关于 Agent 对组织的影响：人类认知有上限，团队需要 manager 的 manager 来层层 delegation。Agent 不会让这些消失——只是改变了 context 的传递方式。短期内 Agent 的有效性还是取决于人类给它的 context 和工具。

Peter Yang @petergyang
Roblox 产品负责人，140K+ Newsletter 作者
与其写长篇大论的 prompt，不如给 AI 一个短句让它自己发挥。他的 OpenClaw 用这个方法效果很好。

Amjad Masad @amasad
Replit CEO
Replit 发布新功能不到一个月，效果已经很明显了。

Ryo Lu @ryolu_
Cursor AI 设计负责人
Cursor 发布 Composer 2 新界面，UI 和图标都重新设计了。

Garry Tan @garrytan
YC CEO
Garry's List 在页面速度评分达到 95，同时还在用 AI coding 开发新功能。

Zara Zhang @zarazhangrui
Follow Builders 作者
一个有趣的新趋势：人们开始把同事、网红、甚至前任蒸馏成 agent skill。

Peter Steinberger @steipete
OpenClaw 核心贡献者
关于 Anthropic 封锁开源生态系统的争议，他透露他曾试图劝说但只成功延迟一周。

Thariq @trq212
Anthropic Claude Code
Claude Code 发布一个月免费 credits，人气极高，1728 likes。

Claude @claudeai
Anthropic 官方
Microsoft 365 connectors 现已在所有 Claude 计划中可用，可以连接 Outlook、OneDrive 和 SharePoint。

🎙️ Podcast
Latent Space × Marc Andreessen：为什么"这次真的不一样"
人物：Andreessen，a16z 联合创始人，互联网教父级人物

核心观点： 我们正在经历一场"八十年的一夜成名"——Transformer、RL、Agent、RSI 四波浪潮同时叠加，全部已经 work。

① 八十年的 overnight success
ChatGPT、o1、OpenClaw 的爆发是表面，背后是 1943 年神经网络论文以来 80 年的积累——那些一辈子没看到模型 work 的前辈们，他们的判断是正确的。

② Reasoning 是关键转折点
2022–2025 年怀疑论者可以说这只是"pattern completion"；但 o1 和 r1 之后，这个争论结束了——LLM 可以做真实的推理工作了。

③ Agent 的本质惊人地简单
Agent = LLM + Unix Shell + 文件系统 + Markdown + Cron job。Model 负责思考，Shell 负责执行，File 负责记忆，Loop 负责醒来干活。每个组件早就存在，组合起来产生了真正的自主性。更惊人的是：Agent 能修改自己的文件，从而获得新能力——它不需要人类帮它升级，可以给自己刷固件。

④ AI 将让高质量软件变得近乎无限供应
"Software is about to become infinitely available." 以前软件是稀缺资源因为程序员有限，以后不再是瓶颈了。

⑤ 供给约束是暂时的
"当前的模型是被阉割版"——如果 GPU 充足，模型会强大得多。供给约束终将解除，届时今天的技术会突然变得更好更便宜。

⑥ "Agents 雇佣人类"
AI Agent 将代替人类去 Fiverr/TaskRabbit 雇人完成物理任务——这不是科幻，是即将发生的事情。

⑦ Proof of Human
AI 太强以至于无法被检测，必须转向"Proof of Human"——生物特征 + 加密验证。World ID 项目方向正确。

⑧ AI 监管的"制度墙"
90% 的经济领域存在职业资格壁垒（加州理发师需要 900 小时认证！），AI 渗透这些领域的速度取决于制度变革，而非技术可能性。"""

def main():
  ctx = {}

  # Step 0（模拟从 URL 读取，这里直接传文本）
  print("🔍 Step 0: 内容分析...")
  # 由于 step0_outline 期望 URL，我们临时改一下，直接传文本
  # 实际应该用 read_document，这里我们模拟 context 已填充
  from step0_outline import infer_content_type, recommend_design_mode
  content_type = infer_content_type(DOC_TEXT)
  design_rec = recommend_design_mode(content_type)
  ctx['full_content'] = DOC_TEXT
  ctx['content_type'] = content_type
  ctx['design_recommendation'] = design_rec
  ctx['outline'] = {
    'main_title': 'AI新鲜事 2026-04-05',
    'main_subtitle': '本期聚焦：Andreessen、Cursor Composer 2、Microsoft 365 全连接等主题',
    'modules': [
      {'id': 1, 'title': '本期主角：Andreessen 与 "八十年 overnight success"'},
      {'id': 2, 'title': 'X / Twitter 动态精选'},
      {'id': 3, 'title': '🎙️ Podcast 核心观点'},
    ]
  }
  print(f"  内容类型: {content_type}")
  print(f"  设计推荐: {design_rec}")
  print(f"  大纲: {ctx['outline']['main_title']} ({len(ctx['outline']['modules'])} 模块)")

  # Step 1.5 (slides)
  print("\n🎨 Step 1.5: 页面精炼...")
  slides = step1_llm_slides(ctx['outline'], DOC_TEXT, content_type, ctx)
  ctx['slides'] = slides
  print(f"  生成 {len(slides)} 页")
  for i, s in enumerate(slides, 1):
    print(f"    第{i}页: {s['slide_title'][:50]}")

  # Step 2 (scripts)
  print("\n🎤 Step 2: 逐字稿...")
  scripts = step2_llm_scripts(slides, DOC_TEXT, content_type, ctx)
  print(f"  生成 {len(scripts)} 条逐字稿")
  print(f"  第1条: {scripts[0][:60]}...")

  # Step 3 (design) - 2026-04-06 优化版
  # 签名: step3_get_design_params(content_type, design_mode, context)
  # 已移除 audience_inferred 参数
  print("\n🎨 Step 3: 设计参数...")
  design_params = step3_get_design_params(content_type, 'optimized', ctx)
  ctx['design_params'] = design_params
  print(f"  模式: {design_params.get('design_mode_used')}")
  print(f"  主色: {design_params.get('primary_color')}")

  # Step 4 (LLM 增强 HTML)
  print("\n🖼️  Step 4: LLM 增强 HTML 生成...")
  html_files = step4_html(slides, ctx)
  print(f"  生成 {len(html_files)} 个 HTML 文件")

  # 查看 LLM 分析结果
  if "slide_enhancements" in ctx:
    print("\n📊 LLM 布局分析结果:")
    for i, eh in enumerate(ctx["slide_enhancements"], 1):
      print(f"  第{i}页: layout={eh['layout_hint']}, elements={eh['special_elements']}, spacing={eh['spacing_override']}")

  print("\n✅ 测试完成！HTML 文件在 /tmp/video-producer-slides/")

if __name__ == "__main__":
  main()
