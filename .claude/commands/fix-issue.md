**github cli を用いてください**

GitHub issue #$ARGUMENTS を解決するために、以下の手順で作業を進めてください：

**事前確認**：

- Issue 種別判定（feature/bugfix/enhance）でアプローチ調整

1. **新しいブランチの作成**

   - issue #[ISSUE_NUMBER] に基づいて適切な名前のブランチを作成する
   - 例：`feature/issue-123-add-export` または `bugfix/issue-456-fix-memo-save`

2. **Explore（最小限理解）**
   - **CLAUDE.md 確認**（SPECIFICATION.md は必要時のみ）
   - issue 対象の**ファイル・フォルダ存在確認のみ**
   - 類似実装**1 個のみ**参考（feature 時）
   - **制約**: 詳細読み込み禁止、最大 5000 トークン
3. **Plan（実装計画）**

   - issue 要件の分析
   - 必要な変更点リストアップ
   - 実装順序の決定
   - **制約**: 具体的・実行可能な計画

4. **人間確認（必須停止）**

   - プラン内容報告
   - アプローチ適切性確認
   - 修正指示対応
   - **確認後のみ次段階進行**

5. **Code（段階実装）**

   - 必要ファイルを段階的読み込み
   - 既存スタイル踏襲
   - エラーハンドリング含める

6. **Commit 準備**
   - コミット用変更サマリ作成
   - 形式: `[type]: [description]\n\nCloses #[ISSUE_NUMBER]`

**重要制約**:

- Explore 段階での過度な調査禁止
- Plan 完了時点で必ず人間確認待ち
- 効率重視、既存パターン最優先
- GitHub への Commit はせず、サマリのみ作成
