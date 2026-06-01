import { Router } from "express";
import { createUser, getUser, getUserByWallet, savePosition, getLeaderboard } from "../controllers/userController.js";
import skillRoutes from "./skillRoutes.js";

const router = Router();

router.post("/", createUser);
router.get("/leaderboard", getLeaderboard);
router.get("/by-wallet/:address", getUserByWallet);
router.get("/:username", getUser);
router.patch("/:username/position", savePosition);
router.use("/:username/skills", skillRoutes);

export default router;
