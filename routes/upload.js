const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const auth = require('../middleware/auth');

// Multer memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Configure Cloudinary from env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// @route    POST api/upload
// @desc     Upload file (avatar/resume) to Cloudinary
// @access   Private
router.post('/', [auth, upload.single('file')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Stream the file buffer directly to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'kaami_ledger',
        resource_type: 'auto', // Auto-detect image vs raw/pdf files
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          return res.status(500).json({ msg: 'Cloudinary upload failed', error });
        }
        res.json({
          secure_url: result.secure_url,
          public_id: result.public_id,
          format: result.format
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error("Upload Route Error:", err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
