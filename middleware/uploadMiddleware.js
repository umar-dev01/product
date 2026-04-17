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

const getImageOutputConfig = (file) => {
  const mimeType = file.mimetype;

  if (mimeType === "image/png") {
    return { extension: "png", format: "png" };
  }

  if (mimeType === "image/webp") {
    return { extension: "webp", format: "webp" };
  }

  return { extension: "jpeg", format: "jpeg" };
};

const productImageTransform = (fileBuffer, outputConfig, width, height) => {
  const transformer = sharp(fileBuffer).resize(width, height, {
    fit: "inside",
    withoutEnlargement: true,
    kernel: sharp.kernel.lanczos3,
  });

  if (outputConfig.format === "png") {
    return transformer.png({ compressionLevel: 6, adaptiveFiltering: true });
  }

  if (outputConfig.format === "webp") {
    return transformer.webp({ quality: 98, effort: 4 });
  }

  return transformer.jpeg({
    quality: 98,
    progressive: false,
    mozjpeg: false,
    chromaSubsampling: "4:4:4",
  });
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

  const outputConfig = getImageOutputConfig(req.file);

  // Create unique filename
  const filename = `user-${Date.now()}.${outputConfig.extension}`;
  const usersDir = path.join(__dirname, "..", "public", "images", "users");

  await ensureDir(usersDir);

  // Process image with sharp
  await productImageTransform(req.file.buffer, outputConfig, 2400, 2400).toFile(
    path.join(usersDir, filename),
  );

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
    const outputConfig = getImageOutputConfig(file);
    const filename = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}.${outputConfig.extension}`;

    await productImageTransform(file.buffer, outputConfig, 3200, 3200).toFile(
      path.join(productsDir, filename),
    );

    req.body.images.push(`/images/products/${filename}`);
  }

  next();
};
