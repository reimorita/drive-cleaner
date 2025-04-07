/**
 * GoogleドライブフォルダのMIMEタイプ
 * @type {string}
 */
const FOLDER_MEME_TYPE = "application/vnd.google-apps.folder";

/**
 * 一度に削除するファイルの最大数
 * 一覧表示されるファイルの上限数としても利用する
 * @type {number}
 */
const MAX_PROCESS_NUM = 30;

/**
 * ファイル選択ボタンのカラーコード
 * Google Workspace Add-on のUI表示で使用するカラーコード
 * @type {string}
 */
const ITEM_COLOR_CODE = "#4169e1";

/**
 * トップページボタンのカラーコード
 * Google Workspace Add-on のUI表示で使用するカラーコード
 * @type {string}
 */
const TOPPAGE_COLOR_CODE = "#000";

/**
 * 無題タイトルのアイテム(ドキュメント/スプレッドシート/スライド)一覧を表示する関数。
 * 以下の条件に合致するもののみ検索されます:
 *  - タイトルに「無題の○○」を含む
 *  - 6ヶ月以上前に閲覧したもの
 *  - 自分がオーナー
 *  - ゴミ箱に入っていない
 * 
 * @return {Card} アイテム一覧カードを返します。
 */
function showUntitledFiles() {
  // 「無題のドキュメント/スプレッドシート/スライド」を検索するためのクエリ文字列を作成
  const query = "((mimeType='application/vnd.google-apps.document' and title contains '無題のドキュメント') or " +
              "(mimeType='application/vnd.google-apps.spreadsheet' and title contains '無題のスプレッドシート') or " +
              "(mimeType='application/vnd.google-apps.presentation' and title contains '無題のスライド')) and " +
              "lastViewedByMeDate < '" + createSixMonthsAgoAsString() + "' and " +
              "'" + Session.getActiveUser().getEmail() + "' in owners and trashed = false";
  
  // 生成したクエリと並び順、スターの有無等を指定して共通のファイル一覧表示関数を呼び出す
  return showFiles(query, 'lastViewedByMeDate', false, true);
}

/**
 * コピータイトルのアイテム一覧を表示する関数。
 * 例：「○○ のコピー」「○○のコピー」などを対象にします。
 * @return {Card} アイテム一覧カードを返します。
 */
function showCopyFiles() {
  // 「○○ のコピー」を検索するためのクエリ文字列を作成
  const query = "(title contains ' のコピー') and " +
              "lastViewedByMeDate < '" + createSixMonthsAgoAsString() + "' and " +
              "'" + Session.getActiveUser().getEmail() + "' in owners and trashed = false";
  
  return showFiles(query, 'lastViewedByMeDate', false, true);
}

/**
 * ファイル容量が大きなアイテム一覧を表示する関数。
 * 6ヶ月以上閲覧していない自分がオーナーのファイルを大きい順に表示します。
 * @return {Card} アイテム一覧カードを返します。
 */
function showLargeCapacityFiles() {
  // ファイル容量の大きい順 (quotaBytesUsed が大きい順) に並び替えるためのクエリを作成
  const query = "lastViewedByMeDate < '" + createSixMonthsAgoAsString() + "' and " +
                "'" + Session.getActiveUser().getEmail() + "' in owners and trashed = false";
  
  return showFiles(query, 'quotaBytesUsed', false, true);
}

/**
 * スター付きアイテム一覧を表示する関数。
 * 6ヶ月以上閲覧していないスター付きのファイルを検索し、スター解除用UIを生成します。
 * @return {Card} アイテム一覧カードを返します。
 */
function showStarFiles() {
  // starred = true の条件を加えてクエリを作成
  const query = "lastViewedByMeDate < '" + createSixMonthsAgoAsString() + "' and " +
                "'" + Session.getActiveUser().getEmail() + "' in owners and trashed = false and starred = true";
  
  // ファイル一覧をスター付きとして表示するため、共通の表示関数にスター解除を行うフラグ(true)を設定
  return showFiles(query, 'starred,lastViewedByMeDate', true, true);
}

