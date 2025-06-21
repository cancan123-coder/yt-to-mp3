const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const youtubedl = require("youtube-dl-exec");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve file statis dari folder public
app.use(express.static(path.join(__dirname, "public")));

const DOWNLOAD_FOLDER = path.join(__dirname, "public", "downloads");
const MAX_FILE_AGE = 60 * 60 * 1000; // 1 jam dalam milidetik

setInterval(() => {
    fs.readdir(DOWNLOAD_FOLDER, (err, files) => {
        if (err) return console.error("Gagal membaca folder:", err);

        const now = Date.now();

        files.forEach((file) => {
            const filePath = path.join(DOWNLOAD_FOLDER, file);

            fs.stat(filePath, (err, stats) => {
                if (err) return console.error("Gagal membaca file:", err);

                const age = now - stats.mtimeMs;

                if (age > MAX_FILE_AGE) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error(`Gagal menghapus ${file}:`, err);
                        } else {
                            console.log(`🗑️ File lama dihapus: ${file}`);
                        }
                    });
                }
            });
        });
    });
}, 5 * 60 * 1000); // Jalankan tiap 5 menit

if (!fs.existsSync(DOWNLOAD_FOLDER)) {
    fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
}

// Route utama
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint konversi
app.post("/convert", async (req, res) => {
    const { url } = req.body;

    if (!url || !url.includes("youtube")) {
        return res.status(400).json({ status: "error", message: "URL tidak valid." });
    }

    const filename = `audio_${Date.now()}.mp3`;
    const outputPath = path.join(DOWNLOAD_FOLDER, filename);

    try {
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        });

        const title = info.title;
        const duration = info.duration;
        const thumbnail = info.thumbnail;

        await youtubedl(url, {
            output: outputPath,
            extractAudio: true,
            audioFormat: "mp3",
            audioQuality: 0,
        });

        return res.json({
            status: "success",
            download_url: `/downloads/${filename}`,
            title,
            duration,
            thumbnail,
        });
    } catch (err) {
        console.error("Gagal mengonversi:", err.message);
        return res.status(500).json({ status: "error", message: "Gagal mengonversi video." });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
