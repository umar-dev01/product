const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const AppError = require("../utils/appError");

const HIGH_QUALITY_JPEG = {
  quality: 100,
  progressive: true,
  mozjpeg: true,
  chromaSubsampling: "4:4:4",
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

// Multer configuration
const multerStorage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
exports.uploadSingleImage = upload.single("image");
exports.uploadMultipleImages = upload.array("images", 5);

exports.resizeSingleImage = async (req, res, next) => {
  if (!req.file) return next();

  // Create unique filename
  const filename = `user-${Date.now()}.jpeg`;
  const usersDir = path.join(__dirname, "..", "public", "images", "users");

  await ensureDir(usersDir);

  // Process image with sharp
  await sharp(req.file.buffer)
    .resize(2000, 2000, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .toFormat("jpeg")
    .jpeg(HIGH_QUALITY_JPEG)
    .toFile(path.join(usersDir, filename));

  // Save filename to request body
  req.body.image = `/images/users/${filename}`;

  next();
};
exports.resizeMultipleImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  req.body.images = [];
  const productsDir = path.join(
    __dirname,
    "..",
    "public",
    "images",
    "products",
  );

  await ensureDir(productsDir);

  for (const file of req.files) {
    const filename = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpeg`;

    await sharp(file.buffer)
      .resize(2400, 2400, {
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .toFormat("jpeg")
      .jpeg(HIGH_QUALITY_JPEG)
      .toFile(path.join(productsDir, filename));

    req.body.images.push(`/images/products/${filename}`);
  }

  next();
};
