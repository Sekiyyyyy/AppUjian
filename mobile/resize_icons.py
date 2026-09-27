import os
import sys
from PIL import Image

def generate_icons():
    logo_path = "/home/server/AppUjian/mobile/assets/images/logo.png"
    if not os.path.exists(logo_path):
        print(f"Logo not found at {logo_path}")
        return

    img = Image.open(logo_path).convert("RGBA")
    print(f"Loaded logo: {img.size}")

    # Android mipmaps
    res_dir = "/home/server/AppUjian/mobile/android/app/src/main/res"
    android_sizes = {
        "mipmap-mdpi": (48, 48),
        "mipmap-hdpi": (72, 72),
        "mipmap-xhdpi": (96, 96),
        "mipmap-xxhdpi": (144, 144),
        "mipmap-xxxhdpi": (192, 192),
    }

    for folder, size in android_sizes.items():
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)
        target_path = os.path.join(target_folder, "ic_launcher.png")
        resized = img.resize(size, Image.Resampling.LANCZOS)
        resized.save(target_path, "PNG")
        print(f"Generated {target_path} ({size})")

    # Windows .ico
    windows_ico_path = "/home/server/AppUjian/mobile/windows/runner/resources/app_icon.ico"
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    os.makedirs(os.path.dirname(windows_ico_path), exist_ok=True)
    img.save(windows_ico_path, format="ICO", sizes=ico_sizes)
    print(f"Generated {windows_ico_path}")

    print("All icons successfully generated from SMK logo!")

if __name__ == "__main__":
    generate_icons()