/**
 * ファイル一覧カードを生成する共通関数。
 * クエリ(query)を実行して取得したファイル情報を用いてUIを構築します。
 * 
 * @param {string} query - ファイルを取得するための検索クエリ
 * @param {string} orderItem - 並び順に用いるパラメータ (例: lastViewedByMeDate / quotaBytesUsedなど)
 * @param {boolean} isStarProcess - スター関連(解除処理)の場合に true
 * @param {boolean} checkStatus - 初期状態でチェックボックスにチェックをつけるかどうか
 * @return {Card} 生成したカードUIを返します。
 */
function showFiles(query, orderItem, isStarProcess, checkStatus) {
  // クエリを用いてファイルを検索し、結果を配列として取得
  const items = findItemsByQuery(query, orderItem);
  
  // 検索結果が空の場合
  if (items.length === 0) {
    // メッセージカードを表示してトップメニューへ戻るボタンを追加
    return showMessageAndTopMenu('検索結果', '6ヶ月以上アクセスがないファイルは存在しません');
  }

  // スター関連の処理かどうかでフッタボタン(スターを外す / ゴミ箱に移動)を分岐
  if (isStarProcess) {
    // スターを外す用のカードを作成
    return CardService.newCardBuilder()
      .setHeader(createCardHeader(
          'お気に入りのアイテム(最大' + MAX_PROCESS_NUM + '件)',
          'アイテムからスターを外す' + orderItem,
          'https://storage.googleapis.com/untitled-cleaner/untitled-cleaner.png')
        )
      // 全チェック用UI
      .addSection(createAllCheckSection(query, orderItem, isStarProcess, checkStatus))
      // 実際にファイルの一覧を表示するUI
      .addSection(createCheckedItemSection(items, checkStatus))
      // カード下部のフッタにスターを外すボタンを配置
      .setFixedFooter(createStarRemoveFooter())
      .build();
  }

  // 上記以外(スター解除以外)の場合はゴミ箱に移動するためのUIを生成
  return CardService.newCardBuilder()
    .setHeader(createCardHeader(
        '自分がオーナーのアイテム(最大' + MAX_PROCESS_NUM + '件)',
        'アイテムをゴミ箱に移動する' + orderItem,
        'https://storage.googleapis.com/untitled-cleaner/untitled-cleaner.png')
      )
    // 全チェック用UI
    .addSection(createAllCheckSection(query, orderItem, isStarProcess, checkStatus))
    // 実際にファイル一覧を表示するUI
    .addSection(createCheckedItemSection(items, checkStatus))
    // フッタに削除ボタンを配置
    .setFixedFooter(createItemsDeleteFooter())
    .build();
}

/**
 * 「全てチェック」のチェックボックスを表示するためのUIパーツを生成する関数。
 * 
 * @param {string} query - 検索クエリ
 * @param {string} orderItem - 並び順
 * @param {boolean} isStarProcess - スターの解除操作かどうか
 * @param {boolean} checkStatus - 初期状態でチェックが入っているかどうか
 * @return {CardSection} 作成したカードセクションを返します。
 */
function createAllCheckSection(query, orderItem, isStarProcess, checkStatus) {
  // カードセクションオブジェクトを作成
  const section = CardService.newCardSection();

  // 全てを一括選択するスイッチ付きテキストUIを作成
  let allCheck = CardService.newDecoratedText()
    .setText('全てチェック')
    .setWrapText(true)
    .setSwitchControl(CardService.newSwitch()
        .setFieldName('allCheck')
        .setValue('allCheck')
        .setSelected(checkStatus)
        .setOnChangeAction(
          // チェック/アンチェック時に呼び出される関数を指定
          CardService.newAction()
            .setFunctionName("checkAll")
            .setParameters({
                'query': query,
                'orderItem': orderItem,
                'isStarProcess': isStarProcess.toString(),
                'checkStatus': checkStatus.toString()
            })
        )
        .setControlType(CardService.SwitchControlType.CHECK_BOX));
  
  // セクションにウィジェットを追加
  section.addWidget(allCheck);
  return section;
}

/**
 * 「全てチェック」のチェックボックス切り替え時に呼び出される関数。
 * 再度 showFiles を呼び出して表示を更新します。
 * 
 * @param {Object} e - イベントオブジェクト(フォーム入力情報などが含まれる)
 * @return {Card} カードUIを返します。
 */
