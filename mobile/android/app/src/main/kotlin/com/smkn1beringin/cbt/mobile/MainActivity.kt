package com.smkn1beringin.cbt.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.smkn1beringin.cbt/kiosk"
    private var mediaPlayer: MediaPlayer? = null
    private var isScreenOff = false

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_SCREEN_OFF) {
                isScreenOff = true
                // Jika layar dimatikan (tombol power), pastikan sirine TIDAK bunyi
                stopEmergencySiren()
            } else if (intent?.action == Intent.ACTION_SCREEN_ON) {
                isScreenOff = false
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        }
        registerReceiver(screenReceiver, filter)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // Anti-Cheating: Blokir Screenshot dan Screen Recording secara native di Android
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)

        // Anti-Cheating: Kiosk Mode dan Emergency Siren Alarm
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startLockTask" -> {
                    try {
                        startLockTask()
                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        result.success(true)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "stopLockTask" -> {
                    try {
                        stopLockTask()
                        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        result.success(true)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "isScreenInteractive" -> {
                    try {
                        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
                        val interactive = pm.isInteractive && !isScreenOff
                        result.success(interactive)
                    } catch (e: Exception) {
                        result.success(true)
                    }
                }
                "startAlarm" -> {
                    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
                    // HANYA bunyikan sirine jika layar masih menyala (siswa lolos keluar aplikasi ke Home/App lain)
                    if (pm.isInteractive && !isScreenOff) {
                        startEmergencySiren()
                        result.success(true)
                    } else {
                        result.success(false)
                    }
                }
                "stopAlarm" -> {
                    stopEmergencySiren()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun startEmergencySiren() {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager

        // 1. Unmute dan paksa volume STREAM_ALARM & STREAM_MUSIC ke 100% (Maksimal)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try { audioManager.adjustStreamVolume(AudioManager.STREAM_ALARM, AudioManager.ADJUST_UNMUTE, 0) } catch (_: Exception) {}
                try { audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_UNMUTE, 0) } catch (_: Exception) {}
            }
            val maxAlarm = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            try { audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxAlarm, AudioManager.FLAG_SHOW_UI) } catch (_: Exception) {}
            val maxMusic = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            try { audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxMusic, AudioManager.FLAG_SHOW_UI) } catch (_: Exception) {}
        } catch (_: Exception) {}

        // 2. Mainkan Getaran Keras Beruntun
        try {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            val pattern = longArrayOf(0, 500, 200, 500, 200, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, 0)
            }
        } catch (_: Exception) {}

        // 3. Putar File Audio Sirine Asli (R.raw.siren) via MediaPlayer di Channel ALARM
        try {
            if (mediaPlayer == null) {
                val afd = resources.openRawResourceFd(R.raw.siren)
                if (afd != null) {
                    mediaPlayer = MediaPlayer().apply {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            setAudioAttributes(
                                AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_ALARM)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                    .build()
                            )
                        } else {
                            @Suppress("DEPRECATION")
                            setAudioStreamType(AudioManager.STREAM_ALARM)
                        }
                        setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                        afd.close()
                        isLooping = true
                        prepare()
                    }
                } else {
                    mediaPlayer = MediaPlayer.create(this, R.raw.siren)?.apply {
                        isLooping = true
                    }
                }
            }
            mediaPlayer?.setVolume(1.0f, 1.0f)
            if (mediaPlayer?.isPlaying == false) {
                mediaPlayer?.start()
            }
        } catch (e: Exception) {
            try {
                mediaPlayer = MediaPlayer.create(this, R.raw.siren)?.apply {
                    isLooping = true
                    start()
                }
            } catch (_: Exception) {}
        }
    }

    private fun stopEmergencySiren() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.reset()
                it.release()
            }
            mediaPlayer = null
        } catch (_: Exception) {}

        try {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            vibrator.cancel()
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(screenReceiver)
        } catch (_: Exception) {}
        stopEmergencySiren()
        super.onDestroy()
    }
}
