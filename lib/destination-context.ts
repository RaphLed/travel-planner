/**
 * Fixed backbone: contextual info per destination for the trip universe.
 * Best time to visit and must-see spots (sourced from established travel guides and seasonal norms).
 * Keyed by normalized region/city name (case-insensitive match).
 */

export type DestinationContext = {
  /** When to go (e.g. "April–June, September–October") */
  bestTime: string;
  /** Why that period (weather, events, crowds) */
  bestTimeWhy: string;
  /** Must-see spots with short reason */
  topSights: { name: string; why: string }[];
};

const CONTEXT: Record<string, DestinationContext> = {
  Paris: {
    bestTime: "April–June, September–October",
    bestTimeWhy: "Mild weather, fewer crowds than summer. Spring blooms and autumn light are ideal for walking and outdoor cafés. July–August is busy and can be hot.",
    topSights: [
      { name: "Louvre Museum", why: "World’s largest art museum; Mona Lisa, Venus de Milo, and countless masterpieces." },
      { name: "Eiffel Tower", why: "Iconic landmark; book ahead for summit views or picnic on the Champ de Mars." },
      { name: "Notre-Dame (exterior / reopening)", why: "Gothic masterpiece; check reopening status for interior visits." },
      { name: "Montmartre & Sacré-Cœur", why: "Village feel, artists’ square, and sweeping city views from the basilica." },
      { name: "Seine cruise", why: "Classic way to see bridges and monuments; evening cruises are especially atmospheric." },
    ],
  },
  Barcelona: {
    bestTime: "April–June, September–October",
    bestTimeWhy: "Warm but not scorching; ideal for Gaudí walking and beach. July–August is peak heat and tourism. March and November are quieter and still pleasant.",
    topSights: [
      { name: "Sagrada Família", why: "Gaudí’s unfinished masterpiece; book timed tickets; interior and towers are breathtaking." },
      { name: "Park Güell", why: "Whimsical Gaudí park with mosaics and city views; book in advance." },
      { name: "La Rambla & Gothic Quarter", why: "Historic centre, street life, and hidden squares; watch belongings." },
      { name: "Casa Batlló & La Pedrera", why: "Two of Gaudí’s most famous buildings; skip-the-line tickets recommended." },
      { name: "Barceloneta Beach", why: "City beach for a quick dip; nearby seafood restaurants." },
    ],
  },
  Rome: {
    bestTime: "April–May, September–October",
    bestTimeWhy: "Pleasant temperatures and long days; summer is very hot and crowded. Easter and autumn harvest (sagre) add local flavour.",
    topSights: [
      { name: "Colosseum & Roman Forum", why: "Heart of ancient Rome; combined ticket; book a guided tour or early slot." },
      { name: "Vatican Museums & Sistine Chapel", why: "World-class art; book online to skip queues; dress modestly." },
      { name: "Trevi Fountain & Pantheon", why: "Free to visit; go early or late to avoid crowds; toss a coin in the Trevi." },
      { name: "Trastevere", why: "Charming medieval quarter; evening dining and cobbled streets." },
      { name: "Piazza Navona & Campo de’ Fiori", why: "Baroque squares and daily market; great for people-watching." },
    ],
  },
  London: {
    bestTime: "May–September",
    bestTimeWhy: "Longer days and (usually) milder weather; parks and outdoor events at their best. December for markets and lights. Rain possible any time.",
    topSights: [
      { name: "British Museum", why: "Free; Rosetta Stone, Parthenon sculptures, and global collections." },
      { name: "Tower of London", why: "Crown Jewels, Beefeaters, and centuries of history; book ahead." },
      { name: "Westminster & Big Ben", why: "Houses of Parliament and iconic clock tower; river views." },
      { name: "Hyde Park & Kensington Gardens", why: "Green escape in the centre; Serpentine, memorials, and palaces." },
      { name: "West End show", why: "World-class theatre; book in advance for popular musicals and plays." },
    ],
  },
  Amsterdam: {
    bestTime: "April–May, September",
    bestTimeWhy: "Tulip season in spring; autumn is golden and less crowded. Summer is busy; winter is cosy but short days.",
    topSights: [
      { name: "Rijksmuseum", why: "Dutch Golden Age masterpieces including Rembrandt’s Night Watch; book online." },
      { name: "Anne Frank House", why: "Powerful and moving; book tickets well in advance." },
      { name: "Canal ring (UNESCO)", why: "Walk or take a canal cruise; 17th-century architecture and houseboats." },
      { name: "Van Gogh Museum", why: "Largest collection of Van Gogh’s work; timed entry recommended." },
      { name: "Jordaan neighbourhood", why: "Quaint streets, cafés, and small galleries; less touristy." },
    ],
  },
  Tokyo: {
    bestTime: "March–April (cherry blossom), October–November (autumn)",
    bestTimeWhy: "Cherry blossom (sakura) in spring is iconic; autumn foliage is stunning. Summer is hot and humid; winter is dry and clear.",
    topSights: [
      { name: "Senso-ji (Asakusa)", why: "Tokyo’s oldest temple; Nakamise shopping street and traditional atmosphere." },
      { name: "Shibuya Crossing", why: "Famous scramble crossing; best viewed from a café above." },
      { name: "TeamLab Borderless / Planets", why: "Immersive digital art; book tickets in advance." },
      { name: "Tsukiji Outer Market", why: "Morning food market; sushi breakfast and street snacks." },
      { name: "Meiji Shrine & Yoyogi Park", why: "Serene shrine and green space in the heart of the city." },
    ],
  },
  "New York": {
    bestTime: "April–June, September–November",
    bestTimeWhy: "Spring and fall offer mild weather and fewer extremes. Summer is hot and humid; winter can be very cold but festive (holiday windows, ice rinks).",
    topSights: [
      { name: "Central Park", why: "843 acres of green; Bethesda Terrace, Bow Bridge, and seasonal events." },
      { name: "Metropolitan Museum of Art", why: "One of the world’s largest art museums; allow half a day." },
      { name: "Statue of Liberty & Ellis Island", why: "Book ferry in advance; Ellis Island museum is moving." },
      { name: "Brooklyn Bridge & DUMBO", why: "Walk the bridge at sunset; DUMBO for views and cafés." },
      { name: "Times Square & Broadway", why: "Neon lights and world-class theatre; book shows ahead." },
    ],
  },
  Lisbon: {
    bestTime: "March–May, September–October",
    bestTimeWhy: "Warm and sunny without summer heat; ideal for hills and trams. Summer can be very hot; winter is mild but rainier.",
    topSights: [
      { name: "Belém Tower & Jerónimos Monastery", why: "UNESCO sites; Pastéis de Belém nearby for the original pastel de nata." },
      { name: "Tram 28", why: "Classic ride through Alfama and Graça; go early to avoid queues." },
      { name: "Alfama", why: "Oldest district; Fado music, viewpoints (Miradouros), and narrow streets." },
      { name: "LX Factory", why: "Creative hub under the bridge; shops, cafés, and street art." },
      { name: "Sintra (day trip)", why: "Palaces and gardens; Pena Palace is the standout; book tickets online." },
    ],
  },
  Berlin: {
    bestTime: "May–September",
    bestTimeWhy: "Long days, outdoor culture, and festivals. Winter is cold but Christmas markets are magical. Spring and autumn are quieter.",
    topSights: [
      { name: "Brandenburg Gate & Reichstag", why: "Symbol of reunification; book Reichstag dome for free city views." },
      { name: "East Side Gallery", why: "Longest remaining stretch of the Wall; open-air art and history." },
      { name: "Museum Island", why: "Five world-class museums (Pergamon, Neues, etc.); buy a day pass." },
      { name: "Holocaust Memorial", why: "Powerful and contemplative; underground info centre." },
      { name: "Kreuzberg & street food", why: "Diverse neighbourhood; Markthalle Neun and currywurst." },
    ],
  },
  Istanbul: {
    bestTime: "April–May, September–October",
    bestTimeWhy: "Avoid summer heat and peak crowds; spring and autumn are ideal for walking and rooftop terraces. Winter is cold but fewer tourists.",
    topSights: [
      { name: "Hagia Sophia", why: "Byzantine-then-Ottoman landmark; check current visiting rules (mosque/museum)." },
      { name: "Blue Mosque", why: "Stunning tiles and architecture; dress modestly; closed during prayer." },
      { name: "Grand Bazaar", why: "One of the world’s oldest covered markets; haggle and explore." },
      { name: "Bosphorus cruise", why: "See palaces and shores from the water; short or full-length cruises." },
      { name: "Topkapi Palace", why: "Ottoman sultans’ residence; harem and treasury are highlights." },
    ],
  },
  Athens: {
    bestTime: "April–June, September–October",
    bestTimeWhy: "Pleasant for ancient sites and walking; summer is very hot. Spring wildflowers and autumn light are ideal for the Acropolis.",
    topSights: [
      { name: "Acropolis & Parthenon", why: "Symbol of ancient Greece; book timed tickets; go early or late." },
      { name: "Acropolis Museum", why: "Outstanding artefacts and context; modern building with Acropolis views." },
      { name: "Plaka & Anafiotika", why: "Historic neighbourhoods below the Acropolis; tavernas and shops." },
      { name: "Ancient Agora", why: "Heart of classical Athens; Temple of Hephaestus and Stoa of Attalos." },
      { name: "National Archaeological Museum", why: "World-class collection of Greek antiquities." },
    ],
  },
  Dublin: {
    bestTime: "May–September",
    bestTimeWhy: "Longer days and (often) drier weather; festivals and outdoor pubs. Winter is cosy with fewer crowds; St Patrick’s Day in March is busy.",
    topSights: [
      { name: "Trinity College & Book of Kells", why: "Historic library and illuminated manuscript; book ahead." },
      { name: "Guinness Storehouse", why: "Seven floors of brewing history; Gravity Bar views over the city." },
      { name: "Temple Bar (daytime)", why: "Cultural quarter and pubs; can be very busy at night." },
      { name: "Kilmainham Gaol", why: "Moving history of Irish independence; prebook essential." },
      { name: "Phoenix Park", why: "One of Europe’s largest city parks; deer and monuments." },
    ],
  },
  Madrid: {
    bestTime: "April–June, September–October",
    bestTimeWhy: "Warm but manageable; ideal for museums and tapas crawls. Summer is hot; winter is cooler and less crowded.",
    topSights: [
      { name: "Prado Museum", why: "One of the world’s finest art collections; Goya, Velázquez, El Greco." },
      { name: "Royal Palace", why: "Lavish state rooms; book ahead; free hours for EU citizens." },
      { name: "Retiro Park", why: "Green oasis; rowing on the lake, Crystal Palace, and street performers." },
      { name: "Plaza Mayor & La Latina", why: "Historic square and tapas bars; Sunday Rastro market." },
      { name: "Reina Sofía", why: "Modern art; Picasso’s Guernica is the centrepiece." },
    ],
  },
  Vienna: {
    bestTime: "April–May, September–October",
    bestTimeWhy: "Mild weather for palaces and coffee houses; Christmas markets in December. Summer can be warm; avoid August if you dislike heat.",
    topSights: [
      { name: "Schönbrunn Palace", why: "UNESCO site; lavish rooms and gardens; book tickets online." },
      { name: "Belvedere", why: "Baroque palaces and Klimt’s The Kiss; Upper Belvedere is the must-see." },
      { name: "St Stephen’s Cathedral & centre", why: "Gothic cathedral and pedestrianised old town." },
      { name: "Café culture", why: "Historic cafés (Central, Sacher, Demel) for cake and coffee." },
      { name: "Naschmarkt", why: "Food market and restaurants; Saturday flea market." },
    ],
  },
  Prague: {
    bestTime: "April–May, September–October",
    bestTimeWhy: "Pleasant for walking the old town and castle; summer is busy. Christmas markets in December are magical but cold.",
    topSights: [
      { name: "Prague Castle", why: "Largest ancient castle complex; cathedral, Golden Lane, and views." },
      { name: "Charles Bridge", why: "Iconic bridge; go at sunrise for fewer crowds." },
      { name: "Old Town Square & Astronomical Clock", why: "Heart of the city; hourly clock show." },
      { name: "Jewish Quarter (Josefov)", why: "Synagogues and cemetery; moving and historic." },
      { name: "Beer culture", why: "Pilsner and local brews; beer gardens and traditional pubs." },
    ],
  },
  Reykjavik: {
    bestTime: "June–August (midnight sun), September–March (Northern Lights)",
    bestTimeWhy: "Summer for long days and accessibility; winter for aurora and ice caves. Weather is unpredictable year-round; layer up.",
    topSights: [
      { name: "Golden Circle", why: "Þingvellir, Geysir, Gullfoss; classic day tour from Reykjavik." },
      { name: "Blue Lagoon", why: "Geothermal spa; book in advance; combine with airport." },
      { name: "South Coast / Jökulsárlón", why: "Waterfalls, black sand, and glacier lagoon; multi-day or long day trip." },
      { name: "Northern Lights (winter)", why: "Join a tour or drive away from city lights; check forecast." },
      { name: "Hallgrímskirkja & city centre", why: "Distinctive church and colourful Reykjavik streets." },
    ],
  },
  Marrakech: {
    bestTime: "March–May, September–November",
    bestTimeWhy: "Avoid summer heat; spring and autumn are warm and comfortable. Winter evenings can be cool; summer is very hot.",
    topSights: [
      { name: "Jemaa el-Fnaa", why: "Famous square; by day markets, by night food stalls and performers." },
      { name: "Majorelle Garden", why: "Yves Saint Laurent’s restored garden; vivid blue and botanical." },
      { name: "Bahia Palace", why: "Ornate rooms and courtyards; peak of Moroccan craftsmanship." },
      { name: "Medina souks", why: "Get lost in the lanes; spices, leather, and lanterns; haggle politely." },
      { name: "Atlas Mountains (day trip)", why: "Valleys and Berber villages; scenery and cool air." },
    ],
  },
  Santorini: {
    bestTime: "May–June, September–October",
    bestTimeWhy: "Warm and less crowded than July–August; better availability and prices. Avoid peak summer if you dislike crowds and heat.",
    topSights: [
      { name: "Oia sunset", why: "Famous views over the caldera; arrive early for a spot." },
      { name: "Fira & caldera path", why: "Capital and cliff walk to Oia; shops and views." },
      { name: "Ancient Akrotiri", why: "Minoan site preserved by volcanic ash; fascinating and shaded." },
      { name: "Red & Black beaches", why: "Volcanic sand; swimming and dramatic scenery." },
      { name: "Wine tasting", why: "Vineyards and unique varieties; many estates offer tours." },
    ],
  },
  Dubrovnik: {
    bestTime: "May–June, September",
    bestTimeWhy: "Warm sea and fewer crowds than July–August; old town is more enjoyable. Winter is mild but some services close.",
    topSights: [
      { name: "Old Town walls", why: "Walk the medieval walls for harbour and roof views; go early." },
      { name: "Old Town (Stradun)", why: "Marble main street, churches, and Game of Thrones filming spots." },
      { name: "Lokrum Island", why: "Short ferry; botanical garden, peacocks, and swimming." },
      { name: "Cable car", why: "Panoramic views over the city and coast." },
      { name: "Kayaking", why: "Paddle along the walls and to caves; popular at sunset." },
    ],
  },
  Edinburgh: {
    bestTime: "May–September, August (Festival)",
    bestTimeWhy: "Longer days and (often) better weather; August is the Fringe and International Festival. Winter is cold but cosy and less crowded.",
    topSights: [
      { name: "Edinburgh Castle", why: "Iconic fortress and Crown Jewels; book ahead; One o’Clock Gun." },
      { name: "Royal Mile", why: "Historic spine from castle to palace; closes and street performers." },
      { name: "Arthur’s Seat", why: "Volcanic hill in the city; rewarding views; allow 2–3 hours." },
      { name: "National Museum of Scotland", why: "Free; diverse collections and rooftop views." },
      { name: "Grassmarket & Victoria Street", why: "Pubs, independent shops, and colourful architecture." },
    ],
  },
  Milan: {
    bestTime: "April–May, September–October",
    bestTimeWhy: "Mild weather and fashion weeks; summer can be hot and humid. Spring and autumn are ideal for walking and day trips to the lakes.",
    topSights: [
      { name: "Duomo & rooftop", why: "Gothic cathedral and terraces with city views; book rooftop access." },
      { name: "La Scala", why: "Legendary opera house; museum and (if possible) a performance." },
      { name: "Last Supper", why: "Leonardo’s mural; book months ahead for timed entry." },
      { name: "Navigli", why: "Canal district; aperitivo, nightlife, and Sunday market." },
      { name: "Galleria Vittorio Emanuele II", why: "Historic shopping arcade and landmark." },
    ],
  },
  Florence: {
    bestTime: "April–May, September–October",
    bestTimeWhy: "Pleasant for museums and walking; summer is very hot and crowded. Spring and autumn light suit the art and hills.",
    topSights: [
      { name: "Uffizi Gallery", why: "World-class Renaissance art; book timed tickets well ahead." },
      { name: "Duomo & Brunelleschi’s dome", why: "Cathedral complex; climb the dome for views." },
      { name: "Accademia (David)", why: "Michelangelo’s David; book in advance." },
      { name: "Piazzale Michelangelo", why: "Sunset views over the city and Arno." },
      { name: "Oltrarno", why: "Artisan workshops, palazzi, and quieter streets." },
    ],
  },
  Oslo: {
    bestTime: "May–September",
    bestTimeWhy: "Long days and mild weather; winter is dark but good for snow and cosy culture. Summer for fjord trips and outdoor life.",
    topSights: [
      { name: "Vigeland Park", why: "Open-air sculpture park; free and striking." },
      { name: "Norwegian Museum of Cultural History", why: "Open-air museum with historic buildings." },
      { name: "Opera House", why: "Walk on the roof; harbour views and architecture." },
      { name: "Fram Museum", why: "Polar exploration ships; family-friendly." },
      { name: "Aker Brygge & harbour", why: "Waterfront dining and ferries to the islands." },
    ],
  },
  Stockholm: {
    bestTime: "May–September",
    bestTimeWhy: "Long days and comfortable temperatures; winter is cold but festive. Summer for archipelago boat trips.",
    topSights: [
      { name: "Gamla Stan", why: "Medieval old town; cobbled streets and the Royal Palace." },
      { name: "Vasa Museum", why: "Preserved 17th-century warship; unique and impressive." },
      { name: "Skansen", why: "Open-air museum and zoo; Swedish heritage and nature." },
      { name: "ABBA Museum", why: "Interactive and fun; book ahead." },
      { name: "Archipelago cruise", why: "Islands and scenery; half- or full-day trips." },
    ],
  },
  Krakow: {
    bestTime: "April–June, September–October",
    bestTimeWhy: "Mild weather for the old town and day trips; summer can be warm. Christmas market in December.",
    topSights: [
      { name: "Main Square (Rynek)", why: "Europe’s largest medieval square; Cloth Hall and St Mary’s." },
      { name: "Wawel Castle", why: "Hilltop castle and cathedral; book cathedral and state rooms." },
      { name: "Auschwitz-Birkenau (day trip)", why: "Moving and essential; book official tour and transport." },
      { name: "Kazimierz", why: "Historic Jewish quarter; synagogues, cafés, and nightlife." },
      { name: "Wieliczka Salt Mine", why: "UNESCO site; underground chambers and lake; book ahead." },
    ],
  },
  Seville: {
    bestTime: "March–May, September–October",
    bestTimeWhy: "Spring for orange blossom and Semana Santa; autumn is warm and less crowded. Summer is very hot.",
    topSights: [
      { name: "Alcázar", why: "Stunning palace and gardens; book ahead; Game of Thrones filming location." },
      { name: "Cathedral & Giralda", why: "Largest Gothic cathedral; climb the tower for views." },
      { name: "Plaza de España", why: "Grand square and canal; photogenic and free." },
      { name: "Triana", why: "Flamenco, ceramics, and tapas across the river." },
      { name: "Flamenco show", why: "Authentic tablaos in Triana or centre; book an evening." },
    ],
  },
  Lyon: {
    bestTime: "April–June, September–October",
    bestTimeWhy: "Mild weather for walking and bouchons; summer can be hot. Winter is cooler; Fête des Lumières in December.",
    topSights: [
      { name: "Vieux Lyon", why: "Renaissance quarter; traboules (passageways) and basilica above." },
      { name: "Fourvière", why: "Basilica and Roman theatres; panoramic views." },
      { name: "Bouchons", why: "Traditional Lyonnais restaurants; hearty local cuisine." },
      { name: "Confluence Museum", why: "Science and anthropology in a striking building." },
      { name: "Parc de la Tête d’Or", why: "Large urban park; lake, zoo, and botanical garden." },
    ],
  },
};

/** Normalize region name for lookup (lowercase, trim). */
function normalizeKey(region: string): string {
  return region.trim();
}

/**
 * Get contextual info for a destination. Tries exact match then case-insensitive.
 */
export function getDestinationContext(region: string): DestinationContext | null {
  if (!region?.trim()) return null;
  const key = normalizeKey(region);
  const exact = CONTEXT[key];
  if (exact) return exact;
  const lower = key.toLowerCase();
  const entry = Object.entries(CONTEXT).find(([k]) => k.toLowerCase() === lower);
  return entry ? entry[1] : null;
}
