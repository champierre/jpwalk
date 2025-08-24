# SQLite WASM + OPFS サンプルアプリケーション

このプロジェクトは、GitHub Pagesで動作するSQLite WASM（WebAssembly）とOPFS（Origin Private File System）を使用したサンプルアプリケーションです。ブラウザ内で完全に動作する永続的なSQLiteデータベースを実装しています。

## 🚀 デモ

[GitHub Pagesでライブデモを見る](https://your-username.github.io/jpwalk/)

## ✨ 機能

- **永続的なデータ保存**: OPFSを使用してブラウザにデータを永続的に保存
- **タスク管理**: タスクの追加、完了/未完了の切り替え、削除
- **データエクスポート**: JSON形式でデータをエクスポート
- **SQLクエリ実行**: カスタムSQLクエリを直接実行
- **統計情報表示**: タスクの統計情報を表示
- **フォールバック対応**: OPFSが利用できない場合はLocalStorageを使用

## 🛠️ 技術スタック

- **SQLite WASM**: ブラウザで動作するSQLiteのWebAssembly版
- **OPFS (Origin Private File System)**: ブラウザの永続的ファイルシステム
- **Vanilla JavaScript**: フレームワークを使用しないピュアなJavaScript
- **HTML5 & CSS3**: モダンなUI実装

## 📦 セットアップ

### GitHub Pagesでの公開方法

1. このリポジトリをフォークまたはクローン
```bash
git clone https://github.com/your-username/jpwalk.git
cd jpwalk
```

2. GitHubにプッシュ
```bash
git add .
git commit -m "Add SQLite WASM + OPFS sample app"
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

| ブラウザ | OPFS サポート | フォールバック |
|---------|--------------|---------------|
| Chrome 102+ | ✅ | - |
| Edge 102+ | ✅ | - |
| Firefox 111+ | ✅ | - |
| Safari 15.2+ | ⚠️ 部分的 | LocalStorage |
| その他 | ❌ | LocalStorage |

## 📝 注意事項

### Cross-Origin Isolation (COOP/COEP)について
GitHub PagesでOPFSを有効にするため、Service Worker (`coi-serviceworker.js`) を使用してCross-Origin Isolationのヘッダーをエミュレートしています。初回アクセス時に自動的にページがリロードされる場合があります。

### その他の注意点
- OPFSはHTTPS環境でのみ動作します（localhostは例外）
- GitHub Pagesは自動的にHTTPSを提供するため、問題なく動作します
- プライベートブラウジングモードでは永続性が制限される場合があります
- ブラウザのストレージ容量制限に注意してください

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📄 ライセンス

MIT License

## 🔗 関連リンク

- [SQLite WASM公式ドキュメント](https://sqlite.org/wasm/doc/trunk/index.md)
- [OPFS仕様](https://fs.spec.whatwg.org/)
- [GitHub Pages公式ドキュメント](https://docs.github.com/pages)