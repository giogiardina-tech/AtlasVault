import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, buildGamePrompt } from '@/lib/openai';
import { getDb } from '@/lib/db';
import { GeneratedGame } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { scrambleAnswer, validateScramble } from '@/lib/scramble';

export const maxDuration = 60;

// ─── Historical civilization prompt builders ──────────────────────────────────
// Called server-side after LLM generation. Never rely on the LLM to produce
// image prompts for this mode — it consistently omits or mis-formats them.

// Visual style palettes — rotated by round number to prevent visual repetition
const ICONIC_STYLES = [
  'cinematic wide shot, golden hour dramatic light, deep shadows, atmospheric haze, no text, no maps',
  'museum archive close-up, dramatic raking side-light, deep shadows, dark background, no text, no maps',
  'cinematic oil painting style, dramatic chiaroscuro lighting, rich historical atmosphere, no text, no maps',
  'archival documentary photograph, natural environmental light, muted historical tones, no text, no maps',
  'ancient manuscript illumination aesthetic, rich gold and dark ground, ornate detail, no text, no maps',
];

function empireIconicPrompt(empire: string, roundNum = 1): string {
  const e = empire.toLowerCase();
  const style = ICONIC_STYLES[(roundNum - 1) % ICONIC_STYLES.length];

  if (e.includes('roman') || e.includes('rome'))
    return `Colosseum stone arches and vaulted corridors from low angle, warm amber dusk light, ${style}`;
  if (e.includes('mongol'))
    return `Mongolian horse archer riding at full gallop across the open steppe, dust cloud, low horizon, ${style}`;
  if (e.includes('ottoman'))
    return `Blue Mosque domed silhouette against a deep crimson sunset, Istanbul skyline, minarets, ${style}`;
  if (e.includes('persian') || e.includes('achaemenid'))
    return `Persepolis carved stone relief — soldiers and tribute-bearers in grand procession, ${style}`;
  if (e.includes('egypt') || e.includes('egyptian'))
    return `Great Sphinx at dawn, pyramids of Giza behind, long raking shadow, desert atmosphere, ${style}`;
  if (e.includes('aztec'))
    return `Stepped Aztec pyramid rising from jungle mist at dawn, stone temples, tropical atmosphere, ${style}`;
  if (e.includes('inca'))
    return `Machu Picchu stone terraces in mountain mist, dramatic Andean peaks behind, ${style}`;
  if (e.includes('viking') || e.includes('norse'))
    return `Viking longship prow on a dark fjord, carved dragon head, mist and grey northern sea, ${style}`;
  if (e.includes('byzantine'))
    return `Hagia Sophia interior — golden dome and shafts of light through high windows, mosaic, ${style}`;
  if (e.includes('mughal'))
    return `Taj Mahal reflected in still water at pre-dawn, pale marble, deep indigo sky, ${style}`;
  if (e.includes('qin') || e.includes('han') || e.includes('ming') || e.includes('tang'))
    return `Rows of Terracotta Warriors in excavation pit, dramatic raking light, clay soldiers, ${style}`;
  if (e.includes('chinese') || e.includes('china'))
    return `Great Wall of China snaking over misty mountain ridges at dawn, watchtower silhouette, ${style}`;
  if (e.includes('greek') || e.includes('macedon') || e.includes('hellenist') || e.includes('alexandr'))
    return `Parthenon columns at dusk on the Acropolis, warm golden light, long shadows, Athens, ${style}`;
  if (e.includes('babylon') || e.includes('babylonian'))
    return `Reconstructed Ishtar Gate — glazed cobalt and turquoise brickwork, massive arched gateway, ${style}`;
  if (e.includes('sumerian') || e.includes('sumer') || e.includes('akkad'))
    return `Ancient ziggurat stepped pyramid rising from Mesopotamian plain, desert atmosphere, ${style}`;
  if (e.includes('hittite'))
    return `Carved Hittite stone lion gateway at Hattusa, massive basalt sculpture, ${style}`;
  if (e.includes('assyrian') || e.includes('assyria'))
    return `Winged Assyrian lamassu bull statue with human head, carved stone, monumental gateway, ${style}`;
  if (e.includes('mayan') || e.includes('maya'))
    return `Chichen Itza pyramid rising from jungle at low sun, long shadows on stone steps, ${style}`;
  if (e.includes('khmer'))
    return `Angkor Wat towers reflected in moat at sunrise, stone temple silhouette, mist and jungle, ${style}`;
  if (e.includes('majapahit') || e.includes('srivijaya') || e.includes('sailendra'))
    return `Ancient Javanese stone temple — Borobudur stupa tiers rising from tropical jungle, ${style}`;
  if (e.includes('british') && !e.includes('byzantin'))
    return `HMS Victory tall ship hull at low angle, cannon ports, aged dark oak, dramatic naval scene, ${style}`;
  if (e.includes('spanish') || e.includes('spain'))
    return `Spanish galleon at sea — billowing sails, ocean spray, dramatic stormy light, ${style}`;
  if (e.includes('portuguese') || e.includes('portugal'))
    return `Portuguese caravel at anchor in a tropical harbour, ocean horizon, Age of Discovery, ${style}`;
  if (e.includes('french') || e.includes('napoleon'))
    return `Napoleon's Grande Armée soldiers marching — silhouettes with rifles and tricornes, ${style}`;
  if (e.includes('austro') || e.includes('habsburg'))
    return `Schönbrunn Palace grand facade and gardens in Vienna, imperial grandeur, ${style}`;
  if (e.includes('soviet') || e.includes('ussr'))
    return `Soviet Sputnik satellite model against deep black void, chrome sphere with antennas, ${style}`;
  if (e.includes('mali') || e.includes('songhai'))
    return `Djinguereber Mosque mud-brick towers in Timbuktu, West African architecture, ${style}`;
  if (e.includes('ghana') && !e.includes('great'))
    return `Ancient gold trade weights and scales on dark velvet — Akan goldsmith's tools, ${style}`;
  if (e.includes('aksum') || e.includes('aksumite'))
    return `Tall stone obelisk of Aksum rising against blue Ethiopian sky, ancient carved stele, ${style}`;
  if (e.includes('nubian') || e.includes('kush') || e.includes('meroe'))
    return `Nubian pyramids of Meroe — steep narrow pyramids in the Sudanese desert at dawn, ${style}`;
  if (e.includes('benin') && !e.includes('republic'))
    return `Carved Benin bronze plaque — intricate relief of warrior king with attendants, ${style}`;
  if (e.includes('zulu'))
    return `Zulu warriors in traditional regalia — isigqoko headdress, cowhide shield, dramatic, ${style}`;
  if (e.includes('kongo') || e.includes('congo'))
    return `Ancient Kongo ceremonial nkisi power figure in carved wood, dark velvet, ${style}`;
  if (e.includes('chola'))
    return `Brihadeeswarar Temple gopuram rising over South Indian landscape, ornate stone, ${style}`;
  if (e.includes('maratha'))
    return `Raigad fort silhouette on mountain ridgeline at sunset, Maratha stronghold, ${style}`;
  if (e.includes('sikh'))
    return `Golden Temple Amritsar reflected in the holy sarovar at night, glowing gold, ${style}`;
  if (e.includes('timurid') || e.includes('timur') || e.includes('tamerlane'))
    return `Timurid tilework dome — turquoise and cobalt geometric mosaic, Samarkand, ${style}`;
  if (e.includes('safavid'))
    return `Shah Mosque Isfahan interior — turquoise and gold tilework, vaulted iwan, ${style}`;
  if (e.includes('umayyad') || e.includes('abbasid') || e.includes('fatimid'))
    return `Islamic calligraphy carved in stone — intricate Arabic script on dark marble, ${style}`;
  if (e.includes('holy roman'))
    return `Cologne Cathedral Gothic spires at dusk — massive stone facade, medieval grandeur, ${style}`;
  if (e.includes('frankish') || e.includes('charlemagne'))
    return `Carolingian chapel of Aachen interior — octagonal dome, gold and marble, ${style}`;
  if (e.includes('nabatean') || e.includes('nabataean'))
    return `Petra Treasury facade carved from rose-red sandstone cliff, Jordan, ${style}`;
  if (e.includes('carthag'))
    return `Ancient harbour of Carthage from above — circular cothon, Punic warships, ${style}`;
  if (e.includes('east german') || e.includes('gdr'))
    return `Berlin Wall concrete slabs — graffiti, barbed wire, guard tower in mist, ${style}`;
  if (e.includes('yugoslav'))
    return `Yugoslav Federal Assembly building Belgrade — socialist architecture, red star, ${style}`;
  if (e.includes('tokugawa') || (e.includes('japan') && !e.includes('imperial')))
    return `Himeji Castle white tenshu rising above cherry blossoms, feudal Japan, ${style}`;
  if (e.includes('aztec triple') || e.includes('triple alliance'))
    return `Tenochtitlan aerial reconstruction — massive stepped pyramid at centre of lake city, ${style}`;
  // ── Extended civilization pool ─────────────────────────────────────────────
  if (e.includes('olmec'))
    return `Giant Olmec colossal basalt head in jungle clearing, moss-covered stone, dramatic raking side light, ${style}`;
  if (e.includes('minoan'))
    return `Knossos palace fresco — leaping dolphins over azure waves or bull-leaping scene, ancient mineral pigments, ${style}`;
  if (e.includes('mycenae') || e.includes('mycenaean'))
    return `Lion Gate at Mycenae — massive carved limestone lintel and stone citadel walls, ${style}`;
  if (e.includes('phoenic'))
    return `Phoenician purple dye workshop — murex shells, rich crimson cloth, Levantine harbour backdrop, ${style}`;
  if (e.includes('venetian') || (e.includes('venice') && !e.includes('genoese')))
    return `Doge's Palace Gothic arcade reflected in the Grand Canal at pre-dawn, deep indigo water, gondola silhouette, ${style}`;
  if (e.includes('genoe') || e.includes('genoese'))
    return `Genoese merchant ship in a medieval harbour, striped red-and-white flag, Mediterranean trading post, ${style}`;
  if (e.includes('ragusa') || e.includes('dubrovnik'))
    return `Dubrovnik old city walls from sea level at golden hour, limestone towers, Adriatic backdrop, ${style}`;
  if (e.includes('sparta') || e.includes('spartan'))
    return `Spartan bronze Corinthian helmet and lambda shield close-up, dark background, dramatic raking light, ${style}`;
  if (e.includes('athen') || e.includes('delian'))
    return `Parthenon columns at dusk on the Acropolis, warm golden light, long shadows, Athens skyline, ${style}`;
  if (e.includes('palmyra') || e.includes('zenobia'))
    return `Palmyra colonnade and triumphal arch silhouette against deep blue Syrian desert sky, ancient columns, ${style}`;
  if (e.includes('urartu'))
    return `Urartu fortress walls of Van on the Armenian plateau — massive stone blocks, Lake Van horizon, ${style}`;
  if (e.includes('golden horde'))
    return `Mongol ger camp on the open Eurasian steppe, circular felt tents, vast horse herd at horizon, dramatic sky, ${style}`;
  if (e.includes('ilkhanat') || e.includes('ilkhan'))
    return `Timurid-era turquoise tilework dome in Persia — cobalt and gold geometric mosaic, Ilkhanate heritage, ${style}`;
  if (e.includes('khazar'))
    return `Steppe Khazar jewelry hoard — silver and gold torques, coins, and pendants on dark velvet, ${style}`;
  if (e.includes('parthian'))
    return `Mounted Parthian cataphract in full lamellar armour shooting backwards — the "Parthian shot", desert light, ${style}`;
  if (e.includes('seljuk') || e.includes('seljuq'))
    return `Seljuk muqarnas stone portal — intricate honeycomb carving at Divriği or Konya, golden hour, ${style}`;
  if (e.includes('ghaznavid') || e.includes('ghaznav'))
    return `Ghazni minaret — ornate geometric brickwork tower rising from Afghan plain, ancient Islamic architecture, ${style}`;
  if (e.includes('mamluk'))
    return `Mamluk carved stone gateway in Cairo — massive stalactite portal, intricate geometric relief, ${style}`;
  if (e.includes('ayyubid'))
    return `Citadel of Saladin overlooking Cairo — massive crusader-era fortress on limestone ridge, ${style}`;
  if (e.includes('pagan') || e.includes('bagan'))
    return `Bagan plains at sunrise — thousands of pagodas stretching to the horizon, hot air balloon above, Myanmar, ${style}`;
  if (e.includes('champa'))
    return `My Son Cham temple tower in jungle mist — ancient brick sanctuary rising from Vietnamese rainforest, ${style}`;
  if (e.includes('pallava'))
    return `Mahabalipuram Shore Temple at sunrise — stone temple on rocks above crashing Indian Ocean waves, ${style}`;
  if (e.includes('vijayanagara') || e.includes('hampi'))
    return `Hampi stone chariot in Vittala Temple courtyard, Deccan granite boulders, dramatic raking light, ${style}`;
  if (e.includes('gupta'))
    return `Ajanta cave fresco — elaborately dressed Gupta-era court scene painted deep in rock face, vivid ancient pigments, ${style}`;
  if (e.includes('rashtrakuta') || e.includes('chalukya'))
    return `Ellora Kailasa Temple cut into cliff face — rock-hewn monolith, Deccan plateau, dramatic shadow, ${style}`;
  if (e.includes('yamato'))
    return `Great Buddha of Nara — massive bronze Daibutsu seated in ancient wooden hall, dim candlelight, ${style}`;
  if (e.includes('joseon'))
    return `Gyeongbokgung Palace main gate at dusk — colourful dancheong paintwork, Seoul mountain backdrop, ${style}`;
  if (e.includes('goryeo'))
    return `Goryeo celadon glazed pottery — jade-green inlaid crane design, dark velvet, museum lighting, ${style}`;
  if (e.includes('silla') || e.includes('three kingdoms'))
    return `Silla gold crown — elaborate gilded antler-branch crown with jade magatama, museum close-up, ${style}`;
  if (e.includes('malacca') || e.includes('melaka'))
    return `Malacca Strait historical spice port — wooden dhow vessels in tropical harbour, golden hour, ${style}`;
  if (e.includes('teotihuacan'))
    return `Avenue of the Dead at dawn — Pyramid of the Sun rising from morning mist, Teotihuacan, ${style}`;
  if (e.includes('zapotec'))
    return `Monte Albán hilltop plaza at dawn — carved stone danzante reliefs, Oaxacan highland view, ${style}`;
  if (e.includes('toltec'))
    return `Tula Warrior Columns — massive stone Toltec warrior figures atop pyramid, dramatic storm sky, ${style}`;
  if (e.includes('chimú') || e.includes('chimu'))
    return `Chan Chan adobe citadel walls with carved geometric wave relief, Peruvian coastal desert, ${style}`;
  if (e.includes('moche'))
    return `Moche portrait ceramic vessel — intricate terracotta face jar with vivid applied pigments, dark background, ${style}`;
  if (e.includes('wari'))
    return `Ancient Wari tapestry textile — vivid geometric interlocked figures in Andean wool weave, ${style}`;
  if (e.includes('mississipp'))
    return `Cahokia Monks Mound at dawn mist — vast pre-Columbian earthwork rising from Mississippi floodplain, ${style}`;
  if (e.includes('muisca'))
    return `El Dorado gold figurine — Muisca tunjo votive gold figure, dark velvet background, dramatic museum light, ${style}`;
  if (e.includes('judah') || e.includes('judea') || e.includes('judaean'))
    return `Jerusalem ancient city walls at golden hour — limestone blocks, olive trees, Judean hills silhouette, ${style}`;
  if (e.includes('scythian') || e.includes('saka'))
    return `Scythian gold pectoral — intricate animal-style goldwork with stag and griffin, dark velvet, ${style}`;
  if (e.includes('kanem') || e.includes('bornu'))
    return `Trans-Saharan caravan at dusk — camels silhouetted against orange desert horizon, ancient trade route, ${style}`;
  if (e.includes('dahomey'))
    return `Fon appliqué royal tapestry — Dahomey warrior king with symbols in vivid coloured fabric, dark background, ${style}`;
  if (e.includes('zimbabwe') && !e.includes('great zim') || e.includes('great zimbabwe'))
    return `Great Zimbabwe granite tower at dawn — massive dry stone walls rising from mist, ancient enclosure, ${style}`;
  if (e.includes('swahili') || e.includes('kilwa'))
    return `Kilwa Kisiwani stone ruins on the Indian Ocean coast — coral-stone columns, baobab trees, East Africa, ${style}`;
  if (e.includes('ashanti') || e.includes('asante'))
    return `Kente cloth close-up — bold geometric gold, black, and red Ashanti silk weave, dramatic light, ${style}`;
  if (e.includes('luba'))
    return `Luba chief's ceremonial stool — carved wooden throne with caryatid figure, Congo basin, dark background, ${style}`;
  if (e.includes('mauryan') && !e.includes('mongol'))
    return `Ashoka pillar capital — four back-to-back stone lions atop polished sandstone column, Indian museum, ${style}`;
  return `Ancient monument or cultural artifact associated with the ${empire}, dark cinematic atmosphere, ${style}`;
}

