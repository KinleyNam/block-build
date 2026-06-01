import { Router } from "express";
import { createUser, getUser, getUserByWallet, savePosition, getLeaderboard, saveCustomization } from "../controllers/userController.js";
import skillRoutes from "./skillRoutes.js";

const router = Router();

router.post("/", createUser);
router.get("/leaderboard", getLeaderboard);
router.get("/by-wallet/:address", getUserByWallet);
router.get("/:username", getUser);
router.patch("/:username/position", savePosition);
router.patch("/:username/customization", saveCustomization);
router.use("/:username/skills", skillRoutes);

export default router;