function checkAll(e) {
  var parameters = e.parameters;
  let allCheck;
  // フォーム入力として受け取った 'allCheck' の値を取得
  if(e.commonEventObject.formInputs && e.commonEventObject.formInputs.allCheck) {
    allCheck = e.commonEventObject.formInputs.allCheck.stringInputs.value[0];
  }
  // allCheck が 'allCheck' の場合はtrue、それ以外はfalseとして showFiles に渡す
  return showFiles(
    parameters['query'],
    parameters['orderItem'],
    JSON.parse(parameters['isStarProcess']),
    allCheck === 'allCheck'
  );
}

/**
 * スター解除用のフッターボタンを生成する関数。
 * @return {FixedFooter} 生成したフッターを返します。
 */
function createStarRemoveFooter() {
  return CardService.newFixedFooter()
    .setPrimaryButton(
      // テキストボタンを作成し、クリック時に removeStarOfItems() を呼ぶ
      CardService.newTextButton()
          .setText("スターを外す")
          .setOnClickAction(
              CardService.newAction()
                  .setFunctionName("removeStarOfItems")));
}

/**
 * 選択されたアイテムのスターを外す処理を行う関数。
 * 
 * @param {Object} e - イベントオブジェクト。スター解除の対象ファイルIDが含まれる。
 * @return {Card} 実行結果を表示するカードを返します。
 */
function removeStarOfItems(e) {
  // ファイルが選択されなかった場合
  if(!e.commonEventObject.formInputs) {
    return showMessageAndTopMenu('実行エラー', '1つ以上のスター付きファイルを選択してください。');
  }
  
  // 選択されたファイルIDの配列を取得
  const deleteTagetIds = e.commonEventObject.formInputs.deleteTagetIds.stringInputs.value;
  
  // 1件ずつループし、ファイルIDに対応するファイルのスターを外す
  deleteTagetIds.forEach((id) => {
      try {
        const file = DriveApp.getFileById(id);
        file.setStarred(false);
      } catch(e) {
        console.log('Fail to remove star:' + e);
      }
  });
  
  // 実行結果を表示
  return showMessageAndTopMenu('実行結果', 'スターを削除しました。');
}

/**
 * ゴミ箱へ移動するボタンをフッターに生成する関数。
 * @return {FixedFooter} 生成したフッターを返します。
 */
function createItemsDeleteFooter() {
  return CardService.newFixedFooter()
    .setPrimaryButton(
      CardService.newTextButton()
          .setText("ゴミ箱に移動")
          .setOnClickAction(
              CardService.newAction()
                  .setFunctionName("deleteItems")));
}

/**
 * 選択されたアイテムをゴミ箱へ移動する処理を行う関数。
 * 
 * @param {Object} e - イベントオブジェクト。削除対象ファイルIDが含まれる。
 * @return {Card} 実行結果を表示するカードを返します。
 */
function deleteItems(e) {
  // 何も選択されていない場合はエラー扱い
  if(!e.commonEventObject.formInputs) {
    return showMessageAndTopMenu('実行エラー', '1つ以上のファイルを選択してください。');
  }
  
  // 選択されたファイルIDの配列を取得
  const deleteTagetIds = e.commonEventObject.formInputs.deleteTagetIds.stringInputs.value;
  
  // 1ファイルずつゴミ箱に移動
  deleteTagetIds.forEach((id) => {
      try {
        const file = DriveApp.getFileById(id);
        file.setTrashed(true);
      } catch(e) {
        console.log('Fail to delete item:' + e);
      }
  });
  
  return showMessageAndTopMenu('実行結果', 'ファイルを削除しました。');
}

/**
 * mimeType からファイルの種類を判別し、わかりやすい名称を返す関数。
 * 
 * @param {string} mimeType - Googleドライブファイルの MIME タイプ
 * @return {string} ファイルの種類を表す名称
 */