const MAP_STYLES = [
  'deep navy background, translucent warm gold territory wash, fine hairline cartographic borders, no text, no labels',
  'dark aged vellum atlas style, rich amber ink territory, subtle texture, clean boundary lines, no text, no labels',
  'tactical campaign map, deep charcoal background, luminous gold territory highlight, minimal borders, no text, no labels',
  'dark topographic satellite style, shaded terrain relief, glowing gold boundary trace, deep navy, no text, no labels',
  'Renaissance cartography aesthetic, deep indigo background, warm gold geometric territory outline, no text, no labels',
];

function empireTerritoryPrompt(empire: string, roundNum = 1): string {
  const e = empire.toLowerCase();
  const mapStyle = MAP_STYLES[(roundNum - 1) % MAP_STYLES.length];

  if (e.includes('roman') || e.includes('rome'))
    return `Historical atlas — Roman territory encircling the Mediterranean basin, spanning Western Europe, North Africa, and the Middle East, ${mapStyle}`;
  if (e.includes('mongol'))
    return `Historical atlas — vast Mongol territory from Eastern Europe and Russia across Central Asia, Persia, and China to Korea, ${mapStyle}`;
  if (e.includes('ottoman'))
    return `Historical atlas — Ottoman territory covering Anatolia, the Levant, Mesopotamia, North Africa, and southeastern Europe, ${mapStyle}`;
  if (e.includes('persian') || e.includes('achaemenid'))
    return `Historical atlas — Achaemenid territory spanning Persia, Mesopotamia, Anatolia, Egypt, and the Indus valley, ${mapStyle}`;
  if (e.includes('egypt') || e.includes('egyptian'))
    return `Historical atlas — Egyptian territory concentrated along the Nile River from the Delta to Nubia, with Sinai and Levant, ${mapStyle}`;
  if (e.includes('aztec'))
    return `Historical atlas — Aztec territory in central Mexico, Valley of Mexico to the Gulf Coast and Pacific, ${mapStyle}`;
  if (e.includes('inca'))
    return `Historical atlas — Inca territory stretching 4,000 km along western South America — Andes coast from Colombia to Chile, ${mapStyle}`;
  if (e.includes('viking') || e.includes('norse'))
    return `Historical atlas — Norse territory and raiding routes covering Scandinavia, Britain, Iceland, Greenland, and the Russian river systems, ${mapStyle}`;
  if (e.includes('british') && !e.includes('byzantin'))
    return `Historical atlas — British Empire territory across India, Australia, Canada, Southern Africa, and coastal trading ports worldwide, ${mapStyle}`;
  if (e.includes('mughal'))
    return `Historical atlas — Mughal territory covering the entire Indian subcontinent from Kabul to Bengal and the Deccan, ${mapStyle}`;
  if (e.includes('qin') || e.includes('han') || e.includes('ming') || e.includes('tang'))
    return `Historical atlas — Chinese dynastic territory covering eastern China, with extent varying by dynasty — from Yellow River heartland to southern coasts and Central Asia, ${mapStyle}`;
  if (e.includes('chinese') || e.includes('china'))
    return `Historical atlas — Chinese territory at imperial peak — Yellow River and Yangtze basins, Manchuria, and Central Asian corridors, ${mapStyle}`;
  if (e.includes('greek') || e.includes('macedon') || e.includes('hellenist') || e.includes('alexandr'))
    return `Historical atlas — Macedonian/Hellenistic territory from Greece and Egypt across Persia to the Indus River valley, ${mapStyle}`;
  if (e.includes('babylon') || e.includes('babylonian') || e.includes('sumerian') || e.includes('akkad'))
    return `Historical atlas — Mesopotamian territory between the Tigris and Euphrates rivers, Fertile Crescent from Persia to the Levant, ${mapStyle}`;
  if (e.includes('hittite'))
    return `Historical atlas — Hittite territory in Anatolia (modern Turkey) and northern Levant, ${mapStyle}`;
  if (e.includes('assyrian') || e.includes('assyria'))
    return `Historical atlas — Assyrian territory covering Mesopotamia, Levant, Egypt, and eastern Anatolia, ${mapStyle}`;
  if (e.includes('mayan') || e.includes('maya'))
    return `Historical atlas — Maya territory across the Yucatan Peninsula, Guatemala, and lowland Central America, ${mapStyle}`;
  if (e.includes('khmer'))
    return `Historical atlas — Khmer Empire territory covering most of mainland Southeast Asia — Cambodia, Thailand, Laos, and Vietnam, ${mapStyle}`;
  if (e.includes('majapahit'))
    return `Historical atlas — Majapahit territory across the Indonesian archipelago and Malay Peninsula, ${mapStyle}`;
  if (e.includes('srivijaya'))
    return `Historical atlas — Srivijaya maritime territory controlling the Strait of Malacca and island Southeast Asia, ${mapStyle}`;
  if (e.includes('mali'))
    return `Historical atlas — Mali Empire territory across West Africa — Sahel from the Atlantic to the Niger Bend, ${mapStyle}`;
  if (e.includes('songhai'))
    return `Historical atlas — Songhai Empire territory in West Africa — upper Niger River bend through the Sahel, ${mapStyle}`;
  if (e.includes('aksum') || e.includes('aksumite'))
    return `Historical atlas — Aksumite territory in the Horn of Africa — Ethiopia, Eritrea, and southern Arabian Peninsula, ${mapStyle}`;
  if (e.includes('nubian') || e.includes('kush') || e.includes('meroe'))
    return `Historical atlas — Nubian/Kush territory along the upper Nile in Sudan and northern Ethiopia, ${mapStyle}`;
  if (e.includes('zulu'))
    return `Historical atlas — Zulu Kingdom territory in southeastern Africa — KwaZulu-Natal coastal region, ${mapStyle}`;
  if (e.includes('chola'))
    return `Historical atlas — Chola territory covering South India, Sri Lanka, and maritime routes to Southeast Asia, ${mapStyle}`;
  if (e.includes('timurid') || e.includes('timur') || e.includes('tamerlane'))
    return `Historical atlas — Timurid territory spanning Central Asia, Persia, Afghanistan, and northern India, ${mapStyle}`;
  if (e.includes('safavid'))
    return `Historical atlas — Safavid territory covering Persia, Azerbaijan, Iraq, and parts of the Caucasus, ${mapStyle}`;
  if (e.includes('umayyad'))
    return `Historical atlas — Umayyad Caliphate territory from Iberia across North Africa, Arabia, Persia, and into Central Asia, ${mapStyle}`;
  if (e.includes('abbasid'))
    return `Historical atlas — Abbasid Caliphate territory centered on Mesopotamia, stretching from North Africa to Central Asia, ${mapStyle}`;
  if (e.includes('fatimid'))
    return `Historical atlas — Fatimid territory covering North Africa, Egypt, the Levant, and Sicily, ${mapStyle}`;
  if (e.includes('spanish') || e.includes('spain'))
    return `Historical atlas — Spanish Empire territory across the Americas from Mexico to Patagonia, Caribbean, and Philippines, ${mapStyle}`;
  if (e.includes('portuguese') || e.includes('portugal'))
    return `Historical atlas — Portuguese Empire coastal territories along West Africa, East Africa, Brazil, Goa, and Southeast Asia, ${mapStyle}`;
  if (e.includes('soviet') || e.includes('ussr'))
    return `Historical atlas — Soviet territory covering Russia, Ukraine, Central Asian republics, the Caucasus, and Siberia, ${mapStyle}`;
  if (e.includes('austro') || e.includes('habsburg'))
    return `Historical atlas — Austro-Hungarian territory in Central Europe — Austria, Hungary, Bohemia, Galicia, and the Balkans, ${mapStyle}`;
  if (e.includes('french') || e.includes('napoleon'))
    return `Historical atlas — Napoleonic French territory and client states across Western and Central Europe, ${mapStyle}`;
  if (e.includes('holy roman'))
    return `Historical atlas — Holy Roman Empire territory in Central Europe — Germany, Austria, northern Italy, and Bohemia, ${mapStyle}`;
  if (e.includes('nabatean') || e.includes('nabataean'))
    return `Historical atlas — Nabataean territory in the Levant, Sinai, and northern Arabia, ${mapStyle}`;
  if (e.includes('yugoslav'))
    return `Historical atlas — Yugoslav territory across the Balkans — Slovenia, Croatia, Bosnia, Serbia, Montenegro, Macedonia, ${mapStyle}`;
  if (e.includes('tokugawa') || (e.includes('japan') && !e.includes('imperial')))
    return `Historical atlas — Tokugawa Japan — the Japanese home islands with domain boundaries, ${mapStyle}`;
  if (e.includes('carthag'))
    return `Historical atlas — Carthaginian territory covering North Africa, Iberia, Sardinia, and Sicily, ${mapStyle}`;
  if (e.includes('maratha'))
    return `Historical atlas — Maratha Confederacy territory across the Indian subcontinent from Maharashtra to Delhi, ${mapStyle}`;
  // ── Extended civilization pool ─────────────────────────────────────────────
  if (e.includes('olmec'))
    return `Historical atlas — Olmec heartland along the Gulf Coast of Mexico — La Venta, San Lorenzo, and Tres Zapotes region, ${mapStyle}`;
  if (e.includes('minoan'))
    return `Historical atlas — Minoan territory centered on Crete and the Aegean islands — eastern Mediterranean trading network, ${mapStyle}`;
  if (e.includes('mycenae') || e.includes('mycenaean'))
    return `Historical atlas — Mycenaean Greece — palace kingdoms across the Peloponnese, Attica, and Aegean islands, ${mapStyle}`;
  if (e.includes('phoenic'))
    return `Historical atlas — Phoenician city-states and colonies along the Levant coast, with trade routes across the Mediterranean to Carthage and Iberia, ${mapStyle}`;
  if (e.includes('venetian') || (e.includes('venice') && !e.includes('genoese')))
    return `Historical atlas — Venetian Republic territory — northeastern Italy, Adriatic coast, and eastern Mediterranean trading ports and islands, ${mapStyle}`;
  if (e.includes('genoe') || e.includes('genoese'))
    return `Historical atlas — Genoese Republic trading network — Ligurian coast, Black Sea colonies, and Mediterranean port settlements, ${mapStyle}`;
  if (e.includes('sparta') || e.includes('spartan'))
    return `Historical atlas — Spartan territory — the Peloponnese heartland, Laconia, Messenia, and Peloponnesian League allies, ${mapStyle}`;
  if (e.includes('athen') || e.includes('delian'))
    return `Historical atlas — Athenian Delian League — Attica, Aegean islands, and coastal allies from the Black Sea to Ionia, ${mapStyle}`;
  if (e.includes('palmyra') || e.includes('zenobia'))
    return `Historical atlas — Palmyrene territory at peak — Syria, Egypt, Anatolia, and the Levant under Queen Zenobia, ${mapStyle}`;
  if (e.includes('urartu'))
    return `Historical atlas — Urartu territory in the Armenian Highlands — Lake Van basin, eastern Anatolia, and the Caucasus, ${mapStyle}`;
  if (e.includes('golden horde'))
    return `Historical atlas — Golden Horde territory — western Russian steppe, Ukraine, Crimea, Kazakhstan, and the Caucasus, ${mapStyle}`;
  if (e.includes('ilkhanat') || e.includes('ilkhan'))
    return `Historical atlas — Ilkhanate territory covering Persia, Iraq, Anatolia, and the Caucasus, ${mapStyle}`;
  if (e.includes('khazar'))
    return `Historical atlas — Khazar Khaganate territory — Pontic steppe, lower Volga, Caucasus, and Crimea, ${mapStyle}`;
  if (e.includes('parthian'))
    return `Historical atlas — Parthian Empire territory covering Persia, Mesopotamia, and parts of Central Asia — modern Iran and Iraq, ${mapStyle}`;
  if (e.includes('seljuk') || e.includes('seljuq'))
    return `Historical atlas — Seljuk Sultanate territory spanning Anatolia, the Levant, Persia, and Central Asia at peak, ${mapStyle}`;
  if (e.includes('ghaznavid') || e.includes('ghaznav'))
    return `Historical atlas — Ghaznavid territory covering Afghanistan, Khorasan, and the northwestern Indian subcontinent, ${mapStyle}`;
  if (e.includes('mamluk'))
    return `Historical atlas — Mamluk Sultanate territory — Egypt, the Levant, and the Hejaz, ${mapStyle}`;
  if (e.includes('ayyubid'))
    return `Historical atlas — Ayyubid territory covering Egypt, the Levant, Yemen, and parts of Mesopotamia, ${mapStyle}`;
  if (e.includes('pagan') || e.includes('bagan'))
    return `Historical atlas — Pagan Kingdom territory covering most of mainland Burma (Myanmar), from the Irrawaddy delta to the Shan Hills, ${mapStyle}`;
  if (e.includes('champa'))
    return `Historical atlas — Champa Kingdom territory along the central Vietnamese coastline from Quảng Bình to Bình Thuận, ${mapStyle}`;
  if (e.includes('pallava'))
    return `Historical atlas — Pallava Kingdom territory in South India — Tamil Nadu, Andhra Pradesh, and Sri Lanka, ${mapStyle}`;
  if (e.includes('vijayanagara') || e.includes('hampi'))
    return `Historical atlas — Vijayanagara Empire territory covering the southern Deccan — Karnataka, Andhra Pradesh, Tamil Nadu, ${mapStyle}`;
  if (e.includes('gupta'))
    return `Historical atlas — Gupta Empire territory across northern and central India — from the Indus to Bengal, ${mapStyle}`;
  if (e.includes('rashtrakuta') || e.includes('chalukya'))
    return `Historical atlas — Rashtrakuta/Chalukya territory across the Deccan plateau — western and central India, ${mapStyle}`;
  if (e.includes('yamato'))
    return `Historical atlas — Yamato Japan — the Japanese home islands centered on the Kinai region and Yamato province, ${mapStyle}`;
  if (e.includes('joseon'))
    return `Historical atlas — Joseon Dynasty territory — the Korean peninsula from the Yalu River to the southern coast, ${mapStyle}`;
  if (e.includes('goryeo'))
    return `Historical atlas — Goryeo Dynasty territory — the Korean peninsula and relations with Manchuria, ${mapStyle}`;
  if (e.includes('silla') || e.includes('three kingdoms'))
    return `Historical atlas — Unified Silla territory — the Korean peninsula south of the Taedong River, ${mapStyle}`;
  if (e.includes('malacca') || e.includes('melaka'))
    return `Historical atlas — Malacca Sultanate territory controlling the Strait of Malacca — Malay Peninsula and Sumatra straits, ${mapStyle}`;
  if (e.includes('teotihuacan'))
    return `Historical atlas — Teotihuacan influence zone — Valley of Mexico with trade networks reaching Maya lowlands and Oaxaca, ${mapStyle}`;
  if (e.includes('zapotec'))
    return `Historical atlas — Zapotec territory in the Oaxaca Valley, Monte Albán highlands, and Pacific Coast of southern Mexico, ${mapStyle}`;
  if (e.includes('toltec'))
    return `Historical atlas — Toltec territory centered on Tula in Hidalgo, Mexico, with trade networks across Mesoamerica, ${mapStyle}`;
  if (e.includes('chimú') || e.includes('chimu'))
    return `Historical atlas — Chimú Empire territory along the Peruvian coast — the northern desert coast from Tumbes to Lima, ${mapStyle}`;
  if (e.includes('moche'))
    return `Historical atlas — Moche Culture territory along the northern Peruvian coastal valleys, ${mapStyle}`;
  if (e.includes('wari'))
    return `Historical atlas — Wari Empire territory across the central Andes — modern Peru highlands from Cuzco to Cajamarca, ${mapStyle}`;
  if (e.includes('mississipp'))
    return `Historical atlas — Mississippian Culture chiefdoms — the Mississippi River valley and southeastern North America, ${mapStyle}`;
  if (e.includes('muisca'))
    return `Historical atlas — Muisca Confederation territory — the eastern Andes highlands of Colombia, Lake Guatavita region, ${mapStyle}`;
  if (e.includes('judah') || e.includes('judea') || e.includes('judaean'))
    return `Historical atlas — Kingdom of Judah territory — Judean highlands, Jerusalem, and the Levant south of Samaria, ${mapStyle}`;
  if (e.includes('scythian') || e.includes('saka'))
    return `Historical atlas — Scythian territory across the Eurasian steppe — Black Sea coast through Kazakhstan to Siberia, ${mapStyle}`;
  if (e.includes('kanem') || e.includes('bornu'))
    return `Historical atlas — Kanem-Bornu territory around Lake Chad — modern Chad, Niger, and northeastern Nigeria, ${mapStyle}`;
  if (e.includes('dahomey'))
    return `Historical atlas — Dahomey Kingdom territory in coastal West Africa — modern Benin and western Nigeria, ${mapStyle}`;
  if (e.includes('zimbabwe') && !e.includes('great zim') || e.includes('great zimbabwe'))
    return `Historical atlas — Great Zimbabwe territory — the Zimbabwe Plateau and southeastern Africa, ${mapStyle}`;
  if (e.includes('swahili') || e.includes('kilwa'))
    return `Historical atlas — Swahili Coast city-states — East African coast from Mogadishu to Mozambique, with Indian Ocean trade routes, ${mapStyle}`;
  if (e.includes('ashanti') || e.includes('asante'))
    return `Historical atlas — Ashanti Confederation territory in West Africa — modern Ghana's forest belt and gold-producing region, ${mapStyle}`;
  if (e.includes('luba'))
    return `Historical atlas — Luba Kingdom territory in the Congo Basin — modern Katanga province, Democratic Republic of Congo, ${mapStyle}`;
  if (e.includes('mauryan') && !e.includes('mongol'))
    return `Historical atlas — Mauryan Empire territory covering nearly the entire Indian subcontinent from the Himalayas to the Deccan, ${mapStyle}`;
  return `Historical atlas — territory of the ${empire} at its peak extent, surrounding regions deep charcoal, ${mapStyle}`;
}

