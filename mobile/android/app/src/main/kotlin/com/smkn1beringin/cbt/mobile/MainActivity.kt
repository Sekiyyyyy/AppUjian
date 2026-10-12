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
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.net.Uri
import android.provider.Settings
import android.hardware.Sensor
import android.hardware.SensorManager
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

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

    private fun isEmulator(): Boolean {
        // 1. Emulator-Specific Package Detection (BlueStacks 5, LDPlayer, Nox, MEmu, MuMu)
        // BlueStacks 5 selalu memiliki paket-paket internal ini meskipun model HP di-spoofing
        val emulatorPackages = arrayOf(
            "com.bluestacks.settings",
            "com.bluestacks.home",
            "com.bluestacks.launcher",
            "com.bluestacks.appmart",
            "com.bluestacks.filemanager",
            "com.bluestacks.windowsfilemanager",
            "com.bluestacks.bstx",
            "com.bignox.app",
            "com.bignox.launcher",
            "com.microvirt.launcher",
            "com.microvirt.tools",
            "com.vphone.launcher",
            "com.ldmnq.launcher",
            "com.mumu.launcher"
        )
        for (pkg in emulatorPackages) {
            try {
                packageManager.getPackageInfo(pkg, 0)
                return true
            } catch (_: Exception) {}
        }

        // 2. Emulator-Specific Files, Virtual Drivers, and Pipes
        val emulatorFiles = arrayOf(
            // BlueStacks Virtual Files & Drivers
            "/sdcard/windows/BstSharedFolder",
            "/mnt/windows/BstSharedFolder",
            "/system/bin/bstk",
            "/system/xbin/bstksu",
            "/system/bin/bstk-launcher",
            "/dev/bst_gps",
            "/dev/bst_pipe",
            "/dev/bst_touch",
            "/sys/module/bst_pipe",
            "/sys/module/bst_touch",
            "/system/lib/libbstk.so",
            "/system/lib64/libbstk.so",
            // LDPlayer
            "/system/bin/ldprop",
            "/dev/ld_pipe",
            "/dev/vboxuser",
            // Nox
            "/system/bin/nox-prop",
            "/system/bin/noxd",
            "/dev/nox_pipe",
            // MEmu
            "/system/bin/microvirt-prop",
            "/dev/memu_pipe",
            // Generic QEMU / VirtualBox Pipes
            "/dev/socket/qemud",
            "/dev/qemu_pipe",
            "/sys/qemu_trace",
            "/system/bin/qemu-props",
            "/system/bin/androVM-vbox-sf",
            "/system/lib/libc_malloc_debug_qemu.so"
        )
        for (path in emulatorFiles) {
            try {
                if (File(path).exists()) {
                    return true
                }
            } catch (_: Exception) {}
        }

        // 3. Hardware CPU Inspection (/proc/cpuinfo)
        // Emulator PC berjalan di atas prosesor x86/x64 PC (Intel / AMD) menggunakan hypervisor.
        // HP fisik siswa (Infinix, Oppo, Vivo, Xiaomi, Samsung, Realme) MURNI arsitektur ARM bare-metal.
        try {
            val cpuInfoFile = File("/proc/cpuinfo")
            if (cpuInfoFile.exists() && cpuInfoFile.canRead()) {
                val cpuContent = cpuInfoFile.readText()
                // A. Hypervisor flag: HANYA ada di mesin virtual (KVM, Hyper-V, VirtualBox, BlueStacks, QEMU).
                // HP fisik bare-metal TIDAK PERNAH memiliki flag hypervisor.
                if (cpuContent.contains("hypervisor", ignoreCase = true)) {
                    return true
                }
                // B. Desktop x86 Processors (Intel Core, AMD Ryzen, GenuineIntel, AuthenticAMD)
                if (cpuContent.contains("GenuineIntel", ignoreCase = true) ||
                    cpuContent.contains("AuthenticAMD", ignoreCase = true) ||
                    cpuContent.contains("AMD Ryzen", ignoreCase = true) ||
                    cpuContent.contains("Intel(R) Core", ignoreCase = true)) {
                    return true
                }
            }
        } catch (_: Exception) {}

        // 4. Hardware Sensors & ABI Inspection
        // PC Emulator tidak memiliki sensor fisik Proximity (Sensor Kedekatan Telinga).
        try {
            val sensorManager = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
            if (sensorManager != null) {
                val proximitySensor = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)
                val lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
                val hasX86 = Build.SUPPORTED_ABIS.any { it.contains("x86") }
                if (proximitySensor == null && (hasX86 || lightSensor == null)) {
                    return true
                }
            }
        } catch (_: Exception) {}

        // 5. Build Properties Check (Default Emulators)
        val isGeneric = Build.FINGERPRINT.startsWith("generic") ||
                Build.FINGERPRINT.startsWith("unknown") ||
                Build.FINGERPRINT.contains("google_sdk") ||
                Build.FINGERPRINT.contains("Emulator") ||
                Build.FINGERPRINT.contains("Android SDK built for x86") ||
                Build.FINGERPRINT.contains("vbox86p")

        val isHardwareQemu = Build.HARDWARE.contains("goldfish") ||
                Build.HARDWARE.contains("ranchu") ||
                Build.HARDWARE.contains("vbox86") ||
                Build.HARDWARE.contains("nox") ||
                Build.HARDWARE.contains("ttVM_x86")

        val isModelEmulator = Build.MODEL.contains("google_sdk") ||
                Build.MODEL.contains("Emulator") ||
                Build.MODEL.contains("Android SDK built for x86") ||
                Build.MODEL.contains("BlueStacks") ||
                Build.MODEL.contains("Droid4X") ||
                Build.MODEL.contains("TIANYAN") ||
                Build.MODEL.contains("Nox")

        val isManufacturerEmulator = Build.MANUFACTURER.contains("Genymotion") ||
                Build.MANUFACTURER.contains("BlueStacks") ||
                Build.MANUFACTURER.contains("Bignox") ||
                Build.MANUFACTURER.contains("Nox")

        val isProductEmulator = Build.PRODUCT.contains("sdk") ||
                Build.PRODUCT.contains("google_sdk") ||
                Build.PRODUCT.contains("sdk_x86") ||
                Build.PRODUCT.contains("vbox86p") ||
                Build.PRODUCT.contains("nox") ||
                Build.PRODUCT.contains("bluestacks") ||
                Build.PRODUCT.contains("bignox")

        val isBoardEmulator = Build.BOARD.contains("goldfish") ||
                Build.BOARD.contains("vbox") ||
                Build.BOARD.contains("nox")

        val isBrandGeneric = Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic")

        if (isGeneric || isHardwareQemu || isModelEmulator ||
            isManufacturerEmulator || isProductEmulator || isBoardEmulator ||
            isBrandGeneric) {
            return true
        }

        // 6. System Properties
        try {
            val process = Runtime.getRuntime().exec("getprop ro.kernel.qemu")
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val output = reader.readLine()
            reader.close()
            process.destroy()
            if (output != null && output.trim() == "1") {
                return true
            }
        } catch (_: Exception) {}

        return false
    }

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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenReceiver, filter)
        }
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
                "isEmulator" -> {
                    try {
                        result.success(isEmulator())
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "getAppStoragePath" -> {
                    try {
                        val path = getExternalFilesDir(null)?.absolutePath ?: cacheDir.absolutePath
                        result.success(path)
                    } catch (e: Exception) {
                        result.success(cacheDir.absolutePath)
                    }
                }
                "installApk" -> {
                    val filePath = call.argument<String>("filePath")
                    if (filePath.isNullOrEmpty()) {
                        result.error("INVALID_PATH", "Path file APK tidak boleh kosong", null)
                        return@setMethodCallHandler
                    }
                    val apkFile = File(filePath)
                    if (!apkFile.exists()) {
                        result.error("FILE_NOT_FOUND", "File APK tidak ditemukan: $filePath", null)
                        return@setMethodCallHandler
                    }

                    // Android 8.0+ (Oreo through Android 15): jika belum diberikan izin install aplikasi tidak dikenal
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
                        try {
                            val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                                data = Uri.parse("package:$packageName")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(settingsIntent)
                            result.success(true)
                            return@setMethodCallHandler
                        } catch (e: Exception) {
                            try {
                                val securityIntent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                startActivity(securityIntent)
                                result.success(true)
                                return@setMethodCallHandler
                            } catch (_: Exception) {}
                        }
                    }

                    try {
                        apkFile.setReadable(true, false)
                        val apkUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            FileProvider.getUriForFile(
                                applicationContext,
                                "${applicationContext.packageName}.fileprovider",
                                apkFile
                            )
                        } else {
                            @Suppress("DEPRECATION")
                            Uri.fromFile(apkFile)
                        }

                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(apkUri, "application/vnd.android.package-archive")
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
                                val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                                    data = Uri.parse("package:$packageName")
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                startActivity(settingsIntent)
                                result.success(true)
                                return@setMethodCallHandler
                            }
                        } catch (_: Exception) {}
                        result.error("INSTALL_ERROR", e.message ?: "Gagal membuka installer APK", null)
                    }
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