function createFileKind(mimeType) {
  if(mimeType === 'application/vnd.google-apps.document') {
    return 'Googleドキュメント';
  } else if(mimeType === 'application/vnd.google-apps.presentation') {
    return 'Googleスライド';
  } else if(mimeType === 'application/vnd.google-apps.spreadsheet') {
    return 'Googleスプレッドシート';
  } else if(mimeType === 'text/plain') {
    return 'テキストファイル';
  } else if(mimeType.indexOf('video/') !== -1) {
    return '動画ファイル';
  } else if(mimeType.indexOf('audio/') !== -1) {
    return '音声ファイル';
  } else if(mimeType === 'application/octet-stream') {
    return '形式不明のファイル';
  } else if(mimeType === FOLDER_MEME_TYPE) {
    return 'Googleフォルダ';
  }
  return mimeType;
}

/**
 * 取得したファイル情報をもとに、チェックボックス付きの一覧を作成する関数。
 * 
 * @param {Array} items - ファイル情報の配列
 * @param {boolean} checkStatus - 初期状態でチェックが入っているかどうか
 * @return {CardSection} ファイル一覧のカードセクションを返します。
 */
function createCheckedItemSection(items, checkStatus) {
  // 新規のカードセクションを作成
  const section = CardService.newCardSection();

  // 配列の各ファイル情報をもとにウィジェットを作成してセクションに追加
  items.forEach(item => {
    // DecoratedText で表示内容を整形
    let fileInfo = CardService.newDecoratedText()
      .setText('<a href="' + item.url + '">' + item.name + '</a>') // ファイル名をリンク表示
      .setTopLabel(createFileKind(item.mimeType))                  // ファイルの種類を上部ラベルに表示
      .setWrapText(true)
      .setBottomLabel("最終閲覧: " + item.lastUpdated + ' サイズ: ' + bytesToSize(item.fileSize)) // 下部ラベルに日時やサイズを表示
      .setSwitchControl(
        CardService.newSwitch()
          .setFieldName('deleteTagetIds') // 選択されたファイルIDを格納するフィールド名
          .setValue(item.id)             // ファイルのIDをチェックボックスの値とする
          .setSelected(checkStatus)      // 初期状態でチェックボックスをオンにするか
          .setControlType(CardService.SwitchControlType.CHECK_BOX)
      );
    
    section.addWidget(fileInfo);
  });
  return section;
}

/**
 * 指定したクエリを用いてGoogleドライブファイルを検索し、
 * 取得したファイル情報を配列として返す関数。
 * @param {string} query - ファイルを検索するためのクエリ
 * @param {string} orderItem - 並び替え用の項目
 * @return {Array} ファイル情報の配列
 */
function findItemsByQuery(query, orderItem) {
  // Advanced Drive Service(Drive API) を利用してファイルを検索
  let result = Drive.Files.list({
    q: query,
    orderBy: orderItem + " desc",
    maxResults: MAX_PROCESS_NUM
  });

  let files = result.items;
  // 取得結果が無い場合は空配列を返す
  if (!files || files.length === 0) {
    return [];
  }

  let items = [];
  // 取得したファイルに対して必要な情報を整形し、配列に詰める
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    items.push({
      'name': file.title,                 // ファイル名
      'url': file.alternateLink,          // ファイルのリンク
      'id': file.id,                      // ファイルID
      'mimeType': file.mimeType,          // MIMEタイプ
      'fileSize': file.fileSize,          // ファイルサイズ
      'lastUpdated': formatDateTime(new Date(file.lastViewedByMeDate)) // 最終閲覧日時を整形した文字列
    });
    // MAX_PROCESS_NUMを超える場合はループを抜ける（安全策）
    if (MAX_PROCESS_NUM < items.length) {
      break;
    }
  }
  return items;
}

/**
 * メインメニュー用のボタンウィジェットをまとめて追加する関数。
 * 
 * @param {CardSection} mainMenuSection - メインメニューを追加する対象のカードセクション
 */
