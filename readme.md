# NHL Props Tables

Modular Tabulator-based data tables for displaying NHL hockey betting information. Based on the College Basketball (CBB) props repository with enhancements from the NBA version including team abbreviation maps and a Player Team column.

## Tables

| Table | Supabase Source | Description |
|-------|----------------|-------------|
| Matchups | `HockeyMatchups` | Game matchups with spread and total |
| Prop Odds | `HockeyPlayerPropOdds` | Player prop odds with EV% and Kelly sizing |
| Game Odds | `HockeyGameOdds` | Game-level odds with EV% and Kelly sizing |

## Key Features

- **3 tables** with tab navigation (Matchups, Prop Odds, Game Odds)
- **Blue theme** — headers, tabs, and accents use deep blue (#1e40af)
- **NHL team abbreviation maps** — all 32 teams (ANA, BOS, BUF, CGY, etc.)
- **Player Team column** in Prop Odds (abbreviated, e.g., "VGK", "TOR")
- **Abbreviated matchups** on mobile/tablet (e.g., "VGK @ BOS")
- **NHL prop abbreviations** — Goals, Asts, Pts, SOG, Saves, Blk, Hits, PPP
- **No expandable rows** — each table pulls from a single Supabase endpoint
- **No IndexedDB caching** — memory cache only
- **No service worker**

## Directory Structure

```
nhl-props/
├── main.js                          # Entry point (3 tabs)
├── README.md                        # This file
├── shared/
│   ├── config.js                    # Supabase config + responsive helpers
│   └── utils.js                     # Minimal utility functions
├── components/
│   ├── customMultiSelect.js         # Multi-select dropdown filter
│   ├── minMaxFilter.js              # Min/Max range filter
│   ├── bankrollInput.js             # Kelly % bankroll input
│   └── tabManager.js                # 3-tab manager
├── tables/
│   ├── baseTable.js                 # Simplified base table class
│   ├── nhlMatchups.js               # Matchups flat table
│   ├── nhlPlayerPropOdds.js         # Player prop odds table (with Team column)
│   └── nhlGameOdds.js               # Game odds table
└── styles/
    └── tableStyles.js               # Blue-themed CSS styles
```

## Setup

### 1. HTML Structure

Add a table element to your HTML:

```html
<div id="nhl-table"></div>
```

### 2. Include Tabulator

```html
<link href="https://unpkg.com/tabulator-tables@5.5.0/dist/css/tabulator.min.css" rel="stylesheet">
<script src="https://unpkg.com/tabulator-tables@5.5.0/dist/js/tabulator.min.js"></script>
```

### 3. Include Scripts

Via jsDelivr CDN:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/nhl-props@main/main.js"></script>
```

## NHL Team Abbreviations

| Team | Abbreviation |
|------|-------------|
| Anaheim Ducks | ANA |
| Boston Bruins | BOS |
| Buffalo Sabres | BUF |
| Calgary Flames | CGY |
| Carolina Hurricanes | CAR |
| Chicago Blackhawks | CHI |
| Colorado Avalanche | COL |
| Columbus Blue Jackets | CBJ |
| Dallas Stars | DAL |
| Detroit Red Wings | DET |
| Edmonton Oilers | EDM |
| Florida Panthers | FLA |
| Los Angeles Kings | LAK |
| Minnesota Wild | MIN |
| Montreal Canadiens | MTL |
| Nashville Predators | NSH |
| New Jersey Devils | NJD |
| New York Islanders | NYI |
| New York Rangers | NYR |
| Ottawa Senators | OTT |
| Philadelphia Flyers | PHI |
| Pittsburgh Penguins | PIT |
| San Jose Sharks | SJS |
| Seattle Kraken | SEA |
| St. Louis Blues | STL |
| Tampa Bay Lightning | TBL |
| Toronto Maple Leafs | TOR |
| Utah Hockey Club | UTA |
| Vancouver Canucks | VAN |
| Vegas Golden Knights | VGK |
| Washington Capitals | WSH |
| Winnipeg Jets | WPG |

## NHL Prop Abbreviations

| Prop Type | Abbreviation |
|-----------|-------------|
| Goals | Goals |
| Assists | Asts |
| Points | Pts |
| Shots on Goal | SOG |
| Saves | Saves |
| Blocked Shots | Blk |
| Hits | Hits |
| Power Play Points | PPP |
| Goals + Assists | G+A |

## Features

### Filters
- **Text Search**: Name/Matchup columns have free-text search
- **Multi-Select Dropdown**: Prop, Label, Book, Team columns (opens above table)
- **Min/Max Range**: Line, Odds columns support min/max filtering
- **Bankroll Input**: Enter bankroll amount to convert Kelly % to dollar amounts

### Sorting
- All columns are sortable
- Custom sorters for odds (+/- prefix) and percentage values
- Default sort: Matchups by name, Prop Odds and Game Odds by EV% descending

### Responsive Design
- Desktop: Full table with scrollbar, full team names in Game Odds matchups
- Mobile/Tablet: Frozen first column (Name/Matchup), abbreviated team names, horizontal scroll

## Debugging

Access via console:

```javascript
// Get table instances
window.nhlTables

// Force refresh a table
window.nhlTables.table0.refreshData()

// Get current tab manager
window.tabManager
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires ES6 module support.

## Responsive Breakpoints

| Breakpoint | Screen Width | Behavior |
|------------|--------------|----------|
| Mobile | <= 768px | Frozen first column, 10px font |
| Tablet | 769-1024px | Frozen first column, 11px font |
| Desktop | > 1024px | Full table, 12px font, visible scrollbar |

## Differences from CBB Version

| Feature | CBB | NHL |
|---------|-----|-----|
| Theme color | Goldenrod (#b8860b) | Blue (#1e40af) |
| Team abbreviations | None (full names) | All 32 NHL teams |
| Player Team column | Not available | Included (abbreviated) |
| Matchup display | Full names | Abbreviated on mobile/tablet |
| Prop abbreviations | Basketball (3-Pt, P+A) | Hockey (SOG, PPP, Blk) |
| Supabase tables | CBBall* | Hockey* |
| HTML mount | #cbb-table | #nhl-table |
