/*
 * Twilio video information sample.
 * Copyright (c) 2020 KDDI Web Communications Inc.
 *
 * Licensed under the MIT License
*/
(() => {
  'use strict';

  const PREFIX_ROOM_NAME = 'Room:';

  // 以下の内容は、ご自分のTwilioの環境にあわせて変更してください。
  const TWILIO_DOMAIN = 'xxxxxxxxx-xxxxx-xxxx.twil.io'; // xxxxxxx-xxxxxxx-xxxx.twil.io

  let eventId, roomName, videoRoom, localStream;

  /**
   * 画面文言の言語設定
   */
  const i18n = {
    en: {
      TWILIO_VIDEO_MEETING: 'Twilio Video Meeting',
      TWILIO_VIDEO_CONNECTING: 'Video conferencing terminal',
      TWILIO_VIDEO_BUTTON_LABEL_JOIN: 'Join',
      TWILIO_VIDEO_BUTTON_LABEL_LEAVE: 'Leave',
      FACILITY: 'Facilities'
    },
    ja: {
      TWILIO_VIDEO_MEETING: 'TwilioVideo会議室',
      TWILIO_VIDEO_CONNECTING: 'ビデオ会議端末の接続先',
      TWILIO_VIDEO_BUTTON_LABEL_JOIN: '参加',
      TWILIO_VIDEO_BUTTON_LABEL_LEAVE: '退出',
      FACILITY: '施設'
    },
    zh: {
      TWILIO_VIDEO_MEETING: 'Twilio Video Meeting',
      TWILIO_VIDEO_CONNECTING: 'Video conferencing terminal',
      TWILIO_VIDEO_BUTTON_LABEL_JOIN: 'Join',
      TWILIO_VIDEO_BUTTON_LABEL_LEAVE: 'Leave',
      FACILITY: '设备'
    }
  };

  /**
   * ログインユーザーのログイン名を取得する
   * @return {string} ログインユーザのログイン名
   */
  const getUserId = (() => {
    return garoon.base.user.getLoginUser().code;
  });

  /**
   * ログインユーザーの言語設定に合わせた文言を取得する
   * @return {string} ログインユーザの言語設定に合わせた文言
   */
  const getLocalization = (() => {
    const localization = garoon.base.user.getLoginUser().language;
    return i18n[localization];
  });

  /**
   * 予定の詳細画面の表に挿入する行の内容を作成する
   * @return {Object} 行テンプレート
   */
  const createTwilioVideoInfoTemplate = (() => {
    let self = {};

    const videoContent = document.createElement('div');
    videoContent.id = 'twilio-video-content';
    videoContent.innerHTML = '' +
      '<video id="my-stream" height="240px" autoplay muted></video>' +
      '<button id="twilio-video-btn" class="button_normal_sub_grn_kit"></button>';
    self.el = videoContent;

    self.setTextContent = ((elementId, value) => {
      self.el.querySelector('#' + elementId).textContent = value;
    });

    return self;
  });

  /**
   * 参加ボタンが押されたら、アクセストークンの取得して、ルームに接続
   */
  const joinConference = (async () => {
    // アクセストークンを取得
    const identity = await getUserId();
    axios.get(`https://${TWILIO_DOMAIN}/video-token?identity=${identity}&room=${roomName}`)
    .then(async body => {
        console.log(body.data.token);

        // ルームに接続
        Twilio.Video.connect(body.data.token, {name: roomName})
        .then(room => {
            console.log(`Connected to Room ${room.name}`);

            videoRoom = room;

            // すでに接続している参加者を追加
            room.participants.forEach(participantConnected);

            room.on('participantConnected', participantConnected);
            room.on('participantDisconnected', participantDisconnected);
            room.once('disconnected', error => room.participants.forEach(participantDisconnected));
        }).catch(error => {
            console.log(error);
        });
    });

  });

  /**
   * 退出ボタンが押されたときにルームから抜ける
   */
  const leaveConference = (() => {
    videoRoom.disconnect();
    console.log(`Disconnected to Room ${roomName}`);
    return true;
  });

  /**
   * 参加者が入室したときに、新しくVideoエレメントを作成し画面に表示
   * @param {Object} participant 参加してきたユーザオブジェクト
   */
  const participantConnected = (participant => {
    console.log(`Participant ${participant.identity} connected'`);

    const videoDom = document.createElement('div');
    videoDom.id = participant.sid;
    videoDom.className = 'videoDom';
    videoDom.style.float = 'left';
    participant.on('trackSubscribed', track => trackSubscribed(videoDom, track));
    participant.on('trackUnsubscribed', track => trackUnsubscribed(track));
    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        trackSubscribed(videoDom, publication.track);
      }
    });

    // videoタグに追加
    document.getElementById('twilio-video-content').appendChild(videoDom);

  });

  /**
   * 参加者が退出したときに、退出した人のVideoエレメントを削除
   * @param {Object} participant 退出したユーザオブジェクト
   */
  const participantDisconnected = (participant => {
    console.log(`Participant ${participant.identity} disconnected.`);

    document.getElementById(participant.sid).remove();
  });

  // トラックを追加します
  const trackSubscribed = ((videoDom, track) => {
    let child = videoDom.appendChild(track.attach());
    if (track.kind == 'video') {
      child.style.width = '320px';
      child.style.height = '240px';
    }
  });

  // トラックを削除します
  const trackUnsubscribed = (track => {
    track.detach().forEach(element => element.remove());
  });

  /**
   * Twilio Videoエレメントを行テンプレートにバインドし、予定の詳細画面に行を挿入する
   * @param {Object} twilioVideoInfo twilioVideo ミーティングルーム情報
   */
  const showTwilioVideoInfo = (twilioVideoInfo => {
    const localization = getLocalization();
    const twilioVideoInfoTemplate = createTwilioVideoInfoTemplate();

    // ボタンラベルの文言
    twilioVideoInfoTemplate.setTextContent('twilio-video-btn', localization.TWILIO_VIDEO_BUTTON_LABEL_JOIN);

    // 「参加者」行の下に行を挿入する
    garoon.schedule.event.insertTableRow(localization.TWILIO_VIDEO_MEETING, twilioVideoInfoTemplate.el, 'ATTENDEES');

    // ボタンのクリックイベントを割り当て
    const btn = document.querySelector('#twilio-video-btn');
    btn.addEventListener('click', () => {
      if (btn.innerHTML.indexOf(localization.TWILIO_VIDEO_BUTTON_LABEL_JOIN) !== -1) {
        console.log(`Joining...`);
        btn.innerHTML = localization.TWILIO_VIDEO_BUTTON_LABEL_LEAVE;
        joinConference();
      } else {
        console.log(`Leaving.`);
        btn.innerHTML = localization.TWILIO_VIDEO_BUTTON_LABEL_JOIN;
        leaveConference();
      }
    });

    // プレビュー画面の表示
    navigator.mediaDevices.getUserMedia({video: true, audio: true})
      .then(stream => {
        document.querySelector('#my-stream').srcObject = stream;
        localStream = stream;
      })
      .catch(error => {
        console.error(`mediaDevice.getUserMedia() error: ${error}`);
      });
  });

  /**
   * 施設情報の「メモ」から TwilioVideo 情報の項目の値を取得する
   * @param {string} notes 施設情報の「メモ」
   * @param {string} columnPrefix TwilioVideo 情報の項目名
   * @return {string} TwilioVideo 情報の項目
   */
  const getTwilioVideoValue = ((notes, columnPrefix) => {
    const notesAfterFilter = notes.filter((note => {
      return (note.lastIndexOf(columnPrefix, 0) === 0);
    }));

    const firstNote = notesAfterFilter[0];
    if (firstNote && firstNote.length > 0) {
      return firstNote.slice(columnPrefix.length);
    }
    return null;
  });

  /**
   * 施設情報の「メモ」から TwilioVideo 情報を取得する
   * @param {string} facilityNote 施設情報の「メモ」
   * @return {Object} 施設情報の「メモ」から取得したTwilioVideo 情報
   */
  const getFacilityTwilioVideoInfo = (facilityNote => {
    const twilioVideoInfo = {
      roomName: null,
    };

    const notes = facilityNote.split(/\r?\n/g);
    twilioVideoInfo.roomName = roomName = `${getTwilioVideoValue(notes, PREFIX_ROOM_NAME)}_${eventId}`;

    if (twilioVideoInfo.roomName == null) {
        return null;
    }

    return twilioVideoInfo;
  });

  /**
   * 施設コードが一致する施設情報の「メモ」を取得する
   * @param {string} facilityCode 施設コード
   * @param {Array<Object>} allFacilities 全施設一覧
   * @return {string} 施設コードに一致する施設情報の「メモ」
   */
  const getFacilityNote = ((facilityCode, allFacilities) => {
    const targetFacilities = allFacilities.filter((facility => {
      return (facilityCode === facility.code);
    }));

    return targetFacilities[0].notes;
  });

  /**
   * Garoon の全施設情報を取得する
   * 一度に取得できる施設情報は 100 件までなので再帰呼び出しする
   * @param {Array<Object>} facilities Garoon に登録された施設情報の一覧
   * @param {number} offset offset
   * @return {Array{Object}} Garoon の全施設情報を
   */
  const getAllFacilities = ((facilities, offset) => {
    let _facilities = facilities || [];
    let _offset = offset || 0;
    return garoon.api('/api/v1/schedule/facilities', 'GET', {offset: _offset}).then((resp => {
      _offset += 100;
      _facilities = _facilities.concat(resp.data.facilities);
      if (resp.data.hasNext) {
        return getAllFacilities(_facilities, _offset);
      }
      return _facilities;
    }));
  });

  /**
   * 予定に登録された施設に一致する施設の TwilioVideo 情報一覧を取得する
   * @param {Array<Object>} facilities 予定に登録された施設一覧
   * @return {Array<Object>} 定に登録された施設に一致する施設の TwilioVideo 情報一覧
   */
  const getTwilioVideoInfos = (facilities => {
    return getAllFacilities().then((allFacilities => {
      let twilioVideoInfos = [];
      facilities.forEach((facility => {
        let twilioVideoInfo = null;
        const note = getFacilityNote(facility.code, allFacilities);
        if (note === '') {
          return;
        }
        twilioVideoInfo = getFacilityTwilioVideoInfo(note);
        if (twilioVideoInfo == null) {
          return;
        }
        twilioVideoInfos.push(twilioVideoInfo);
      }));
      return twilioVideoInfos;
    }));
  });

  /**
   * 予定の詳細画面の行に TwilioVideo 情報の行を挿入する
   * @param {Array<Object>} twilioVideoInfos TwilioVideo 情報一覧
   */
  const insertTwilioVideoInfoRow = (twilioVideoInfos => {
    if (!twilioVideoInfos || twilioVideoInfos.length === 0) {
      return;
    }

    // sortTwilioVideoInfo(twilioVideoInfos);
    showTwilioVideoInfo(twilioVideoInfos[0]);
  });

  // 予定の詳細画面を開いたとき
  garoon.events.on('schedule.event.detail.show', (event => {
    // イベントIDを取得
    eventId = event.event.id || '';

    // 予定に紐づく施設情報
    const facilities = event.event.facilities;
    if (facilities == null || facilities.length === 0) {
      return;
    }

    // Garoon の施設情報を取得して、TwilioVideo 情報を表示する
    getTwilioVideoInfos(facilities)
    .then(twilioVideoInfos => {
      insertTwilioVideoInfoRow(twilioVideoInfos);
    })
    .catch(err => {
      console.log(err);
    });
  }));

})();
