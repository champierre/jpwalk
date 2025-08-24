# Japanese Walking (インターバル速歩) アプリ

信州大学のインターバル速歩を参考にした、ブラウザで動作するウォーキング習慣管理アプリです。SQLite（sql.js）とIndexedDBを使用してセッション履歴を永続的に保存します。

※ 「[インターバル速歩](https://www.shinshu-u.ac.jp/zukan/cooperation/i-walk.html)」はNPO法人熟年体育大学リサーチセンターの登録商標です。

## 🚀 アプリ

[https://champierre.github.io/jpwalk/](https://champierre.github.io/jpwalk/)

## ✨ 機能

- **インターバル速歩タイマー**: 3分間の速歩き + 3分間のゆっくり歩きを5セット（30分）
- **リアルタイム位置追跡**: GPS位置情報を記録してルートマップに表示
- **永続的なデータ保存**: IndexedDBを使用してセッション履歴を保存
- **セッション履歴管理**: 過去のウォーキングセッションの詳細表示と削除
- **週間進捗表示**: 今週のセッション数と総時間の統計
- **ページネーション**: セッション一覧の10件ずつ表示
- **オフライン対応**: ネットワーク接続不要で動作

## 🛠️ 技術スタック

- **sql.js**: ブラウザで動作するSQLiteのEmscripten版
- **IndexedDB**: ブラウザの永続的ストレージAPI
- **Web Workers**: SQLiteをバックグラウンドで実行
- **Leaflet.js**: インタラクティブな地図表示とルート描画
- **Geolocation API**: GPS位置情報の取得
- **Tailwind CSS**: ユーティリティファーストCSSフレームワーク
- **Vanilla JavaScript**: フレームワークを使用しないピュアなJavaScript

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

### インターバル速歩セッション
1. 「ウォーキングを開始」ボタンをクリック
2. 3分間の速歩き（赤色表示）と3分間のゆっくり歩き（青色表示）を交互に実行
3. 5セット（30分）の完全なワークアウト
4. 一時停止・再開・終了が可能

### 位置情報追跡
- GPS位置情報を自動的に記録
- セッション詳細でルートマップを表示
- 開始・終了地点にマーカー表示
- 位置情報データの詳細表示（時刻、フェーズ、緯度、経度）

### セッション履歴
- 今週の進捗統計（セッション数、総時間）
- 最近のセッション3件の表示
- 全セッション一覧（10件ずつページネーション表示）
- セッション詳細の表示・削除

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
├── index.html              # メインHTML（Tailwind CSS UI）
├── app.js                  # ウォーキングセッション管理とタイマーロジック
├── sqlite-worker.js        # Web Worker for SQL.js operations
├── icon.png               # アプリケーションアイコン
├── README.md               # このファイル
└── CLAUDE.md               # Claude Code用ガイド
```

## 🔧 アーキテクチャ

1. **メインスレッド**: UI操作とインターバルタイマー管理
2. **Web Worker**: sql.jsを使用したSQLite処理
3. **IndexedDB**: ウォーキングセッションデータの永続化
4. **Geolocation API**: GPS位置情報の取得
5. **Leaflet.js**: ルートマップの表示とマーカー管理

## 📝 注意事項

- 位置情報の使用許可が必要です（初回起動時にブラウザが許可を求めます）
- IndexedDBはHTTPS環境またはlocalhostでのみ動作します
- GitHub Pagesは自動的にHTTPSを提供するため、問題なく動作します
- 位置情報が取得できない場合は東京駅周辺のモックデータを使用します
- プライベートブラウジングモードでは永続性が制限される場合があります

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📄 ライセンス

MIT License

## 🔗 関連リンク

- [インターバル速歩 - 信州大学](https://www.shinshu-u.ac.jp/zukan/cooperation/i-walk.html)
- [sql.js公式ドキュメント](https://sql.js.org/)
- [Leaflet.js公式ドキュメント](https://leafletjs.com/)
- [Tailwind CSS公式ドキュメント](https://tailwindcss.com/)
- [IndexedDB MDN ドキュメント](https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API)
- [Geolocation API MDN ドキュメント](https://developer.mozilla.org/ja/docs/Web/API/Geolocation_API)