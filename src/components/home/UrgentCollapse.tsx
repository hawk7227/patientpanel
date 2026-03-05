"use client";

import { useEffect } from "react";

export default function UrgentCollapse() {
  useEffect(() => {
    const urgentToggle = document.getElementById("urgentCareToggle");
    const urgentContent = document.getElementById("urgentCareContent");

    if (!urgentToggle || !urgentContent) return;

    const handleClick = () => {
      if (
        urgentContent.style.maxHeight === "0px" ||
        urgentContent.style.maxHeight === "0"
      ) {
        urgentContent.style.maxHeight =
          urgentContent.scrollHeight + "px";
        urgentToggle.textContent = "Hide Information";
      } else {
        urgentContent.style.maxHeight = "0";
        urgentToggle.textContent = "Learn More About Urgent Care";
      }
    };

    urgentToggle.addEventListener("click", handleClick);

    return () => urgentToggle.removeEventListener("click", handleClick);
  }, []);

  return null;
}
