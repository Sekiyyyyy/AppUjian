package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/color"
	_ "image/jpeg"
	"image/png"
	"log"
	"os"
)

// Bilinear resize implementation using pure Go standard library
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

			// Bilinear interpolation
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
		log.Fatalf("Gagal membuka file logo: %v", err)
	}
	defer file.Close()

	srcImg, _, err := image.Decode(file)
	if err != nil {
		log.Fatalf("Gagal decode gambar logo: %v", err)
	}

	sizes := []int{256, 128, 64, 48, 32, 16}
	var pngBuffers [][]byte

	for _, size := range sizes {
		resized := resizeImage(srcImg, size, size)
		var buf bytes.Buffer
		if err := png.Encode(&buf, resized); err != nil {
			log.Fatalf("Gagal encode PNG untuk ukuran %d: %v", size, err)
		}
		pngBuffers = append(pngBuffers, buf.Bytes())
		fmt.Printf("Generated frame %dx%d: %d bytes\n", size, size, buf.Len())
	}

	// Buat struktur file ICO
	var icoBuf bytes.Buffer

	// 1. Header ICO (6 bytes)
	// Reserved: 0x0000 (2 bytes)
	// Type: 1 = ICO (2 bytes)
	// Count: jumlah gambar (2 bytes)
	binary.Write(&icoBuf, binary.LittleEndian, uint16(0))
	binary.Write(&icoBuf, binary.LittleEndian, uint16(1))
	binary.Write(&icoBuf, binary.LittleEndian, uint16(len(sizes)))

	// Hitung offset data gambar pertama (6 + 16 * len(sizes))
	offset := uint32(6 + 16*len(sizes))

	// 2. Directory Entries (16 bytes per gambar)
	for i, size := range sizes {
		w := uint8(size)
		if size >= 256 {
			w = 0 // 0 menandakan 256px di format ICO
		}
		h := w
		colors := uint8(0) // No palette (truecolor)
		reserved := uint8(0)
		planes := uint16(1)
		bpp := uint16(32)
		sizeBytes := uint32(len(pngBuffers[i]))

		icoBuf.WriteByte(w)
		icoBuf.WriteByte(h)
		icoBuf.WriteByte(colors)
		icoBuf.WriteByte(reserved)
		binary.Write(&icoBuf, binary.LittleEndian, planes)
		binary.Write(&icoBuf, binary.LittleEndian, bpp)
		binary.Write(&icoBuf, binary.LittleEndian, sizeBytes)
		binary.Write(&icoBuf, binary.LittleEndian, offset)

		offset += sizeBytes
	}

	// 3. Payload gambar PNG
	for _, pngData := range pngBuffers {
		icoBuf.Write(pngData)
	}

	destIcoPath := "/home/server/AppUjian/mobile/windows/runner/resources/app_icon.ico"
	if err := os.WriteFile(destIcoPath, icoBuf.Bytes(), 0644); err != nil {
		log.Fatalf("Gagal menulis file ICO ke %s: %v", destIcoPath, err)
	}

	fmt.Printf("BERHASIL! Icon Windows '%s' berhasil diperbarui (%d bytes) dengan logo SMK Negeri 1 Beringin!\n", destIcoPath, icoBuf.Len())
}
