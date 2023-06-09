[...document.querySelectorAll("[media=print]")].map((e) => e.addEventListener("load", (e) => e.target.media = "all"));
