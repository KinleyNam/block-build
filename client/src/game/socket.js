import { io } from "socket.io-client";

const SERVER_URL = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : `http://${window.location.hostname}:3000`;

const socket = io(SERVER_URL);
export default socket;
