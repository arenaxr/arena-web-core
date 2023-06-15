[...document.querySelectorAll("[media=print]")].map((el) =>
    el.addEventListener("load", (e) => {
        e.target.media = "all";
    })
);
