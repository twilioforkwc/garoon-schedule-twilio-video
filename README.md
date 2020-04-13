# はじめに

本記事は、サイボウズ社の中堅、大企業向けグループウェアである「[Garoon（ガルーン）](https://garoon.cybozu.co.jp/)」の予定詳細画面上にTwilio Videoのコンポーネントを組み込むことで、ガルーンの画面上で最大4名のテレビ会議を実装する方法になります。

![スクリーンショット 2020-04-07 15.30.20.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/f99455f2-1b72-1af4-aa50-fcd9dc8f53cc.png)

市販のテレビ会議ソフトのような機能はありませんが、Garoonの予定詳細画面を開いて参加ボタンを押すだけで会議ができるシンプルさが特長になっています。

## Programmable Videoとは

### Programmable Video

- WebRTCをベースに構築された音声・動画・データ通信サービス
- JavaScript SDK / iOS SDK / Android SDKを提供
 - **JavaScript SDKを使うことでGaroon上でビデオが利用可能**
- アクセストークンを使った認証
- ルームベースでの実装（呼び出し機能はありません）
- 「ピアツーピア（P2P）ルーム」と、SFUベースの「グループルーム」「スモールグループルーム」の3種類が利用可能
- ピアツーピアルームは最大10名まで、スモールグループルームは最大4名まで、グループルームは最大50名までの参加者を収容可能
- TURN/STUNサービスも提供
- 画面共有に対応（ChromeとFirefoxのみ）
- 録画機能に対応（グループルーム、スモールグループのみ）
- メディアコーデックには、Opus（音声）、VP8 / H.264（映像）に対応

---
### Twilio Video SDKが対応するブラウザ

|  | CHROME | MS EDGE | FIREFOX | SAFARI |
|:--|:--|:--|:--|:--|
| Android | ✓ | - | ✓ | - |
| iOS | * | - | * | ✓ |
| Linux | ✓ | - | ✓ | - |
| macOS | ✓ | - | ✓ | ✓ |
| Windows | ✓ | ✘ | ✓ | - |

- EDGEは現時点で非対応
- iOSのChromeとFirefoxでは、WebRTC APIにはアクセスできません。

---
### Video APIの認証

- Twilio VideoのAPIにアクセスするためにはアクセストークンが必要
- アクセストークンは、以下の情報を使って動的に生成
 - ACCOUNT SID （Twilioのアカウントに紐付いたID）
 - API KEY
 - API SECRET
 - IDENTITY （セッション中にユーザを識別するための値）
- アクセストークンに対して、接続可能なルームを埋め込むことが可能
- API経由で生成する他、管理コンソール上でも生成が可能

---
# 実装方法

## 準備するもの

- Twilioアカウント（トライアルアカウントでも可）
- Garoonの管理者アカウント
- Chromeブラウザが動作するPC
- ビデオカメラとマイク、スピーカー

Twilioのアカウント取得については、[こちらの記事](https://qiita.com/mobilebiz/items/932eb21ff6ed36f524d8)を御覧ください。

## 事前に調べておくもの

- GaroonのAPP URI　例：xxxxxx.cybozu.com

## 作業手順

一連の作業は以下のとおりです。

1. Twilioの管理コンソールにログインする
2. Twilio Videoの設定を行う
3. Twilio VideoでAPIキーとシークレットを取得する
4. TwilioのRuntime環境を構築する
5. TwilioのFunctionsにプログラムの実装する
6. Garoon上でJS/CSSの設定を行う
7. Garoon上で施設の登録を行う

## Twilio管理コンソールにログイン

### 手順1. Twilioの管理コンソールにログインします。

- ブラウザで[ログイン画面](https://jp.twilio.com/login/kddi-web)を表示し、事前に取得したIDとパスワードでログインをします。

![スクリーンショット 2018-05-04 10.13.08.png](https://qiita-image-store.s3.amazonaws.com/0/86046/c0111212-a218-c0f9-9fcb-8838ca68ec84.png)

### 手順2. Twilio Videoの設定を行う

- Twilioの管理コンソールにログインします。
- 左側のメニューボタン（ボタンのようなアイコン）をクリックし、スライドしたメニューから**Programmable Video**を選択します。
- **Rooms（部屋）**を選択し、さらに**Settings（設定）**を選びます。
- **Room Topology**の中の**ROOM TYPE**リストから「Group-Small」を選択します。
- **VIDEO CODEC**は「VP8 & H.264」を選択します。
- **RECORDING**は「DISABLED」を選択します。
- **MAXIMUM PARTICIPANTS**は「4」とします。
- **MEDIA REGION**のプルダウンから「Japan - jp1」を選択します。

![スクリーンショット 2020-04-07 16.30.03.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/b02f8510-4fee-e77e-0494-da11dcec98f5.png)

- **Save**ボタンを押します。

### 手順3. Twilio VideoでAPIキーとシークレットを取得する

- スライドメニューから**Programmable Video**を選択します。
- Videoのサブメニューから**ツール**を選択し、さらに**API Keys**を選択します。
- **新しいAPIキーを生成する**を押して、新しいAPIキーを生成します。
- **わかりやすい名前**欄に、「Video」と入力します。キータイプはそのままでOKです。

<img width="899" alt="スクリーンショット 2018-10-25 05.28.39.png" src="https://qiita-image-store.s3.amazonaws.com/0/86046/6ad8f81d-6064-16a9-4bbd-43f64127fdbc.png">

- **APIキーを生成する**ボタンを押します。

![Video_API_Key.png](https://qiita-image-store.s3.amazonaws.com/0/86046/c7d3e7e5-209d-a824-2df3-0d08dc9d9ba7.png)

- 表示された**SID**と**SECRET**の値をメモ帳にコピーしておきます。
- 完了しました！のチェックをいれて、**終了**ボタンを押します。

### 手順4. TwilioのRuntime環境を構築する

- スライドメニューの**RUNTIME**から、**Functions**を選択します。
- **Configure（設定）**を選択します。
- **Enable ACCOUNT_SID and AUTH_TOKEN**のチェックボックスをONにします。

<img width="325" alt="スクリーンショット 2018-10-25 05.26.06.png" src="https://qiita-image-store.s3.amazonaws.com/0/86046/f9f0bc34-c66f-6a05-0230-b994540f2927.png">

- **Environmental Variables**の赤いアイコンを3回クリックして、3つの行を生成します。
- 各行に以下の内容を設定します。

KEY|VALUE
:--|:--
GAROON_APP_URI|事前に調べておいたGaroonのAPP_URI（xxxxxx.cybozu.com）
TWILIO_VIDEO_KEY|VideoのAPIキーのSID文字列
TWILIO_VIDEO_SECRET|SIDに対応したSECRET文字列

![スクリーンショット 2020-04-07 16.35.02.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/78ed16c1-2000-887a-145c-32218223fa33.png)

- **Dependencies**のtwilioのバージョンを「3.29.2」に変更します。

![スクリーンショット 2020-04-07 16.36.23.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/867ce804-9f5f-3ef5-dfb1-13730f1f5b24.png)

- **SAVE**ボタンを押して、設定を保存します。

### 手順5. TwilioのFunctionsにプログラムの実装する

- スライドメニューの**RUNTIME**から、**Functions**の**Manage（管理）**を選択します。
- 赤いプラスアイコンをクリックするか、**Create a new function**を選択して、新しいFunctionを作成します。
- **New Function**ダイアログでは、**Blank**を選択し、**Create**ボタンを押します。
- **FUNCTION NAME**欄に「VideoToken」、**PATH**欄に「/video-token」と入力します。
- **ACCESS CONTROL**のチェックボックスを外します。

![スクリーンショット 2020-04-07 16.39.01.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/b728aa70-e380-3ae9-babf-519b170a228b.png)

- **CODE**欄に予め書かれているコードをすべて削除し、以下のコードを貼り付けます。

```javascript
exports.handler = function(context, event, callback) {
    const response = new Twilio.Response();
    response.appendHeader('Access-Control-Allow-Origin', 'https://'+context.GAROON_APP_URI);

    const IDENTITY = event.identity || '';
    if (IDENTITY === '') callback(new Error(`Parameter 'identity' was not set.`));

    const roomName = event.room || '';
    if (roomName === '') callback(new Error(`Parameter 'room' was not set.`));

    const ACCOUNT_SID = context.ACCOUNT_SID;
    const API_KEY = context.TWILIO_VIDEO_KEY;
    const API_SECRET = context.TWILIO_VIDEO_SECRET;

    const AccessToken = Twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const videoGrant = new VideoGrant({
        room: roomName
    });

    const accessToken = new AccessToken(
        ACCOUNT_SID,
        API_KEY,
        API_SECRET
    );

    accessToken.addGrant(videoGrant);
    accessToken.identity = IDENTITY;

    response.appendHeader('Content-Type', 'application/json');
    response.setBody({
        token: accessToken.toJwt()
    });
    callback(null, response);
};
```

- **SAVE**ボタンを押して、コードを保存します。
- しばらくすると、デプロイ完了の緑色のバナーが表示されます。
- 画面上の**PATH**の部分に表示されているURL(`https://xxxxxxxx-xxxxx-xxxx.twil.io`）をメモ帳に控えておいてください。

![Function_Path.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/6bd5d59f-cc69-fdf7-2e64-5f18239e4999.png)

以上でTwilio側の設定は終了です。このあとはGaroonの設定を行っていきます。

### 手順6. Garoon上でJS/CSSの設定を行う

まずはGaroonに組み込むJSファイルと、CSSファイルをダウンロードします。

以下のGitHubから「twilioVideo.js」ファイルをダウンロードしてください。
https://github.com/twilioforkwc/garoon-schedule-twilio-video
以下のGitHubから「grn_kit.css」ファイルをダウンロードしてください。
https://github.com/garoon/css-for-customize

- ダウンロードした`twilioVideo.js`をエディタで開きます。
- 13行目にある以下の行の`xxxxxxxxx-xxxxx-xxxx`の部分を、先程控えておいたFunctionのPATHに置き換えてください。

```javascript
const TWILIO_DOMAIN = 'xxxxxxxxx-xxxxx-xxxx.twil.io'; // xxxxxxx-xxxxxxx-xxxx.twil.io
```

では次に、このJSのファイルをGaroonに組み込んでいきます。

<font color='red'>ここからの作業は、Garoonの管理者権限をもったユーザが行う必要があります。</font>

- Garoonを開きます。
- 右上の歯車アイコンをクリックして、**Garoonシステム管理**を選択します。
![Garoon_Garoonシステム管理選択.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/99094891-2c35-bf81-a751-dee5d2a66f7b.png)

- 左側の一覧から**スケジュール**を選択し、**JavaScript / CSSによるカスタマイズ**をクリックします。
![Garoon_JavaScriptCSS選択.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/7ec6b173-bf4c-8e3d-9b01-01bc9f7ba31d.png)

- **カスタマイズグループを追加する**というリンクをクリックします。
- 以下の内容を登録していきます。

項目名|説明
:--|:--
カスタマイズ|**適用する**を選択します
カスタマイズグループ名|「TwilioVideo」と入力します
適用対象|**変更する**を選択して、このビデオを利用するユーザをすべて追加します。

JavaScriptカスタマイズには、以下の並び順でリンクとJSファイルを登録します。

順番|適用するファイルおよびリンク
:--|:--
1|https://unpkg.com/axios/dist/axios.min.js
2|https://media.twiliocdn.com/sdk/js/video/releases/2.2.0/twilio-video.min.js
3|twilioVideo.js （先程ダウンロードしたもの）

CSSカスタマイズには、先程ダウンロードした`grn_kit.css`を登録してください。

![スクリーンショット 2020-04-08 16.44.43.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/db40b102-f8c8-6a05-a77d-3be0eb11829d.png)

- **追加する**ボタンを押して設定を保存します。

7. Garoon上で施設の登録を行う

- システム管理（各アプリケーション）に戻り、左側のスケジュールを選択します。
- **施設/施設グループ**を選択します。
![Garoon_施設選択.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/f86c30a3-edf8-4e06-c278-bda7c7f5f9c2.png)

- **施設を追加する**リンクをクリックします。
- 以下の内容を追加します。

項目名|説明
:--|:--
施設名|**標準**に「TwilioVideo」と入力します
施設コード|「TwilioVideo」と入力します
メモ|「Room:Room」と入力します（大文字小文字に注意してください）。

![スクリーンショット 2020-04-08 16.53.32.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/844c96e0-eee3-beaa-d793-043cc4b0ba68.png)

- **追加する**ボタンを押します。

施設が登録されたら、一通りの設定はすべて終了です。

## テスト

Garoon上で予定を登録します。
その際に、施設の一覧から「TwilioVideo」を選択しておきます。

![スクリーンショット 2020-04-08 16.55.52.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/943b9e91-6e6e-ea7a-a1a5-1b8900a8f7f6.png)

作成した予定の詳細画面上で、自分の姿が映れば成功です。
※最初のアクセス時は、カメラとマイクのアクセス確認が表示されますので、**許可**を選択してください。
![スクリーンショット 2020-04-08 16.58.59.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/637883c7-a265-9396-8c34-1c7dcbcb2fd8.png)

実際に会議を始めるときは、**参加**ボタンを押します。
会議を終了するときは、**退出**ボタンを押します。

# まとめ

冒頭にも書きましたが、市販のビデオ会議サービスなどに比べると機能もほとんどなく、シンプルな作りになっていますので、設定さえ間違えなければ誰でもすぐに使い始めることができると思います。

ちなみにこのシステムにかかる料金を最後のご紹介しておきます。
今回は、最大４名までのSmall-Video Roomを使っているため、１参加者あたり0.61111円/分が課金されます。
たとえば、30分のミーティングを4名で行った場合、単純に計算すると73.3332円となります。
基本料などはなく、完全従量制です。

---
### Twilio（トゥイリオ）とは

https://cloudapi.kddi-web.com
Twilioは音声通話、メッセージング（SMS/チャット）、ビデオなどの 様々なコミュニケーション手段をアプリケーションやビジネスへ容易に組み込むことのできるクラウドAPIサービスです。初期費用不要な従量課金制で、各種開発言語に対応しているため、多くのハッカソンイベントやスタートアップなどにも、ご利用いただいております。



