import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

export const toast = ({
  text,
  duration = 3000,
  gravity = "bottom",
  position = "right",
  level = "info",
}: {
  text: string;
  duration?: number;
  gravity?: "bottom" | "top";
  position?: "left" | "right" | "center";
  level?: "info" | "error";
}) => {
  Toastify({
    text,
    duration,
    gravity,
    position,
    style: {
      background:
        level === "info"
          ? "linear-gradient(to right, #00b09b, #96c93d)"
          : "linear-gradient(to right, #ff5f6d, #ffc371)",
    },
    stopOnFocus: true,
  }).showToast();
};
