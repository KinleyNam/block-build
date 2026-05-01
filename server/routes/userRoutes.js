import { Router } from "express";
import { createUser, getUser } from "../controllers/userController.js";
import skillRoutes from "./skillRoutes.js";

const router = Router();

router.post("/", createUser);
router.get("/:username", getUser);
router.use("/:username/skills", skillRoutes);

export default router;
