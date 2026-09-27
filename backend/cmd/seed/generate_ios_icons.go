package main

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	_ "image/jpeg"
	"image/png"
	"log"
	"os"
	"path/filepath"
)

func resizeImage(src image.Image, targetWidth, targetHeight int) image.Image {
	dst := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))
	srcBounds := src.Bounds()
	srcW := srcBounds.Dx()
	srcH := srcBounds.Dy()

	for y := 0; y < targetHeight; y++ {
		for x := 0; x < targetWidth; x++ {
			srcX := float64(x) * float64(srcW) / float64(targetWidth)
			srcY := float64(y) * float64(srcH) / float64(targetHeight)

			x0 := int(srcX)
			y0 := int(srcY)
			x1 := x0 + 1
			if x1 >= srcW {
				x1 = srcW - 1
			}
			y1 := y0 + 1
			if y1 >= srcH {
				y1 = srcH - 1
			}

			fx := srcX - float64(x0)
			fy := srcY - float64(y0)

			c00 := src.At(srcBounds.Min.X+x0, srcBounds.Min.Y+y0)
			c10 := src.At(srcBounds.Min.X+x1, srcBounds.Min.Y+y0)
			c01 := src.At(srcBounds.Min.X+x0, srcBounds.Min.Y+y1)
			c11 := src.At(srcBounds.Min.X+x1, srcBounds.Min.Y+y1)

			r00, g00, b00, a00 := c00.RGBA()
			r10, g10, b10, a10 := c10.RGBA()
			r01, g01, b01, a01 := c01.RGBA()
			r11, g11, b11, a11 := c11.RGBA()

			topR := float64(r00)*(1-fx) + float64(r10)*fx
			topG := float64(g00)*(1-fx) + float64(g10)*fx
			topB := float64(b00)*(1-fx) + float64(b10)*fx
			topA := float64(a00)*(1-fx) + float64(a10)*fx

			botR := float64(r01)*(1-fx) + float64(r11)*fx
			botG := float64(g01)*(1-fx) + float64(g11)*fx
			botB := float64(b01)*(1-fx) + float64(b11)*fx
			botA := float64(a01)*(1-fx) + float64(a11)*fx

			r := uint8((topR*(1-fy) + botR*fy) / 257.0)
			g := uint8((topG*(1-fy) + botG*fy) / 257.0)
			b := uint8((topB*(1-fy) + botB*fy) / 257.0)
			a := uint8((topA*(1-fy) + botA*fy) / 257.0)

			dst.Set(x, y, color.RGBA{R: r, G: g, B: b, A: a})
		}
	}
	return dst
}

func main() {
	logoPath := "/home/server/AppUjian/mobile/assets/images/logo.png"
	file, err := os.Open(logoPath)
	if err != nil {
		log.Fatalf("Gagal: %v", err)
	}
	defer file.Close()

	srcImg, _, err := image.Decode(file)
	if err != nil {
		log.Fatalf("Gagal decode logo: %v", err)
	}

	appIconSetDir := "/home/server/AppUjian/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset"
	if err := os.MkdirAll(appIconSetDir, 0755); err != nil {
		log.Fatalf("Gagal mkdir: %v", err)
	}

	iconMap := map[string]int{
		"Icon-App-1024x1024@1x.png": 1024,
		"Icon-App-60x60@3x.png":     180,
		"Icon-App-60x60@2x.png":     120,
		"Icon-App-76x76@2x.png":     152,
		"Icon-App-83.5x83.5@2x.png": 167,
		"Icon-App-20x20@2x.png":     40,
		"Icon-App-20x20@3x.png":     60,
		"Icon-App-29x29@2x.png":     58,
		"Icon-App-29x29@3x.png":     87,
		"Icon-App-40x40@2x.png":     80,
		"Icon-App-40x40@3x.png":     120,
	}

	for filename, size := range iconMap {
		resized := resizeImage(srcImg, size, size)
		var buf bytes.Buffer
		png.Encode(&buf, resized)
		dest := filepath.Join(appIconSetDir, filename)
		os.WriteFile(dest, buf.Bytes(), 0644)
		fmt.Printf("Generated iOS icon: %s (%dx%d)\n", filename, size, size)
	}

	contentsJSON := `{
  "images" : [
    {
      "size" : "20x20",
      "idiom" : "iphone",
      "filename" : "Icon-App-20x20@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "20x20",
      "idiom" : "iphone",
      "filename" : "Icon-App-20x20@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "29x29",
      "idiom" : "iphone",
      "filename" : "Icon-App-29x29@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "29x29",
      "idiom" : "iphone",
      "filename" : "Icon-App-29x29@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "40x40",
      "idiom" : "iphone",
      "filename" : "Icon-App-40x40@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "40x40",
      "idiom" : "iphone",
      "filename" : "Icon-App-40x40@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "60x60",
      "idiom" : "iphone",
      "filename" : "Icon-App-60x60@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "60x60",
      "idiom" : "iphone",
      "filename" : "Icon-App-60x60@3x.png",
      "scale" : "3x"
    },
    {
      "size" : "76x76",
      "idiom" : "ipad",
      "filename" : "Icon-App-76x76@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "83.5x83.5",
      "idiom" : "ipad",
      "filename" : "Icon-App-83.5x83.5@2x.png",
      "scale" : "2x"
    },
    {
      "size" : "1024x1024",
      "idiom" : "ios-marketing",
      "filename" : "Icon-App-1024x1024@1x.png",
      "scale" : "1x"
    }
  ],
  "info" : {
    "version" : 1,
    "author" : "xcode"
  }
}`
	os.WriteFile(filepath.Join(appIconSetDir, "Contents.json"), []byte(contentsJSON), 0644)
	fmt.Println("BERHASIL! Seluruh AppIcon iOS (.ipa) berhasil dibuat dengan logo SMK Negeri 1 Beringin!")
}
