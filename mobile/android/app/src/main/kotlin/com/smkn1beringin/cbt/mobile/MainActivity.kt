package com.smkn1beringin.cbt.mobile

import android.app.ActivityManager
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
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
    private var lastScreenOffTimestamp = 0L
    private var isActivityResumed = false

    // App Pinning Tracking (Screen Pinning / LockTaskMode)
    private var isWaitingForPinApproval = false
    private var pinDialogAppeared = false
    private var pinRequestTimestamp = 0L
    private val pinningHandler = Handler(Looper.getMainLooper())
    private var pinCheckRunnable: Runnable? = null

    // Exam Mode Tracking
    private var isExamModeActive = false

    private fun applyHideOverlayWindows() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                window.setHideOverlayWindows(true)
            }
        } catch (_: Exception) {}
    }

    private fun isMultiWindowActive(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                isInMultiWindowMode
            } else {
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun isPipActive(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                isInPictureInPictureMode
            } else {
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    override fun onMultiWindowModeChanged(isInMultiWindowMode: Boolean, newConfig: Configuration?) {
        super.onMultiWindowModeChanged(isInMultiWindowMode, newConfig)
        if (isInMultiWindowMode) {
            methodChannel?.invokeMethod("onMultiWindowDetected", null)
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration?) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        if (isInPictureInPictureMode) {
            methodChannel?.invokeMethod("onMultiWindowDetected", null)
        }
    }

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

    private fun stopPinApprovalTracking() {
        isWaitingForPinApproval = false
        pinDialogAppeared = false
        pinRequestTimestamp = 0L
        pinCheckRunnable?.let { pinningHandler.removeCallbacks(it) }
        pinCheckRunnable = null
        pinningHandler.removeCallbacksAndMessages(null)
    }

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    isScreenOff = true
                    lastScreenOffTimestamp = System.currentTimeMillis()
                    // Jika layar dimatikan (tombol power/sleep), matikan sirine dan jangan kunci
                    stopEmergencySiren()
                }
                Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> {
                    isScreenOff = false
                    lastScreenOffTimestamp = System.currentTimeMillis()
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyHideOverlayWindows()
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
        if (isExamModeActive || isPinned()) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        applyHideOverlayWindows()
    }

    override fun onPause() {
        super.onPause()
        isActivityResumed = false
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            applyHideOverlayWindows()
            if (isExamModeActive || isPinned()) {
                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            if (isWaitingForPinApproval && isPinned()) {
                stopPinApprovalTracking()
                isExamModeActive = true
                methodChannel?.invokeMethod("onPinningAccepted", null)
            }
        } else {
            if (isWaitingForPinApproval) {
                pinDialogAppeared = true
            }
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // Anti-Cheating: Blokir Screenshot dan Screen Recording secara native di Android
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        applyHideOverlayWindows()

        // Anti-Cheating: Kiosk Mode dan Emergency Siren Alarm
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "hideOverlayWindows" -> {
                    applyHideOverlayWindows()
                    result.success(true)
                }
                "setExamActive" -> {
                    val active = call.argument<Boolean>("active") ?: false
                    isExamModeActive = active
                    runOnUiThread {
                        if (active) {
                            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        } else if (!isPinned()) {
                            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        }
                    }
                    result.success(true)
                }
                "hasWindowFocus" -> {
                    result.success(hasWindowFocus())
                }
                "isMultiWindowActive" -> {
                    result.success(isMultiWindowActive() || isPipActive())
                }
                "startLockTask" -> {
                    try {
                        applyHideOverlayWindows()
                        try {
                            @Suppress("DEPRECATION")
                            sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
                        } catch (_: Exception) {}

                        if (isMultiWindowActive() || isPipActive()) {
                            stopPinApprovalTracking()
                            isExamModeActive = false
                            result.success(false)
                            methodChannel?.invokeMethod("onPinningRejected", "floating_window_active")
                            return@setMethodCallHandler
                        }

                        if (isPinned()) {
                            stopPinApprovalTracking()
                            isExamModeActive = true
                            runOnUiThread {
                                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                            }
                            result.success(true)
                            methodChannel?.invokeMethod("onPinningAccepted", null)
                            return@setMethodCallHandler
                        }

                        stopPinApprovalTracking()
                        isWaitingForPinApproval = true
                        pinDialogAppeared = false
                        pinRequestTimestamp = System.currentTimeMillis()
                        runOnUiThread {
                            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        }

                        try {
                            startLockTask()
                        } catch (e: Exception) {
                            // Banyak ROM (Infinix XOS, Oppo ColorOS, Xiaomi dsb) tidak mendukung/menolak startLockTask
                            // Fallback otomatis ke mode aman standar dengan pemantauan lifecycle & FLAG_KEEP_SCREEN_ON
                            stopPinApprovalTracking()
                            isExamModeActive = true
                            runOnUiThread {
                                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                            }
                            result.success(true)
                            methodChannel?.invokeMethod("onPinningAccepted", null)
                            return@setMethodCallHandler
                        }

                        result.success(true)

                        val startTime = System.currentTimeMillis()
                        val checkRunnable = object : Runnable {
                            override fun run() {
                                if (!isWaitingForPinApproval) return
                                if (isPinned()) {
                                    stopPinApprovalTracking()
                                    isExamModeActive = true
                                    runOnUiThread {
                                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                                    }
                                    methodChannel?.invokeMethod("onPinningAccepted", null)
                                    return
                                }
                                // Jika dalam 3.5 detik ROM tidak pernah memunculkan dialog semat (khas Infinix/Oppo/Android lawas),
                                // fallback otomatis agar siswa tidak tertahan di loading screen
                                if (!pinDialogAppeared && (System.currentTimeMillis() - startTime > 3500)) {
                                    stopPinApprovalTracking()
                                    isExamModeActive = true
                                    runOnUiThread {
                                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                                    }
                                    methodChannel?.invokeMethod("onPinningAccepted", null)
                                    return
                                }
                                // Timeout 8 detik fallback otomatis
                                if (System.currentTimeMillis() - startTime > 8000) {
                                    stopPinApprovalTracking()
                                    isExamModeActive = true
                                    runOnUiThread {
                                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                                    }
                                    methodChannel?.invokeMethod("onPinningAccepted", null)
                                    return
                                }
                                pinningHandler.postDelayed(this, 200)
                            }
                        }
                        pinCheckRunnable = checkRunnable
                        pinningHandler.postDelayed(checkRunnable, 200)
                    } catch (e: Exception) {
                        stopPinApprovalTracking()
                        isExamModeActive = true
                        runOnUiThread {
                            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        }
                        result.success(true)
                        methodChannel?.invokeMethod("onPinningAccepted", null)
                    }
                }
                "stopLockTask" -> {
                    try {
                        isExamModeActive = false
                        stopPinApprovalTracking()
                        if (isPinned()) {
                            try {
                                stopLockTask()
                            } catch (_: Exception) {}
                        }
                        runOnUiThread {
                            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        }
                        result.success(true)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "isLockTaskActive" -> {
                    try {
                        result.success(isPinned())
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "isScreenInteractive" -> {
                    try {
                        // Jangan anggap keluar jika sedang menunggu siswa merespons dialog pin
                        if (isWaitingForPinApproval) {
                            result.success(false)
                            return@setMethodCallHandler
                        }
                        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
                        val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
                        val isInteractive = pm.isInteractive && !isScreenOff
                        val isKeyguardLocked = km?.isKeyguardLocked ?: false
                        val timeSinceScreenChange = System.currentTimeMillis() - lastScreenOffTimestamp

                        // Jika layar mati (sleep/tombol power), atau HP di lockscreen,
                        // atau baru saja ada pergantian status layar dalam 4 detik:
                        // JANGAN PERNAH anggap keluar aplikasi ujian!
                        if (!isInteractive || isKeyguardLocked || timeSinceScreenChange < 4000) {
                            result.success(false)
                            return@setMethodCallHandler
                        }

                        // Layar hidup dan tidak di lockscreen:
                        // Hanya anggap keluar jika activity benar-benar di background (siswa membuka app lain / ke Home)
                        val isOutside = !isActivityResumed
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
        isExamModeActive = false
        stopPinApprovalTracking()
        try {
            unregisterReceiver(screenReceiver)
        } catch (_: Exception) {}
        stopEmergencySiren()
        super.onDestroy()
    }
}
