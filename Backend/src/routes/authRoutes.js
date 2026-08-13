const express = require("express");

const router = express.Router();

const multer = require("multer");
const path = require("path");

const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/avatars");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const userId = req.body.userId || "guest";
    const ext = (path.extname(file.originalname) || ".png").toLowerCase();
    const dir = path.join(__dirname, "../../uploads/avatars");

    // Clean up any old image files belonging to this user (e.g., user-8.png, user-8.jpg)
    try {
      const files = fs.readdirSync(dir);
      files.forEach((f) => {
        if (f.startsWith(`user-${userId}.`)) {
          fs.unlinkSync(path.join(dir, f));
        }
      });
    } catch (err) {
      console.error("Avatar cleanup error:", err);
    }

    // Name the file strictly based on user ID: user-<userId>.<ext>
    cb(null, `user-${userId}${ext}`);
  }
});

const upload = multer({ storage });

const {
  register,
  login,
  uploadAvatar
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/avatar", upload.single("avatar"), uploadAvatar);

module.exports = router;