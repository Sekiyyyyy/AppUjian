package com.smkn1beringin.cbt.mobile

import android.app.ActivityManager
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.smkn1beringin.cbt/kiosk"
    private var methodChannel: MethodChannel? = null
    private var mediaPlayer: MediaPlayer? = null
    private var isScreenOff = false
    private var isActivityResumed = false

    // App Pinning Tracking (Screen Pinning / LockTaskMode)
    private var isWaitingForPinApproval = false
    private var pinDialogAppeared = false
    private val pinningHandler = Handler(Looper.getMainLooper())
    private var pinCheckRunnable: Runnable? = null

    private fun isPinned(): Boolean {
        return try {
            val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
            } else {
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun isLockToAppEnabled(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val enabled = android.provider.Settings.System.getInt(
                    contentResolver,
                    "lock_to_app_enabled",
                    1
                )
                enabled != 0
            } else {
                true
            }
        } catch (_: Exception) {
            true
        }
    }

    private fun stopPinApprovalTracking() {
        isWaitingForPinApproval = false
        pinDialogAppeared = false
        pinCheckRunnable?.let { pinningHandler.removeCallbacks(it) }
        pinCheckRunnable = null
        pinningHandler.removeCallbacksAndMessages(null)
    }

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_SCREEN_OFF) {
                isScreenOff = true
                // Jika layar dimatikan (tombol power), pastikan sirine TIDAK bunyi
                stopEmergencySiren()
            } else if (intent?.action == Intent.ACTION_SCREEN_ON) {
                isScreenOff = false
            } else if (intent?.action == Intent.ACTION_USER_PRESENT) {
                isScreenOff = false
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        registerReceiver(screenReceiver, filter)
    }

    override fun onResume() {
        super.onResume()
        isActivityResumed = true
    }

    override fun onPause() {
        super.onPause()
        isActivityResumed = false
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus) {
            // Dialog sistem "Sematkan Aplikasi" muncul dan mengambil fokus jendela
            if (isWaitingForPinApproval) {
                pinDialogAppeared = true
            }
        } else {
            // Jendela aplikasi kembali mendapatkan fokus
            // HANYA proses jika dialog sistem sebelumnya telah benar-benar muncul
            if (isWaitingForPinApproval && pinDialogAppeared) {
                pinningHandler.postDelayed({
                    if (isWaitingForPinApproval) {
                        if (isPinned()) {
                            stopPinApprovalTracking()
                            methodChannel?.invokeMethod("onPinningAccepted", null)
                        } else {
                            // Siswa menekan "Tidak, terima kasih" (No thanks) atau tombol Back pada dialog
                            stopPinApprovalTracking()
                            methodChannel?.invokeMethod("onPinningRejected", "no_thanks")
                        }
                    }
                }, 400)
            }
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // Anti-Cheating: Blokir Screenshot dan Screen Recording secara native di Android
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)

        // Anti-Cheating: Kiosk Mode dan Emergency Siren Alarm
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "startLockTask" -> {
                    try {
                        if (isPinned()) {
                            stopPinApprovalTracking()
                            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                            result.success(true)
                            methodChannel?.invokeMethod("onPinningAccepted", null)
                            return@setMethodCallHandler
                        }

                        if (!isLockToAppEnabled()) {
                            stopPinApprovalTracking()
                            result.success(false)
                            methodChannel?.invokeMethod("onPinningRejected", "disabled_in_settings")
                            return@setMethodCallHandler
                        }

                        stopPinApprovalTracking()
                        isWaitingForPinApproval = true
                        pinDialogAppeared = false
                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        startLockTask()
                        result.success(true)

                        // Polling berkala (setiap 300ms): begitu siswa menekan "Mengerti" (ACC),
                        // isPinned() langsung true seketika tanpa perlu menunggu event fokus!
                        val startTime = System.currentTimeMillis()
                        val checkRunnable = object : Runnable {
                            override fun run() {
                                if (!isWaitingForPinApproval) return
                                if (isPinned()) {
                                    stopPinApprovalTracking()
                                    methodChannel?.invokeMethod("onPinningAccepted", null)
                                    return
                                }
                                // Timeout 45 detik jika dialog dibiarkan tanpa respons
                                if (System.currentTimeMillis() - startTime > 45000) {
                                    stopPinApprovalTracking()
                                    methodChannel?.invokeMethod("onPinningRejected", "timeout")
                                    return
                                }
                                pinningHandler.postDelayed(this, 300)
                            }
                        }
                        pinCheckRunnable = checkRunnable
                        pinningHandler.postDelayed(checkRunnable, 300)
                    } catch (e: Exception) {
                        stopPinApprovalTracking()
                        result.success(false)
                        methodChannel?.invokeMethod("onPinningRejected", "exception: ${e.message}")
                    }
                }
                "stopLockTask" -> {
                    try {
                        stopPinApprovalTracking()
                        stopLockTask()
                        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        result.success(true)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "isLockTaskActive" -> {
                    try {
                        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            am.lockTaskModeState
                        } else {
                            ActivityManager.LOCK_TASK_MODE_NONE
                        }
                        result.success(mode != ActivityManager.LOCK_TASK_MODE_NONE)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "isScreenInteractive" -> {
                    try {
                        // Jangan anggap keluar aplikasi jika sedang menunggu siswa merespons dialog pin
                        if (isWaitingForPinApproval) {
                            result.success(false)
                            return@setMethodCallHandler
                        }
                        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
                        val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
                        val isInteractive = pm.isInteractive && !isScreenOff
                        val isKeyguardLocked = km?.isKeyguardLocked ?: false
                        // Hanya anggap keluar jika layar hidup, tidak di lockscreen, dan aplikasi kita tidak aktif di layar
                        val isOutside = isInteractive && !isKeyguardLocked && !isActivityResumed
                        result.success(isOutside)
                    } catch (e: Exception) {
                        result.success(false)
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
        stopPinApprovalTracking()
        try {
            unregisterReceiver(screenReceiver)
        } catch (_: Exception) {}
        stopEmergencySiren()
        super.onDestroy()
    }
}
