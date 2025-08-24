# SQLite + IndexedDB サンプルアプリケーション

このプロジェクトは、GitHub Pagesで動作するSQLite（sql.js）とIndexedDBを使用したサンプルアプリケーションです。ブラウザ内で完全に動作する永続的なSQLiteデータベースを実装しています。

## 🚀 デモ

[GitHub Pagesでライブデモを見る](https://champierre.github.io/jpwalk/)

## ✨ 機能

- **永続的なデータ保存**: IndexedDBを使用してブラウザにデータを永続的に保存
- **タスク管理**: タスクの追加、完了/未完了の切り替え、削除
- **データエクスポート**: JSON形式でデータをエクスポート
- **SQLクエリ実行**: カスタムSQLクエリを直接実行
- **統計情報表示**: タスクの統計情報を表示
- **クロスブラウザ対応**: 全てのモダンブラウザで動作

## 🛠️ 技術スタック

- **sql.js**: ブラウザで動作するSQLiteのEmscripten版
- **IndexedDB**: ブラウザの永続的ストレージAPI
- **Web Workers**: SQLiteをバックグラウンドで実行
- **Vanilla JavaScript**: フレームワークを使用しないピュアなJavaScript
- **HTML5 & CSS3**: モダンなUI実装

## 📦 セットアップ

### GitHub Pagesでの公開方法

1. このリポジトリをフォークまたはクローン
```bash
git clone https://github.com/champierre/jpwalk.git
cd jpwalk
```

2. GitHubにプッシュ
```bash
git add .
git commit -m "Add SQLite + IndexedDB sample app"
git push origin main
```

3. GitHub Pagesを有効化
   - リポジトリの Settings → Pages へ移動
   - Source で「Deploy from a branch」を選択
   - Branch で「main」と「/ (root)」を選択
   - Save をクリック

4. 数分後、`https://your-username.github.io/jpwalk/` でアプリケーションにアクセス可能

### ローカルでの実行

CORS制約のため、ローカルサーバーが必要です：

```bash
# Python 3を使用する場合
python -m http.server 8000

# Node.jsのhttp-serverを使用する場合
npx http-server

# VSCodeのLive Server拡張機能も使用可能
```

ブラウザで `http://localhost:8000` にアクセス

## 🔧 使い方

### タスク管理
1. テキストボックスに新しいタスクを入力
2. 「追加」ボタンをクリックまたはEnterキー
3. チェックボックスでタスクの完了状態を切り替え
4. 「削除」ボタンで個別のタスクを削除

### データベース操作
- **エクスポート**: すべてのタスクをJSON形式でダウンロード
- **全削除**: すべてのタスクを削除（確認ダイアログあり）
- **統計情報**: タスクの統計を表示

### SQLクエリ実行
テキストエリアに直接SQLクエリを入力して実行：
```sql
-- 例：すべてのタスクを表示
SELECT * FROM tasks;

-- 例：完了したタスクのみ表示
SELECT * FROM tasks WHERE completed = 1;

-- 例：タスクを直接追加
INSERT INTO tasks (title) VALUES ('新しいタスク');
```

## 🌐 ブラウザサポート

| ブラウザ | サポート | 備考 |
|---------|----------|------|
| Chrome 51+ | ✅ | IndexedDB対応 |
| Firefox 47+ | ✅ | IndexedDB対応 |
| Safari 10+ | ✅ | IndexedDB対応 |
| Edge 79+ | ✅ | IndexedDB対応 |

## 📁 プロジェクト構成

```
jpwalk/
├── index.html              # メインHTML
├── app.js                  # アプリケーションロジック
├── sqlite-worker-simple.js # SQLiteワーカー
├── styles.css              # スタイルシート
├── README.md               # このファイル
└── CLAUDE.md               # Claude Code用ガイド
```

## 🔧 アーキテクチャ

1. **メインスレッド**: UIの管理とユーザーインタラクション
2. **Web Worker**: sql.jsを使用したSQLite処理
3. **IndexedDB**: データの永続化
4. **メッセージパッシング**: メインスレッドとWorker間の通信

## 📝 注意事項

- IndexedDBはHTTPS環境またはlocalhostでのみ動作します
- GitHub Pagesは自動的にHTTPSを提供するため、問題なく動作します
- プライベートブラウジングモードでは永続性が制限される場合があります
- ブラウザのストレージ容量制限に注意してください

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📄 ライセンス

MIT License

## 🔗 関連リンク

- [sql.js公式ドキュメント](https://sql.js.org/)
- [IndexedDB MDN ドキュメント](https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API)
- [GitHub Pages公式ドキュメント](https://docs.github.com/pages)