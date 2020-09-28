window.addEventListener('load', (event) => {
  if (AFRAME.utils.device.isMobile()) return;

  let modal = document.createElement("div");
  modal.className = "modal";

  let modalContent = document.createElement("div");
  modalContent.className = "modal-content"

  let span = document.createElement("span");
  span.className = "close";
  span.innerHTML="&times;";
  modalContent.appendChild(span);

  let img = document.createElement("img");
  img.src = "https://cdn.glitch.com/0a2ab758-6d0c-4278-a011-fc4cf4dd9498%2FAug-29-2020%2010-57-55.gif?v=1598713843258";
  img.className="intro_img";
  modalContent.appendChild(img);

  let checkBox = document.createElement("input");
  checkBox.setAttribute("type", "checkbox");
  checkBox.setAttribute("id", "dontshow");
  modalContent.appendChild(checkBox);

  let label = document.createElement("label");
  label.innerHTML="Do not show again.";
  label.setAttribute("for", "dontshow");
  modalContent.appendChild(label);

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    modal.style.display = "none";
  }

  checkBox.onclick = function(event) {
   if (checkBox.checked == true){
      localStorage.setItem('arena_intro_noshow', 'True');
    } else {
      localStorage.removeItem('arena_intro_noshow');
    }
  }

  const noshow = localStorage.getItem('arena_intro_noshow');
  if (noshow==null)
    modal.style.display = "block";
});
