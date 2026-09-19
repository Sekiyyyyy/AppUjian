#include "flutter_window.h"

#include <optional>
#include <iostream>

#include "flutter/generated_plugin_registrant.h"

// Static member initialization
HHOOK FlutterWindow::keyboard_hook_ = nullptr;

FlutterWindow::FlutterWindow(const flutter::DartProject& project)
    : project_(project) {}

FlutterWindow::~FlutterWindow() {
  // Ensure kiosk mode is disabled and hook is removed on destruction
  if (kiosk_active_) {
    DisableKioskMode();
  }
}

bool FlutterWindow::OnCreate() {
  if (!Win32Window::OnCreate()) {
    return false;
  }

  RECT frame = GetClientArea();

  // The size here must match the window dimensions to avoid unnecessary surface
  // creation / destruction in the startup path.
  flutter_controller_ = std::make_unique<flutter::FlutterViewController>(
      frame.right - frame.left, frame.bottom - frame.top, project_);
  // Ensure that basic setup of the controller was successful.
  if (!flutter_controller_->engine() || !flutter_controller_->view()) {
    return false;
  }
  RegisterPlugins(flutter_controller_->engine());
  SetChildContent(flutter_controller_->view()->GetNativeWindow());

  // --- Register Kiosk MethodChannel ---
  auto channel = std::make_unique<flutter::MethodChannel<flutter::EncodableValue>>(
      flutter_controller_->engine()->messenger(),
      "com.smkn1beringin.cbt/kiosk",
      &flutter::StandardMethodCodec::GetInstance());

  // Capture 'this' to call EnableKioskMode / DisableKioskMode
  FlutterWindow* self = this;
  channel->SetMethodCallHandler(
      [self](const flutter::MethodCall<flutter::EncodableValue>& call,
             std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>> result) {
        if (call.method_name() == "startLockTask") {
          self->EnableKioskMode();
          result->Success(flutter::EncodableValue(true));
        } else if (call.method_name() == "stopLockTask") {
          self->DisableKioskMode();
          result->Success(flutter::EncodableValue(true));
        } else if (call.method_name() == "isScreenInteractive") {
          // On desktop, always return true (screen is always interactive)
          result->Success(flutter::EncodableValue(true));
        } else {
          result->NotImplemented();
        }
      });

  flutter_controller_->engine()->SetNextFrameCallback([&]() {
    this->Show();
  });

  // Flutter can complete the first frame before the "show window" callback is
  // registered. The following call ensures a frame is pending to ensure the
  // window is shown. It is a no-op if the first frame hasn't completed yet.
  flutter_controller_->ForceRedraw();

  return true;
}

void FlutterWindow::OnDestroy() {
  if (kiosk_active_) {
    DisableKioskMode();
  }
  if (flutter_controller_) {
    flutter_controller_ = nullptr;
  }

  Win32Window::OnDestroy();
}

// ============================================================================
// Kiosk Mode Implementation
// ============================================================================

void FlutterWindow::EnableKioskMode() {
  if (kiosk_active_) return;

  HWND hwnd = GetHandle();
  if (!hwnd) return;

  // 1. Save current window state for restoration later
  original_style_ = GetWindowLong(hwnd, GWL_STYLE);
  original_ex_style_ = GetWindowLong(hwnd, GWL_EXSTYLE);
  GetWindowRect(hwnd, &original_rect_);

  // 2. Remove window decorations (title bar, borders, resize handles)
  LONG new_style = original_style_;
  new_style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX |
                  WS_MAXIMIZEBOX | WS_SYSMENU);
  SetWindowLong(hwnd, GWL_STYLE, new_style);

  // Remove extended styles that allow resizing/edges
  LONG new_ex_style = original_ex_style_;
  new_ex_style &= ~(WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE |
                     WS_EX_STATICEDGE | WS_EX_WINDOWEDGE);
  SetWindowLong(hwnd, GWL_EXSTYLE, new_ex_style);

  // 3. Go fullscreen on the monitor this window is on
  HMONITOR monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
  MONITORINFO mi;
  mi.cbSize = sizeof(mi);
  GetMonitorInfo(monitor, &mi);

  SetWindowPos(hwnd, HWND_TOPMOST,
               mi.rcMonitor.left, mi.rcMonitor.top,
               mi.rcMonitor.right - mi.rcMonitor.left,
               mi.rcMonitor.bottom - mi.rcMonitor.top,
               SWP_FRAMECHANGED | SWP_SHOWWINDOW);

  // Force to foreground
  SetForegroundWindow(hwnd);
  SetFocus(hwnd);

  // 4. Install low-level keyboard hook to block Alt+Tab, Alt+F4, Win key, etc.
  if (keyboard_hook_ == nullptr) {
    keyboard_hook_ = SetWindowsHookEx(
        WH_KEYBOARD_LL,
        LowLevelKeyboardProc,
        GetModuleHandle(nullptr),
        0);
  }

  kiosk_active_ = true;
}

