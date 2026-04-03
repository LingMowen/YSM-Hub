import multer from 'multer';
import { fixFilenameEncoding } from '../../src/utils/common.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const originalname = fixFilenameEncoding(file.originalname);
  if (originalname.endsWith('.ysm') || originalname.endsWith('.zip')) {
    cb(null, true);
  } else {
    cb(new Error('只接受.ysm 或.zip 格式的文件'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

export default upload;