function addMainMenu(mainMenuSection) {
  // 「無題ファイル」ボタン
  mainMenuSection.addWidget(createActionBtn(
    "無題ファイル",
    "https://storage.googleapis.com/untitled-cleaner/untitled.png",
    "6ヶ月アクセスがない無題ファイル",
    "showUntitledFiles",
    TOPPAGE_COLOR_CODE
  ));
  // 「コピーファイル」ボタン
  mainMenuSection.addWidget(createActionBtn(
    "コピーファイル",
    "https://storage.googleapis.com/untitled-cleaner/copy-file.png",
    "6ヶ月アクセスがないコピーファイル",
    "showCopyFiles",
    TOPPAGE_COLOR_CODE
  ));
  // 「容量が大きなファイル」ボタン
  mainMenuSection.addWidget(createActionBtn(
    "容量が大きなファイル",
    "https://storage.googleapis.com/untitled-cleaner/sort.png",
    "6ヶ月アクセスがない容量大ファイル",
    "showLargeCapacityFiles",
    TOPPAGE_COLOR_CODE
  ));
  // 「スター付きファイル」ボタン
  mainMenuSection.addWidget(createActionBtn(
    "スター付きファイル",
    "https://storage.googleapis.com/untitled-cleaner/favorite.png",
    "6ヶ月アクセスがないスター付きファイル",
    "showStarFiles",
    TOPPAGE_COLOR_CODE
  ));
  // 「使い方」へのリンクボタン
  mainMenuSection.addWidget(createLinkBtn(
    "使い方",
    "https://sites.google.com/yoshidumi.co.jp/yoshidumi-app-gallery/apps/drive-cleaner",
    "https://storage.googleapis.com/untitled-cleaner/question.png",
    "ツールの使い方を学ぶ",
    TOPPAGE_COLOR_CODE
  ));
}

/**
 * アドオンのトップページ(メインメニュー)を構築する関数。
 * @return {Card} トップページカードを返します。
 */
function buildHomepage() {
  // メインメニュー用のカードセクションを生成
  const mainMenuSection = CardService.newCardSection();
  
  // メインメニューにボタンを追加
  addMainMenu(mainMenuSection);
  
  // カードヘッダーとメニューセクションを配置したカードを返す
  return CardService.newCardBuilder()
    .setHeader(createCardHeader('', 'ファイルは定期的に削除しよう'))
    .addSection(mainMenuSection)
    .build();
}

/**
 * ボタン用の DecoratedText ウィジェットを簡単に作成する関数。
 * 
 * @param {string} text - ボタンに表示するテキスト
 * @param {string} [iconUrl=null] - アイコンとして表示するURL
 * @param {string} [label=null] - ボタン下部に表示するラベル
 * @param {string} colorCode - テキスト色
 * @return {DecoratedText} ボタン用ウィジェットを返します。
 */
function createBtn(text, iconUrl = null, label = null, colorCode) {
  let button = CardService.newDecoratedText();
  if (iconUrl) {
    button.setIconUrl(iconUrl);
  }
  if(label) {
    button.setBottomLabel(label);
  }
  // text を <font> タグを用いて指定した色で表示する
  button.setText(`<font color="${colorCode}">${text}</font>`);
  return button;
}

/**
 * 単純なテキストメッセージだけを表示するカードを生成する関数。
 * 
 * @param {string} message - 表示したいテキスト
 * @return {Card} 生成したカードを返します。
 */
function buildTextOnlyPage(message) {
  return CardService.newCardBuilder()
    .addSection(createMessageSection(message))
    .build();
}

/**
 * テキストを表示するためのカードセクションを生成する関数。
 * 
 * @param {string} message - 表示したいメッセージ
 * @return {CardSection} テキストのみを表示するカードセクションを返します。
 */
function createMessageSection(message) {
  let section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph().setText(message)
  );
  return section;
}

/**
 * Googleドライブ以外の場所でアドオンが実行された際に表示するカード。
 * @return {Card} 通知用のカードを返します。
 */
function noticeOnlyDrive() {
  return buildTextOnlyPage("このAddonはGoogle Driveを開いてる時のみ使えます。");
}

/**
 * 外部リンクを開くボタンウィジェットを作成する関数。
 * 
 * @param {string} text - ボタン表示テキスト
 * @param {string} url - 開くリンク
 * @param {string} [iconUrl=null] - アイコンURL
 * @param {string} [label=null] - ボタンの下に表示するテキスト
 * @param {string} colorCode - ボタンテキスト色
 * @return {DecoratedText} 外部リンクを開くボタンウィジェットを返します。
 */
function createLinkBtn(text, url, iconUrl = null, label = null, colorCode) {
  let button = createBtn(text, iconUrl, label, colorCode);
  button.setOpenLink(CardService.newOpenLink().setUrl(url));
  return button;
}

