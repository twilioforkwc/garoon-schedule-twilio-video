# Garoon x Twilio Videoによるビデオ会議

![スクリーンショット 2020-04-07 15.30.20.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/86046/f99455f2-1b72-1af4-aa50-fcd9dc8f53cc.png)

## 準備するもの

- Twilioアカウント（トライアルアカウントでも可）
- Garoonの管理者アカウント
- Chromeブラウザが動作するPC
- ビデオカメラとマイク、スピーカー

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

まずはアップロードするJSファイルをダウンロードします。
