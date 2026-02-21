---
name: uiux-review
description: UI/UX review for this project. Combines web-design-guidelines compliance check and ui-ux-pro-max design intelligence, then filters results by actual impact. Use when asked to "UI/UXを改善", "UIを直して", "アクセシビリティを確認", or "デザインをレビュー".
metadata:
  author: local
  version: "1.0.0"
  argument-hint: "[ページ名 or ファイルパス（省略時は主要UIファイルを自動検出）]"
---

# UI/UX Review Skill

このプロジェクトの UI/UX を分析し、**本当にインパクトのある改善のみ**を優先順位付きで提案する。

## ステップ

### 1. 対象ファイルを特定

引数が指定された場合はそのファイル、なければ以下を自動対象にする:
- `src/components/layout/sidebar.tsx`
- `src/app/(auth)/settings/page.tsx`
- `src/app/(auth)/settings/team/page.tsx`
- `src/app/(public)/book/[slug]/page.tsx`
- その他 `src/app/(auth)/` 配下の `page.tsx`

### 2. ガイドラインを並列取得

以下を **同時に** 実行する（並列）:

**A. Vercel Web Interface Guidelines**
WebFetch で最新ルールを取得:
```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

**B. UI-UX Pro Max デザインシステム**
以下のコマンドを Bash で実行:
```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "scheduling SaaS meeting booking" --design-system
```

**C. 対象ファイルを読む**
Read ツールで対象ファイルをすべて読む。

### 3. 照合・分析

読んだコードを2つのガイドラインと照合する。

### 4. フィルタリング（重要）

すべての指摘を出力するのではなく、以下の基準で **取捨選択** する:

**出力する（本当にインパクトがある）:**
- ユーザーの操作を妨げるバグに近いもの（バリデーション欠如、状態消失など）
- アクセシビリティ違反（aria-label なし、フォーム label なし）
- 実際に使ったら気づく UX の穴（離脱ガードなし、空状態の未処理、ステップ表示なし）
- スケルトン・ローディング状態の欠如（ユーザー体感に直結）

**出力しない（ボイラープレート的な指摘）:**
- フォントの変更提案（工数に対して効果が薄い）
- `transition: all` 禁止（このアプリ規模では体感できない）
- `tabular-nums` のような細かいタイポグラフィ調整
- CTAカラー変更などのブランディング意見（プロダクトの文脈を無視した一般論）
- 仮想リスト化（50件以上のリストが存在しない限り）

### 5. 出力フォーマット

```
## Critical（即修正）
- [ファイル名:行番号] 問題の説明 → 具体的な修正方法

## High（UX品質に直結）
- [ファイル名:行番号] 問題の説明 → 具体的な修正方法

## Medium（余裕があれば）
- [ファイル名:行番号] 問題の説明 → 具体的な修正方法

## 実装しないもの（理由）
- XX: このアプリでは該当しない / 効果が工数に見合わない
```

### 6. 確認

出力後に「実装しますか？」と聞く。Yes なら:
1. Critical → High の順に実装
2. TypeScript エラーがないか `npx tsc --noEmit` で確認
3. `gcloud run deploy meetflow --source . --region asia-northeast1 --allow-unauthenticated` でデプロイ
4. MEMORY.md に変更内容を記録
