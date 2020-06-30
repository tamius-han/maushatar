export default {
  // BASIC DISCORD BOT CONFIGURATION 
  //
  // bot will respond to commands that start with these characters
  prefixes: [":logger", ":l"],
  // discord token
  token: "INSERT_DISCORD_TOKEN_HERE",


  // this block handles settings related to recording voice with intent
  // of having it stored permanently. If deepSpeech/STT is enabled, 
  // a separate recording will be made in .pcm format
  enableRecording: true,
  recordingFormat: 'opus',
  voiceRecordingDir: '/PATH/TO/FOLDER',

  // bot _must_ play a sound file when joining a channel, otherwise
  // voice recordings cannot be made.
  playOnJoin: '/path/to/file',

  // Speech-to-text settings
  //
  // enableSTT options:
  //  * false: no STT
  //  * 'deepspeech': use Mozilla DeepSpeech
  //  * 'julius':     use julius
  enableSTT: false,

  // post trasncription to this channel
  // leave empty to post in channel the bot was given command in
  // set to false (boolean) to disable stt sending
  sttChannel: 'channel-name-without-hash',

  // Directory in which voice recordings will be kept.
  // can be same folder as voiceRecordingsDir, but only if recordingFormat
  // is opus.
  STTRecordingDir: '/PATH/TO/FOLDER',
  
  // Directory in which temporary files for STT processing will be kept
  // (if there will be any)
  STTTmpDir: '/PATH/TO/FOLDER',
  
  // if set to 'false', recordings will be deleted as soon as STT is complete.
  // this value controls deletion of 32bit PCMs discord makes
  persistSTTRecordings: false,
  // this value controls deletion (or rather, persistance) of 16bit PCMs we 
  // generate. This option is generally intended for debugging.
  persistSTTIntermediaries: false,


  // DeepSpeech related settings
  //
  // if enableDeepSpeech is disabled, this can be anything as long as it's not missing
  deepspeechModelDir: '/PATH/TO/TRAINED/model.pbmm',

  // julius-related settings
  juliusBinaryDir: '',    // julius executable
  juliusDnnDir: '',       // folder with julius models. Julius is started in this directory.
  juliusJconfDir: '',     // julius jconf file
  juliusDnnJconfDir: '',  // julius dnn jconf file
}
