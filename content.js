document.addEventListener("keypress", function (e) {
  let typingSpeed = e.timeStamp;
  let typedText = document.activeElement.value;

  chrome.runtime.sendMessage({ speed: typingSpeed, text: typedText });
});
