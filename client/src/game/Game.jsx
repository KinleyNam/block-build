import { useEffect, useRef, useState } from "react";

// Set to false to re-enable MetaMask/escrow for PvP gold
const SKIP_ESCROW = true;
import Phaser from "phaser";
import EscapeMenu from "../EscapeMenu";
import MarketplaceChoice from "../MarketplaceChoice";
import BuyAndSell from "../BuyAndSell";
import { PvPChallengePanel, PvPReceivePanel, PvPToast } from "../PvPRequestUI";
import BuildingManageUI from "../BuildingManageUI";
import WorkerUI from "../WorkerUI";
import WorkSessionUI, {
  WorkCompleteToast, OwnerWorkToast, HireRequestToast, FiredToast, RejectedToast, ResignedToast, AcceptedToast,
} from "../WorkSessionUI";
import LoadingScene from "./scenes/LoadingScene";
import StarterAreaScene from "./scenes/StarterAreaScene";
import VillageOutskirtsScene from "./scenes/VillageOutskirtsArea";
import MarketPlace from "./scenes/MarketPlace";
import ComDistrictScene from "./scenes/CommercialDistrict";
import PvPArena from "./scenes/PvPArena";
import UIScene from "./scenes/UIScene";
import socket from "./socket";
import gameState, { BUILDING_TYPES } from "./gameState";
import { depositToEscrow, joinEscrow } from "./contractService";
import { isConnected } from "./wallet";

const gameContainerStyle = { width: "100%", height: "100%" };

function lockGame(open) {
  window.dispatchEvent(new CustomEvent("escape-menu", { detail: { open } }));
}

