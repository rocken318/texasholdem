export type Lang = 'en' | 'ja'

export const T = {
  en: {
    // Home page
    enterCode: 'ENTER CODE',
    joinGame: 'Join Game',
    createRoom: 'Create Room',
    // Create page
    createRoomTitle: 'Create Room',
    yourName: 'Your name',
    displayName: 'Display name',
    format: 'Format',
    cash: 'Cash',
    tournament: 'Tournament',
    maxPlayers: 'Max Players',
    startingChips: 'Starting Chips',
    smallBlind: 'Small Blind',
    bigBlind: 'Big Blind',
    turnTimerSec: 'Turn Timer (sec)',
    joinAsPlayer: 'Join as player (not just host)',
    creating: 'Creating...',
    enterYourName: 'Enter your name',
    // Name input
    joinTable: 'Join Table',
    namePlaceholder: 'Your name',
    sitDown: 'Sit Down',
    joining: 'Joining...',
    // Lobby
    waitingForPlayers: 'Waiting for players...',
    players: 'Players',
    you: 'you',
    blinds: 'Blinds',
    startingChipsLabel: 'Starting chips',
    turnTimer: 'Turn timer',
    startGame: 'Start Game ▶',
    needMorePlayers: 'Need at least 2 players to start',
    // Game
    fold: 'Fold',
    check: 'Check',
    call: 'Call',
    raise: 'Raise',
    allIn: 'All In',
    // Result
    gameOver: 'Game Over',
    newGame: 'New Game',
    // Lang toggle
    switchLang: '日本語',
  },
  ja: {
    // Home page
    enterCode: 'コードを入力',
    joinGame: 'ゲームに参加',
    createRoom: 'ルームを作成',
    // Create page
    createRoomTitle: 'ルームを作成',
    yourName: 'あなたの名前',
    displayName: '表示名',
    format: 'フォーマット',
    cash: 'キャッシュ',
    tournament: 'トーナメント',
    maxPlayers: '最大人数',
    startingChips: 'スタートチップ',
    smallBlind: 'スモールブラインド',
    bigBlind: 'ビッグブラインド',
    turnTimerSec: 'ターンタイマー（秒）',
    joinAsPlayer: 'プレイヤーとして参加（ホストのみでなく）',
    creating: '作成中...',
    enterYourName: '名前を入力してください',
    // Name input
    joinTable: 'テーブルに参加',
    namePlaceholder: 'あなたの名前',
    sitDown: '着席する',
    joining: '参加中...',
    // Lobby
    waitingForPlayers: 'プレイヤーを待っています...',
    players: 'プレイヤー',
    you: 'あなた',
    blinds: 'ブラインド',
    startingChipsLabel: 'スタートチップ',
    turnTimer: 'ターンタイマー',
    startGame: 'ゲーム開始 ▶',
    needMorePlayers: '開始には最低2人必要です',
    // Game
    fold: 'フォールド',
    check: 'チェック',
    call: 'コール',
    raise: 'レイズ',
    allIn: 'オールイン',
    // Result
    gameOver: 'ゲーム終了',
    newGame: '新しいゲーム',
    // Lang toggle
    switchLang: 'English',
  },
} as const

export type Translations = (typeof T)[Lang]
