# Undangan Online

Tahap sekarang: cover page dulu, static HTML/CSS/JS.

## Jalankan localhost

```bash
node server.js
```

Buka:

```text
http://localhost:5173/?to=Bagas%20Adjie%20%26%20Partner
```

Nama tamu akan tampil sebagai:

```text
Bagas Adjie & Partner
```

Kalau `to` kosong, fallback-nya:

```text
Bapak/Ibu/Saudara/i
```

## Ganti gambar

Taruh gambar wide background desktop dari desain kamu di:

```text
assets/background-desktop.png
```

Bisa juga pakai `.jpg`, `.jpeg`, atau `.webp` dengan nama yang sama, misalnya:

```text
assets/background-desktop.jpg
```

Taruh gambar utama cover/card di:

```text
assets/cover-main.png
```

Bisa juga:

```text
assets/cover-main.jpg
```

Kalau file belum ada, server otomatis pakai fallback SVG supaya browser tidak error 404.

Deploy functions
