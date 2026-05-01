import { Router } from "express";
import { getSkills, addExp } from "../controllers/skillController.js";

const router = Router({ mergeParams: true });

router.get("/", getSkills);
router.patch("/:skill/exp", addExp);

export default router;
