const { S3Client, GetObjectCommand, DeleteObjectCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const stream = require('stream');

// ✅ Configure S3 client
const s3 = new S3Client({
    region: 'eu-west-2',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET;

// 🧰 Multer for uploading
const upload = multer({
    storage: multerS3({
        s3,
        bucket: BUCKET,
        acl: 'public-read', // Change to 'private' if needed
        key: (req, file, cb) => {
            const fileName = `${Date.now()}-${file.originalname}`;
            cb(null, fileName);
        },
    }),
});

const uploadSingle = upload.single('file');

// 📤 Upload controller
exports.uploadToS3 = (req, res) => {
    uploadSingle(req, res, (err) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(200).json({
            message: 'File uploaded',
            url: req.file.location,
            key: req.file.key,
        });
    });
};

// 📥 Download file
exports.downloadFromS3 = async (req, res) => {
    const key = req.query.key;  // get key from query params
    console.log('Download key:', key);
    if (!key) {
        return res.status(400).json({ error: 'Missing key query parameter' });
    }

    try {
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
        const data = await s3.send(command);
        // Enhanced caching headers
        const fileExtension = key.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);

        res.set({
            'Content-Type': data.ContentType || 'application/octet-stream',
            'Cache-Control': isImage
                ? 'public, max-age=31536000, immutable' 
                : 'public, max-age=86400', 
            'ETag': data.ETag, 
            'Last-Modified': new Date(data.LastModified).toUTCString(),
            'Expires': new Date(Date.now() + (isImage ? 31536000000 : 86400000)).toUTCString()
        });
      
        if (req.headers['if-none-match'] === data.ETag) {
            return res.status(304).end();
        }
        data.Body.pipe(res);

        data.Body.on('error', (err) => {
            console.error('Stream error:', err);
            res.status(500).end();
        });
    } catch (err) {
        console.error('Download error:', err);
        res.status(404).json({ error: 'File not found', details: err.message });
    }
};


exports.deleteFromS3 = async (req, res) => {
    const key = req.params.key;

    try {
        const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
        await s3.send(command);

        res.status(200).json({ message: 'File deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed', details: err.message });
    }
};
exports.checkS3Connection = async () => {
    try {
        const command = new ListBucketsCommand({});
        const data = await s3.send(command);
        console.log('Connected! Buckets:', data.Buckets);
    } catch (err) {
        console.error('Connection failed:', err);
    }
}