void FlutterWindow::DisableKioskMode() {
  if (!kiosk_active_) return;

  HWND hwnd = GetHandle();

  // 1. Remove keyboard hook
  if (keyboard_hook_ != nullptr) {
    UnhookWindowsHookEx(keyboard_hook_);
    keyboard_hook_ = nullptr;
  }

  if (!hwnd) {
    kiosk_active_ = false;
    return;
  }

  // 2. Restore original window styles
  SetWindowLong(hwnd, GWL_STYLE, original_style_);
  SetWindowLong(hwnd, GWL_EXSTYLE, original_ex_style_);

  // 3. Remove TOPMOST and restore original position/size
  SetWindowPos(hwnd, HWND_NOTOPMOST,
               original_rect_.left, original_rect_.top,
               original_rect_.right - original_rect_.left,
               original_rect_.bottom - original_rect_.top,
               SWP_FRAMECHANGED | SWP_NOACTIVATE);

  // 4. Redraw
  ShowWindow(hwnd, SW_SHOWNORMAL);
  InvalidateRect(hwnd, nullptr, TRUE);

  kiosk_active_ = false;
}

// ============================================================================
// Low-Level Keyboard Hook Callback
// ============================================================================
// Blocks: Alt+Tab, Alt+F4, Alt+Esc, Win key (L/R), Ctrl+Esc
// Cannot block Ctrl+Alt+Del (handled by Windows kernel SAS)
// ============================================================================

LRESULT CALLBACK FlutterWindow::LowLevelKeyboardProc(
    int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode == HC_ACTION) {
    KBDLLHOOKSTRUCT* pKb = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);

    // Block Windows key (left and right)
    if (pKb->vkCode == VK_LWIN || pKb->vkCode == VK_RWIN) {
      return 1;  // Swallow the key
    }

    // Block Application / Context Menu key
    if (pKb->vkCode == VK_APPS) {
      return 1;
    }

    bool altDown = (pKb->flags & LLKHF_ALTDOWN) != 0;

    // Block Alt+Tab
    if (altDown && pKb->vkCode == VK_TAB) {
      return 1;
    }

    // Block Alt+F4
    if (altDown && pKb->vkCode == VK_F4) {
      return 1;
    }

    // Block Alt+Escape
    if (altDown && pKb->vkCode == VK_ESCAPE) {
      return 1;
    }

    // Block Alt+Space (System window menu)
    if (altDown && pKb->vkCode == VK_SPACE) {
      return 1;
    }

    // Block Ctrl+Escape (Start menu) and Ctrl+Shift+Escape (Task Manager)
    bool ctrlDown = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
    if (ctrlDown && pKb->vkCode == VK_ESCAPE) {
      return 1;
    }

    // Block Print Screen (Screenshots)
    if (pKb->vkCode == VK_SNAPSHOT) {
      return 1;
    }

    // Block F11 (Fullscreen toggle)
    if (pKb->vkCode == VK_F11) {
      return 1;
    }
  }

  return CallNextHookEx(nullptr, nCode, wParam, lParam);
}

// ============================================================================
// Window Message Handler
// ============================================================================

LRESULT
FlutterWindow::MessageHandler(HWND hwnd, UINT const message,
                              WPARAM const wparam,
                              LPARAM const lparam) noexcept {
  // Give Flutter, including plugins, an opportunity to handle window messages.
  if (flutter_controller_) {
    std::optional<LRESULT> result =
        flutter_controller_->HandleTopLevelWindowProc(hwnd, message, wparam,
                                                      lparam);
    if (result) {
      return *result;
    }
  }

  // Kiosk mode message interception
  if (kiosk_active_) {
    switch (message) {
      case WM_CLOSE:
        // Block window close entirely during kiosk mode
        return 0;

      case WM_SYSCOMMAND:
        // Block minimize, maximize, close, restore, size, move via system menu
        switch (wparam & 0xFFF0) {
          case SC_MINIMIZE:
          case SC_CLOSE:
          case SC_MOVE:
          case SC_RESTORE:
          case SC_MAXIMIZE:
          case SC_SIZE:
          case SC_NEXTWINDOW:
          case SC_PREVWINDOW:
            return 0;
        }
        break;

      case WM_KILLFOCUS:
        // When window loses focus during kiosk, force it back to foreground
        SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0,
                     SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
        // Use a small delay approach to re-grab focus
        SetTimer(hwnd, 9999, 100, nullptr);
        return 0;

      case WM_TIMER:
        if (wparam == 9999) {
          KillTimer(hwnd, 9999);
          SetForegroundWindow(hwnd);
          SetFocus(hwnd);
          return 0;
        }
        break;

      case WM_SIZING:
      case WM_MOVING:
        // Block resize and move during kiosk mode
        return TRUE;
    }
  }

  switch (message) {
    case WM_FONTCHANGE:
      flutter_controller_->engine()->ReloadSystemFonts();
      break;
  }

  return Win32Window::MessageHandler(hwnd, message, wparam, lparam);
}
