import express from "express";
import multer from "multer";
import { analyzeUrl, analyzePdf, getHistory} from "../controllers/analyzeControllers.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/url", analyzeUrl);
router.post("/pdf", upload.single("file"), analyzePdf);
router.get('/history', getHistory);

export default router;