/**
 * ボタンクリック時に指定した関数を呼び出すボタンウィジェットを作成する関数。
 * 
 * @param {string} text - ボタン表示テキスト
 * @param {string} [iconUrl=null] - アイコンURL
 * @param {string} [label=null] - ボタンの下に表示するテキスト
 * @param {string} functionName - ボタンクリック時に呼び出す関数名
 * @param {string} colorCode - ボタンテキスト色
 * @return {DecoratedText} 作成したボタンウィジェットを返します。
 */
function createActionBtn(text, iconUrl = null, label = null, functionName, colorCode) {
  let button = createBtn(text, iconUrl, label, colorCode);
  button.setOnClickAction(
    CardService.newAction().setFunctionName(functionName)
  );
  return button;
}

/**
 * 処理結果やメッセージを表示し、トップメニューへのボタンをつけたカードを返す関数。
 * 
 * @param {string} title - カードのヘッダーに表示するタイトル
 * @param {string} message - 表示するメッセージ
 * @return {Card} メッセージとトップメニュー戻りボタンを含むカードを返す。
 */
function showMessageAndTopMenu(title, message) {
  return CardService.newCardBuilder()
    .setHeader(createCardHeader(
      title,
      '',
      'https://storage.googleapis.com/untitled-cleaner/untitled-cleaner.png')
    )
    .addSection(createMessageSection(message))
    .addSection(createTopMenuSection())
    .build();
}

/**
 * 「トップに戻る」ボタンのみを配置したカードセクションを生成する関数。
 * 
 * @return {CardSection} トップページへのボタンを含むカードセクションを返します。
 */
function createTopMenuSection() {
  const section = CardService.newCardSection();
  section.addWidget(createActionBtn(
    "トップに戻る",
    "https://storage.googleapis.com/untitled-cleaner/back.png",
    "",
    "buildHomepage",
    ITEM_COLOR_CODE
  ));
  return section;
}

/**
 * カードのヘッダー(タイトル、サブタイトル、アイコン)を作成する関数。
 * 
 * @param {string} title - カードヘッダータイトル
 * @param {string} subtitle - カードヘッダーサブタイトル
 * @param {string} [imgUrl=null] - ヘッダーに表示するアイコンURL
 * @return {CardHeader} 生成したカードヘッダーを返します。
 */
function createCardHeader(title, subtitle, imgUrl = null) {
  let cardHeader = CardService.newCardHeader()
    .setTitle(title);
  cardHeader.setSubtitle(subtitle);
  if (imgUrl) {
    cardHeader.setImageUrl(imgUrl);
  }
  return cardHeader;
}

/**
 * 日付オブジェクトを整形して「YYYY-MM-DD」の文字列に変換する関数。
 * 
 * @param {Date} date - 日付オブジェクト
 * @return {string} 整形された日付文字列
 */
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  // 今回は時刻不要のためコメントアウトしています
  // const hours = ('0' + date.getHours()).slice(-2);
  // const minutes = ('0' + date.getMinutes()).slice(-2);
  // const seconds = ('0' + date.getSeconds()).slice(-2);
  
  return `${year}-${month}-${day}`;
}

/**
 * 現在の日付から6ヶ月前の日付をISO文字列(例: 2023-03-01T00:00:00.000Z)で返す関数。
 * クエリに利用するための形式です。
 * 
 * @return {string} 6ヶ月前を示すISO文字列
 */
function createSixMonthsAgoAsString() {
  var currentDate = new Date();
  // 現在の月から-6ヶ月して新たにDateを生成
  var sixMonthsAgo = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
  
  return sixMonthsAgo.toISOString();
}

/**
 * バイト数を適切な単位(Byte, KB, MB, GB, TB)に変換して文字列で返す関数。
 * 
 * @param {number} bytes - ファイルサイズ(バイト)
 * @return {string} 単位付のサイズ文字列
 */
function bytesToSize(bytes) {
  // undefined や null の場合は '----' を返す
  if(!bytes) return '----';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  // 対数を使ってどのくらいの単位かを算出
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  // 小数点以下2桁までにして返す
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