export default function Game() {
  const gameRef    = useRef(null);
  const phaserGame = useRef(null);

  const [menuOpen,       setMenuOpen]       = useState(false);
  const [choiceOpen,     setChoiceOpen]     = useState(false);
  const [buyAndSellOpen, setBuyAndSellOpen] = useState(false);

  // PvP state
  const [pvpChallengeOpen, setPvpChallengeOpen] = useState(false);
  const [pvpReceiveOpen,   setPvpReceiveOpen]   = useState(false);
  const [pvpSendPending,   setPvpSendPending]   = useState(false);
  const [pvpAcceptPending, setPvpAcceptPending] = useState(false);
  const [pvpAcceptError,   setPvpAcceptError]   = useState("");
  const [declinedToast,     setDeclinedToast]     = useState(null);
  const [buildingManage,    setBuildingManage]    = useState(null); // { parcelId, parcelLabel } or null

  // Worker / hire system state
  const [workerUI,       setWorkerUI]       = useState(null); // { parcelId, parcelLabel } or null
  const [workSession,    setWorkSession]    = useState(null); // { parcelId, buildingType, buildingLevel } or null
  const [workToast,      setWorkToast]      = useState(null); // WorkCompleteToast data
  const [ownerWorkToast, setOwnerWorkToast] = useState(null); // OwnerWorkToast data
  const [hireToast,      setHireToast]      = useState(null); // HireRequestToast data
  const [firedToast,     setFiredToast]     = useState(null); // { buildingName, buildingLevel }
  const [rejectedToast,  setRejectedToast]  = useState(false);
  const [acceptedToast,  setAcceptedToast]  = useState(null); // { buildingName, buildingLevel }
  const [resignedToast,  setResignedToast]  = useState(null); // { workerUsername }
  const pvpChallengeRef = useRef(null); // { targetId, targetUsername }
  const pvpReceiveRef   = useRef(null); // { challengerId, challengerUsername, challengerWallet, betAmount }

  // ESC toggle
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Escape") return;
      if (choiceOpen || buyAndSellOpen || pvpChallengeOpen || pvpReceiveOpen) return;
      setMenuOpen(prev => {
        const next = !prev;
        lockGame(next);
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choiceOpen, buyAndSellOpen, pvpChallengeOpen, pvpReceiveOpen]);

  // Goddess / marketplace choice
  useEffect(() => {
    const handler = () => {
      setChoiceOpen(true);
      lockGame(true);
    };
    window.addEventListener("show-marketplace-choice", handler);
    return () => window.removeEventListener("show-marketplace-choice", handler);
  }, []);

  // ── Building management overlay (owner presses E at signboard) ───────────
  useEffect(() => {
    const handler = (e) => {
      setBuildingManage(e.detail);
      lockGame(true);
    };
    window.addEventListener("show-building-manage", handler);
    return () => window.removeEventListener("show-building-manage", handler);
  }, []);

  const handleBuildingManageClose = () => {
    setBuildingManage(null);
    lockGame(false);
  };

  // ── Worker UI (non-owner presses E at signboard) ───────────────────────────
  useEffect(() => {
    const handler = (e) => { setWorkerUI(e.detail); lockGame(true); };
    window.addEventListener("show-worker-ui", handler);
    return () => window.removeEventListener("show-worker-ui", handler);
  }, []);

  const handleWorkerUIClose = () => { setWorkerUI(null); lockGame(false); };

  // ── Work session (fired from WorkerUI via CustomEvent) ────────────────────
  useEffect(() => {
    const handler = (e) => {
      setWorkerUI(null);    // close WorkerUI without lockGame(false)
      setWorkSession(e.detail); // game is already locked from when WorkerUI opened
    };
    window.addEventListener("start-work-session", handler);
    return () => window.removeEventListener("start-work-session", handler);
  }, []);

  const handleWorkSessionComplete = (data) => {
    gameState.gold += data.workerGold;
    const sk = gameState.skills[data.skillType];
    if (sk) {
      sk.exp  += data.expGain;
      sk.level = Math.floor(sk.exp / 100) + 1;
    }
    gameState.isWorking     = false;
    gameState.hiredAtParcel = null;
    gameState._emit();
    setWorkSession(null);
    lockGame(false);
    setWorkToast(data);
  };

  const handleWorkSessionCancel = () => {
    gameState.isWorking = false;
    setWorkSession(null);
    lockGame(false);
  };

  // ── Socket: owner receives a hire request ─────────────────────────────────
  useEffect(() => {
    const handler = (data) => setHireToast(data);
    socket.on("newHireRequest", handler);
    return () => socket.off("newHireRequest", handler);
  }, []);

  // ── Socket: owner's worker completed a session ────────────────────────────
  useEffect(() => {
    const handler = (data) => {
      gameState.gold += data.ownerGold;
      gameState._emit();
      setOwnerWorkToast(data);
    };
    socket.on("workerSessionComplete", handler);
    return () => socket.off("workerSessionComplete", handler);
  }, []);

  // ── Socket: player was fired (show toast; WorkSessionUI handles its own close) ──
  useEffect(() => {
    const handler = (data) => {
      const building     = gameState.placedBuildings?.[data?.parcelId];
      const buildingType = building?.buildingType ?? 0;
      setFiredToast({
        buildingName:  BUILDING_TYPES[buildingType]?.name ?? "Building",
        buildingLevel: building?.level ?? 1,
      });
    };
    socket.on("youAreFired", handler);
    return () => socket.off("youAreFired", handler);
  }, []);

  // ── Socket: hire request was accepted ────────────────────────────────────
  useEffect(() => {
    const handler = (data) => {
      const building     = gameState.placedBuildings?.[data.parcelId];
      const buildingType = building?.buildingType ?? 0;
      setAcceptedToast({
        buildingName:  BUILDING_TYPES[buildingType]?.name ?? "Building",
        buildingLevel: building?.level ?? 1,
      });
    };
    socket.on("hireRequestAccepted", handler);
    return () => socket.off("hireRequestAccepted", handler);
  }, []);

  // ── Socket: hire request was rejected ────────────────────────────────────
  useEffect(() => {
    const handler = () => setRejectedToast(true);
    socket.on("hireRequestRejected", handler);
    return () => socket.off("hireRequestRejected", handler);
  }, []);

  // ── Socket: owner notified when their worker resigns ─────────────────────
  useEffect(() => {
    const handler = (data) => {
      const building     = gameState.placedBuildings?.[data?.parcelId];
      const buildingType = building?.buildingType ?? 0;
      setResignedToast({
        ...data,
        buildingName:  BUILDING_TYPES[buildingType]?.name ?? "Building",
        buildingLevel: building?.level ?? 1,
      });
    };
    socket.on("workerResigned", handler);
    return () => socket.off("workerResigned", handler);
  }, []);

  // ── Socket: PvP request blocked because target is working ────────────────
  useEffect(() => {
    const handler = () => { setPvpChallengeOpen(false); lockGame(false); };
    socket.on("pvpTargetWorking", handler);
    return () => socket.off("pvpTargetWorking", handler);
  }, []);

  // ── PvP: challenger presses G near a player ────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      pvpChallengeRef.current = e.detail;
      setPvpChallengeOpen(true);
      lockGame(true);
    };
    window.addEventListener("show-pvp-challenge", handler);
    return () => window.removeEventListener("show-pvp-challenge", handler);
  }, []);

  // ── PvP: socket — incoming request from challenger ─────────────────────────
  useEffect(() => {
    const onRequest = (data) => {
      pvpReceiveRef.current = data;
      setPvpReceiveOpen(true);
      lockGame(true);
    };
    socket.on("pvpRequest", onRequest);
    return () => socket.off("pvpRequest", onRequest);
  }, []);

  // ── PvP: challenger declined ───────────────────────────────────────────────
  useEffect(() => {
    const onDeclined = () => {
      const name = pvpChallengeRef.current?.targetUsername ?? "Player";
      console.log("[PvP] pvpDeclined received, showing toast for:", name);
      setPvpChallengeOpen(false);
      lockGame(false);
      setDeclinedToast(name);
    };
    socket.on("pvpDeclined", onDeclined);
    return () => socket.off("pvpDeclined", onDeclined);
  }, []);

  // ── PvP: request timed out (A's gold already being refunded by server) ─────
  useEffect(() => {
    const onTimeout = () => {
      setPvpChallengeOpen(false);
      lockGame(false);
    };
    socket.on("pvpTimeout", onTimeout);
    return () => socket.off("pvpTimeout", onTimeout);
  }, []);

  // ── PvP: B's panel closes when A's request expires ─────────────────────────
  useEffect(() => {
    const onExpired = () => {
      setPvpReceiveOpen(false);
      setPvpAcceptPending(false);
      setPvpAcceptError("");
      lockGame(false);
    };
    socket.on("pvpRequestExpired", onExpired);
    return () => socket.off("pvpRequestExpired", onExpired);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMenuClose = () => {
    setMenuOpen(false);
    lockGame(false);
  };

  const handleChoiceMarketplace = () => {
    setChoiceOpen(false);
    setBuyAndSellOpen(true);
  };

  const handleChoiceCancel = () => {
    setChoiceOpen(false);
    lockGame(false);
  };

  const handleBuyAndSellClose = () => {
    setBuyAndSellOpen(false);
    lockGame(false);
  };

  // Challenger sends bet amount
  const handlePvpSend = async (betAmount) => {
    const { targetId } = pvpChallengeRef.current ?? {};
    if (!targetId) return;
    if (betAmount > gameState.gold) return;

    let escrowId = null;

    if (!SKIP_ESCROW && isConnected() && betAmount > 0) {
      setPvpSendPending(true);
      try {
        escrowId = await depositToEscrow(betAmount);
      } catch {
        setPvpSendPending(false);
        return; // user cancelled MetaMask — stay on panel
      }
      setPvpSendPending(false);
    }

    socket.emit("pvpRequest", {
      targetId,
      betAmount,
      escrowId,
      challengerWallet:        gameState.walletAddress,
      challengerUsername:      gameState.username,
      challengerGender:        gameState.gender,
      challengerCustomization: gameState.customization,
    });

    setPvpChallengeOpen(false);
    // Keep game locked — waiting for opponent to accept/decline
  };

  const handlePvpChallengeCancel = () => {
    setPvpChallengeOpen(false);
    lockGame(false);
  };

  // Challenged player accepts
  const handlePvpAccept = async () => {
    const data = pvpReceiveRef.current;
    if (!data) return;

    if (!SKIP_ESCROW && isConnected() && data.betAmount > 0) {
      // Tell server immediately so it cancels the 10s timeout before MetaMask opens
      socket.emit("pvpAccepting", { challengerId: data.challengerId });
      setPvpAcceptPending(true);
      setPvpAcceptError("");
      try {
        await joinEscrow(data.escrowId, data.betAmount);
      } catch {
        // User cancelled MetaMask — decline so server refunds the challenger
        setPvpAcceptPending(false);
        setPvpAcceptError("Approval cancelled. Match declined.");
        socket.emit("pvpDeclined", { challengerId: data.challengerId });
        return;
      }
      setPvpAcceptPending(false);
    }

    socket.emit("pvpAccepted", {
      challengerId:     data.challengerId,
      targetWallet:     gameState.walletAddress,
      targetUsername:   gameState.username,
      targetGender:     gameState.gender,
      targetCustomization: gameState.customization,
    });

    setPvpReceiveOpen(false);
    // Keep game locked — pvpStart from server triggers scene transition
  };

  const handlePvpDecline = () => {
    const data = pvpReceiveRef.current;
    if (data) socket.emit("pvpDeclined", { challengerId: data.challengerId });
    setPvpReceiveOpen(false);
    setPvpAcceptPending(false);
    setPvpAcceptError("");
    lockGame(false);
  };

  // ── Phaser bootstrap ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phaserGame.current || !gameRef.current) return undefined;

    const config = {
      type: Phaser.AUTO,
      width:  gameRef.current.clientWidth  || window.innerWidth,
      height: gameRef.current.clientHeight || window.innerHeight,
      parent: gameRef.current,
      pixelArt:     true,
      antialias:    false,
      antialiasGL:  false,
      render: { roundPixels: true },
      physics: {
        default: "arcade",
        arcade:  { gravity: { y: 0 }, debug: false },
      },
      scene: [
        LoadingScene,
        StarterAreaScene,
        VillageOutskirtsScene,
        MarketPlace,
        ComDistrictScene,
        PvPArena,
        UIScene,
      ],
      scale: {
        mode:   Phaser.Scale.RESIZE,
        width:  "100%",
        height: "100%",
      },
    };

    phaserGame.current = new Phaser.Game(config);

    return () => {
      if (phaserGame.current) {
        phaserGame.current.destroy(true);
        phaserGame.current = null;
      }
    };
  }, []);

  return (
    <>
      <div ref={gameRef} style={gameContainerStyle} />

      {menuOpen && <EscapeMenu onClose={handleMenuClose} />}

      {choiceOpen && (
        <MarketplaceChoice
          onMarketplace={handleChoiceMarketplace}
          onCancel={handleChoiceCancel}
        />
      )}

      {buyAndSellOpen && <BuyAndSell onBack={handleBuyAndSellClose} />}

      {pvpChallengeOpen && (
        <PvPChallengePanel
          targetUsername={pvpChallengeRef.current?.targetUsername ?? "Player"}
          onSend={handlePvpSend}
          onCancel={handlePvpChallengeCancel}
          myGold={gameState.gold}
          pending={pvpSendPending}
        />
      )}

      {pvpReceiveOpen && (
        <PvPReceivePanel
          challengerUsername={pvpReceiveRef.current?.challengerUsername ?? "Player"}
          betAmount={pvpReceiveRef.current?.betAmount ?? 0}
          onAccept={handlePvpAccept}
          onDecline={handlePvpDecline}
          pending={pvpAcceptPending}
          error={pvpAcceptError}
        />
      )}

      {declinedToast && (
        <PvPToast
          username={declinedToast}
          onDone={() => setDeclinedToast(null)}
        />
      )}

      {buildingManage && (
        <BuildingManageUI
          parcelId={buildingManage.parcelId}
          parcelLabel={buildingManage.parcelLabel}
          onClose={handleBuildingManageClose}
        />
      )}

      {workerUI && (
        <WorkerUI
          parcelId={workerUI.parcelId}
          parcelLabel={workerUI.parcelLabel}
          onClose={handleWorkerUIClose}
        />
      )}

      {workSession && (
        <WorkSessionUI
          parcelId={workSession.parcelId}
          buildingType={workSession.buildingType}
          buildingLevel={workSession.buildingLevel}
          onComplete={handleWorkSessionComplete}
          onCancel={handleWorkSessionCancel}
        />
      )}

      {workToast      && <WorkCompleteToast  data={workToast}      onDone={() => setWorkToast(null)}      />}
      {ownerWorkToast && <OwnerWorkToast     data={ownerWorkToast} onDone={() => setOwnerWorkToast(null)} />}
      {hireToast      && <HireRequestToast   data={hireToast}      onDone={() => setHireToast(null)}      />}
      {firedToast     && <FiredToast    data={firedToast}            onDone={() => setFiredToast(null)}     />}
      {acceptedToast  && <AcceptedToast  data={acceptedToast}       onDone={() => setAcceptedToast(null)}  />}
      {rejectedToast  && <RejectedToast                            onDone={() => setRejectedToast(false)} />}
      {resignedToast  && <ResignedToast data={resignedToast}       onDone={() => setResignedToast(null)}  />}
    </>
  );
}
