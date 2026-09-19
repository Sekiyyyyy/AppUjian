#ifndef RUNNER_FLUTTER_WINDOW_H_
#define RUNNER_FLUTTER_WINDOW_H_

#include <flutter/dart_project.h>
#include <flutter/flutter_view_controller.h>
#include <flutter/method_channel.h>
#include <flutter/standard_method_codec.h>

#include <memory>

#include "win32_window.h"

// A window that does nothing but host a Flutter view.
class FlutterWindow : public Win32Window {
 public:
  // Creates a new FlutterWindow hosting a Flutter view running |project|.
  explicit FlutterWindow(const flutter::DartProject& project);
  virtual ~FlutterWindow();

  // Kiosk mode: enter/exit fullscreen lockdown
  void EnableKioskMode();
  void DisableKioskMode();
  bool IsKioskActive() const { return kiosk_active_; }

 protected:
  // Win32Window:
  bool OnCreate() override;
  void OnDestroy() override;
  LRESULT MessageHandler(HWND window, UINT const message, WPARAM const wparam,
                         LPARAM const lparam) noexcept override;

 private:
  // The project to run.
  flutter::DartProject project_;

  // The Flutter instance hosted by this window.
  std::unique_ptr<flutter::FlutterViewController> flutter_controller_;

  // --- Kiosk Mode State ---
  bool kiosk_active_ = false;
  LONG original_style_ = 0;
  LONG original_ex_style_ = 0;
  RECT original_rect_ = {0, 0, 0, 0};

  // Low-level keyboard hook to block Alt+Tab, Alt+F4, Win key, etc.
  static HHOOK keyboard_hook_;
  static LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam,
                                                LPARAM lParam);
};

#endif  // RUNNER_FLUTTER_WINDOW_H_
