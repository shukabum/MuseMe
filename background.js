let spotifyAccessToken = null;
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed");
  getAccessToken();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request == "get_mood") {
    (async () => {
      let timeNow = Date.now();
      let pastHours = 2;
      let startTime = timeNow - pastHours * 60 * 60 * 1000;
      let historyText = await new Promise((resolve) => {
        chrome.history.search(
          { text: "", startTime: startTime, maxResults: 30 },
          (historyItems) => {
            let titles = historyItems
              .map((item) => item.title)
              .filter((title) => title && title.length > 5);
            let text = titles.join(", ");
            text = text.replace(/\d+/g, "");
            text = text.replace(
              /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
              ""
            );
            if (text.length > 120) {
              text = text.slice(-80);
            }
            resolve(text);
          }
        );
      });
      console.log(historyText);
      let detectedMood = await getMoodFromAPI(historyText);
      console.log(detectedMood);
      await getSong(detectedMood).then((playlist) => {
        console.log(playlist);
        chrome.storage.local.set({ mood: detectedMood, song: playlist }, () => {
          sendResponse({
            mood: detectedMood,
            song: playlist,
          });
        });
      });
    })();
    return true;
  }
});

async function getMoodFromAPI(userText) {
  const apiKey = "YOUR_API_KEY";
  const url = "https://api.aimlapi.com/v1/chat/completions";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        messages: [
          {
            role: "system",
            content:
              "Analyze this browsing history and classify the mood in 1 emotional state. Respond with single word only.",
          },
          { role: "user", content: userText },
        ],
        temperature: 0.7,
        max_tokens: 256,
      }),
    });

    const data = await response.json();
    console.log(data);
    let word = data.choices[0].message.content;
    console.log(data.choices[0].message.content);
    return word;
  } catch (error) {
    console.error("API Error:", error);
    return "Error detecting mood.";
  }
}

async function getSong(mood) {
  if (!spotifyAccessToken) {
    await getAccessToken();
  }
  let apiUrl = `https://api.spotify.com/v1/search?q=${mood}&type=track&limit=1`;

  try {
    let response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${spotifyAccessToken}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    let data = await response.json();
    if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
      console.warn("No songs found for mood:", mood);
      return "https://open.spotify.com/";
    }
    return data.tracks.items[0].external_urls.spotify;
  } catch (error) {
    console.error("Error fetching Spotify song:", error);
    return "https://open.spotify.com/";
  }
}

async function getAccessToken() {
  let url = "https://accounts.spotify.com/api/token";
  let clientId = "YOUR_SPOTIFY_CLIENT_ID";
  let clientSecret = "SECRET_TOKEN";

  let response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
    },
    body: "grant_type=client_credentials",
  });

  let data = await response.json();
  spotifyAccessToken = data.access_token;
}
