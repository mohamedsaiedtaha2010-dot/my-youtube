const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const dbPath = path.join(__dirname, 'database.json');

function readDatabase() {
    if (!fs.existsSync(dbPath)) return [];
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const videos = JSON.parse(data || '[]');
        return videos.map((video, index) => {
            if (!video.id) video.id = (Date.now() + index).toString();
            return video;
        });
    } catch (e) { return []; }
}

function writeDatabase(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('videoFile'), (req, res) => {
    if (!req.file) return res.status(400).send('لم يتم اختيار أي فيديو!');
    let videosDatabase = readDatabase();
    const newVideo = {
        id: Date.now().toString(),
        title: req.body.videoTitle || 'فيديو بدون عنوان',
        url: `/uploads/${req.file.filename}`,
        likes: 0,
        comments: []
    };
    videosDatabase.unshift(newVideo);
    writeDatabase(videosDatabase);
    res.redirect('/');
});

app.get('/api/videos', (req, res) => {
    res.json(readDatabase());
});

app.post('/api/videos/:id/like', (req, res) => {
    const videoId = req.params.id;
    let videosDatabase = readDatabase();
    videosDatabase = videosDatabase.map(video => {
        if (video.id === videoId) return { ...video, likes: (video.likes || 0) + 1 };
        return video;
    });
    writeDatabase(videosDatabase);
    res.json({ success: true });
});

app.post('/api/videos/:id/comment', (req, res) => {
    const videoId = req.params.id;
    const commentText = req.body.comment;
    if (!commentText || commentText.trim() === "") return res.status(400).json({ error: 'التعليق فارغ!' });
    let videosDatabase = readDatabase();
    videosDatabase = videosDatabase.map(video => {
        if (video.id === videoId) {
            const currentComments = video.comments || [];
            currentComments.push(commentText);
            return { ...video, comments: currentComments };
        }
        return video;
    });
    writeDatabase(videosDatabase);
    res.json({ success: true });
});

// 🗑️ القناة الجديدة لحذف الفيديو من قاعدة البيانات والملفات
app.delete('/api/videos/:id', (req, res) => {
    const videoId = req.params.id;
    let videosDatabase = readDatabase();
    
    // العثور على الفيديو المطلوب لحذف ملفه الحقيقي من مجلد uploads أولاً لحفظ مساحة اللابتوب
    const videoToDelete = videosDatabase.find(v => v.url.includes(videoId) || v.id === videoId);
    if (videoToDelete) {
        const filePath = path.join(__dirname, videoToDelete.url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // حذف الملف من الهارد ديسك 💾
        }
    }

    // فلترة القائمة واستبعاد الفيديو المحذوف من قاعدة البيانات
    videosDatabase = videosDatabase.filter(video => video.id !== videoId);
    writeDatabase(videosDatabase);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 سيرفر يوتيوب المطور بميزة الحذف جاهز للعمل!`);
    console.log(`🌐 الرابط: http://localhost:${PORT}`);
    console.log(`==================================================`);
});
