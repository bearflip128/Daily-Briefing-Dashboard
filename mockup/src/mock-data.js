const dashboardData = {
  time: {
    hourMinute: "5:37",
    meridiem: "PM",
    date: "Tue, May 12"
  },
  weather: {
    temp: "43&deg;",
    city: "Chicago",
    high: "49&deg;",
    low: "36&deg;"
  },
  cta: {
    station: "Fullerton",
    arrivals: [
      { badge: "R", minutes: "4 min", direction: "How", tone: "red" },
      { badge: "B", minutes: "6 min", direction: "Loop", tone: "brown" },
      { badge: "P", minutes: "9 min", direction: "Ldn", tone: "purple" }
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