export async function POST(req: NextRequest) {
  try {
  const { category, format_type, template_id, title, hook, difficulty = 'medium' } = await req.json();
  const openai = getOpenAI();
  const db = getDb();

  // Collect subjects used in previous games of the same format so the AI avoids repeating them
  const pastGames = db
    .prepare('SELECT id FROM games WHERE format_type = ? ORDER BY created_at DESC LIMIT 30')
    .all(format_type) as { id: string }[];

  const usedSubjects: string[] = [];

  for (const g of pastGames) {
    const slides = db
      .prepare('SELECT slide_type, content FROM slides WHERE game_id = ?')
      .all(g.id) as { slide_type: string; content: string }[];

    for (const s of slides) {
      const c = JSON.parse(s.content);
      if (s.slide_type === 'reveal') {
        // Most formats: correct_answer is the subject
        if (c.correct_answer) usedSubjects.push(c.correct_answer);
        // Historical order: collect individual event names
        if (c.correct_order) {
          c.correct_order.forEach((item: { event: string }) => usedSubjects.push(item.event));
        }
      }
      if (s.slide_type === 'round') {
        // Bordering-country: featured country is in the question text
        if (format_type === 'bordering-country' && c.question) {
          const m = c.question.match(/borders?\s+(.+?)(?:\?|$)/i);
          if (m) usedSubjects.push(m[1].trim());
        }
      }
    }
  }

  const prompt = buildGamePrompt(category, format_type, title, hook, Array.from(new Set(usedSubjects)), difficulty);
  console.log(`[generate/game] format=${format_type} prompt_chars=${prompt.length}`);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
    max_tokens: 6000,
  });

  const generated: GeneratedGame = JSON.parse(response.choices[0].message.content!);

  // For scramble formats: generate scramble deterministically from correct_answer.
  // Build a per-round scramble map from reveal slides, then apply to both round + reveal.
  const isScrambleFormat = format_type === 'scrambled-capitals' || format_type === 'scrambled-countries';
  if (isScrambleFormat) {
    const scrambleMap = new Map<number, string>();
    for (const slide of generated.slides) {
      if (slide.slide_type === 'reveal' && slide.content.correct_answer) {
        let s = scrambleAnswer(slide.content.correct_answer);
        // Re-scramble if validation fails (should never happen, but defensive)
        if (!validateScramble(slide.content.correct_answer, s)) {
          s = scrambleAnswer(slide.content.correct_answer);
        }
        if (slide.content.round_number != null) scrambleMap.set(slide.content.round_number, s);
      }
    }
    for (const slide of generated.slides) {
      const s = slide.content.round_number != null ? scrambleMap.get(slide.content.round_number) : undefined;
      if (s) slide.content.scrambled = s;
    }
  }

  // For fame-battle and civilization-fight: the LLM puts side_a/side_b only in reveal slides.
  // Copy them from each reveal into its paired round so the question slide can display both names.
  if (format_type === 'fame-battle' || format_type === 'civilization-fight') {
    const sidesByRound = new Map<number, { side_a: string; side_b: string }>();
    for (const slide of generated.slides) {
      if (slide.slide_type === 'reveal' && slide.content.side_a && slide.content.side_b && slide.content.round_number != null) {
        sidesByRound.set(slide.content.round_number as number, {
          side_a: slide.content.side_a as string,
          side_b: slide.content.side_b as string,
        });
      }
    }
    for (const slide of generated.slides) {
      if (slide.slide_type !== 'round') continue;
      const rn = slide.content.round_number as number;
      const sides = sidesByRound.get(rn);
      if (sides) {
        slide.content.side_a = sides.side_a;
        slide.content.side_b = sides.side_b;
      }
    }
  }

  // For Historical Civilizations mode: build reliable feature_prompt and map_prompt from the
  // civilization name. The LLM frequently omits image_prompt — always derive it server-side.
  if (format_type === 'guess-the-empire') {
    const civByRound = new Map<number, string>();
    for (const slide of generated.slides) {
      if (slide.slide_type === 'reveal' && slide.content.correct_answer && slide.content.round_number != null) {
        civByRound.set(slide.content.round_number as number, slide.content.correct_answer as string);
      }
    }
    for (const slide of generated.slides) {
      if (slide.slide_type !== 'round') continue;
      const rn = slide.content.round_number as number;
      const empireName = civByRound.get(rn) ?? 'this historical civilization';
      const fp = empireIconicPrompt(empireName, rn);
      const mp = empireTerritoryPrompt(empireName, rn);
      slide.content.feature_prompt = fp;
      slide.content.map_prompt = mp;
      // Default image_prompt is the iconic feature; user can switch to territory map later.
      slide.image_prompt = fp;
      console.log(`[empire/generate] round=${rn} empire="${empireName}"\n  feature_prompt="${fp.substring(0, 80)}..."\n  map_prompt="${mp.substring(0, 80)}..."`);
    }
  }

  const gameId = uuidv4();

  db.prepare(`
    INSERT INTO games (id, template_id, title, hook, category, format_type, status)
    VALUES (?, ?, ?, ?, ?, ?, 'draft')
  `).run(gameId, template_id || null, generated.title, generated.hook, category, format_type);

  const insertSlide = db.prepare(`
    INSERT INTO slides (id, game_id, slide_index, slide_type, content, image_prompt, image_status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);

  db.exec('BEGIN TRANSACTION');
  try {
    for (const slide of generated.slides) {
      const ip = slide.image_prompt;
      const imagePrompt = typeof ip === 'string' && ip ? ip : null;
      insertSlide.run(
        uuidv4(),
        gameId,
        slide.slide_index,
        slide.slide_type,
        JSON.stringify(slide.content),
        imagePrompt
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const savedSlides = db
    .prepare('SELECT * FROM slides WHERE game_id = ? ORDER BY slide_index')
    .all(gameId) as any[];

  const slides = savedSlides.map((s) => ({ ...s, content: JSON.parse(s.content) }));

  return NextResponse.json({
    game: db.prepare('SELECT * FROM games WHERE id = ?').get(gameId),
    slides,
    scoring_system: generated.scoring_system,
  });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[generate/game] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
