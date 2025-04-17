# Drive Cleaner
## 概要 
Google ドライブ上の不要なファイルを一括削除する Google Workspace アドオン

## 動作方法
### 手動動作
1. GASのコンソール画面に遷移する (https://script.google.com/)
2. GASプロジェクトを作成する
3. code.js と appscript.json を作成する
4. 本コードを(3)にコピペする
5. GASコンソールから「デプロイ」ボタンをクリックし、メニューを表示する
6. 「デプロイをテスト」をクリックする 
7. 「インストール」をクリックする

###  `clasp` を利用した操作
※claspのインストール方法は割愛する。

1. GitHubから本コードをpullする
2. このアドオンツールを動作するGoogleアカウントでログインする
```shell
clasp login
```
3. claspのcreateコマンドを使って,GASアプリケーションを作成する
```shell
clasp create --title "<Project Name>" --type standalone
```
4. GASアプリケーションの設定ファイルを編集する
[プロジェクト設定]-[appsscript.json」マニフェスト ファイルをエディタで表示する]をチェックする
5. claspのpushコマンドでコードをpushする
```shell
clasp push
```
6. GASコンソールから「デプロイ」ボタンをクリックし、メニューを表示する
7. 「デプロイをテスト」をクリックする 
8. 「インストール」をクリックする
