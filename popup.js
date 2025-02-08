document.getElementById("fetchMood").addEventListener("click", function () {
  chrome.runtime.sendMessage("get_mood", (response) => {
    console.log(response);
    document.getElementById("moodText").innerText = response.mood;
    let songLink = document.getElementById("songLink");
    songLink.href = response.song;
    songLink.style.display = "block";
  });
});
