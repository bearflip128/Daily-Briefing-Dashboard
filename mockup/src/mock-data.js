const dashboardData = {
  time: {
    hourMinute: "5:37",
    meridiem: "PM",
    date: "Tue, May 12"
  },
  status: {
    wifiConnected: false
  },
  weather: {
    temp: "43&deg;",
    city: "Chicago",
    high: "49&deg;",
    low: "36&deg;"
  },
  cta: {
    station: "Fullerton",
    recommendation: "WAIT 1m",
    arrivals: [
      { badge: "R", minutes: "18m", direction: "How", tone: "red" },
      { badge: "B", minutes: "22m", direction: "Loop", tone: "brown" },
      { badge: "P", minutes: "27m", direction: "Ldn", tone: "purple" }
    ]
  },
  markets: [
    { label: "S&P 500", percent: "+0.71%", direction: "positive" },
    { label: "VXUS", percent: "+0.42%", direction: "positive" },
    { label: "BTC", percent: "-1.23%", direction: "negative" }
  ],
  quote: {
    text: "Discipline compounds quietly.",
    author: "James Clear"
  }
};
