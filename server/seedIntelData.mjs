/**
 * Seed script: Import SFDC pipeline data + pull live Gong/BQ data into the database.
 * Run with: node server/seedIntelData.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";

// Load env
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = mysql.createPool({
  uri: DATABASE_URL,
  ssl: {},
  waitForConnections: true,
  connectionLimit: 5,
});

const db = drizzle(pool);

// ============================================================
// SFDC Opportunities — parsed from scraped text files
// ============================================================

const SFDC_OPEN_PIPELINE = [
  { name: "Kraken FY26Q2 CTV", accountName: "KRAKEN", stageName: "Planned", amount: 610000, closeDate: "2026-04-01", probability: 0, ownerName: "Reece Rowlett", createdDate: "2026-02-27", oppType: "CTV-to-App" },
  { name: "Kraken_CTV > Web", accountName: "KRAKEN", stageName: "In Legal", amount: 430000, closeDate: "2026-04-06", probability: 50, ownerName: "Tori Vargas", createdDate: "2026-02-17", oppType: "CTV2Web" },
  { name: "Kraken_CTV > Heavy Up", accountName: "KRAKEN", stageName: "Planned", amount: 370000, closeDate: "2026-02-23", probability: 0, ownerName: "Tori Vargas", createdDate: "2026-02-17", oppType: "CTV-to-App" },
  { name: "CREDIT KARMA CTV", accountName: "Credit Karma", stageName: "Planned", amount: 230000, closeDate: "2026-05-01", probability: 0, ownerName: "Tori Vargas", createdDate: "2025-10-01", oppType: "CTV-to-App" },
  { name: "Lego Batmat Consolidated CTV", accountName: "Lego", stageName: "Pitched", amount: 225000, closeDate: "2026-05-09", probability: 25, ownerName: "Brendan O'Connor", createdDate: "2026-03-09", oppType: "CTV-to-App" },
  { name: "CTV Stillfront", accountName: "Stillfront Group", stageName: "Pitched", amount: 195000, closeDate: "2026-04-27", probability: 0, ownerName: "Brendan O'Connor", createdDate: "2026-03-16", oppType: "CTV-to-App" },
  { name: "CTV - Tilting Point", accountName: "Tilting Point", stageName: "In Legal", amount: 158000, closeDate: "2026-04-13", probability: 0, ownerName: "Brendan O'Connor", createdDate: "2026-02-03", oppType: "CTV-to-App" },
  { name: "CTV - Wildlife", accountName: "WILDLIFE", stageName: "Pitched", amount: 144000, closeDate: "2026-04-20", probability: 0, ownerName: "Brendan O'Connor", createdDate: "2026-03-30", oppType: "CTV-to-App" },
  { name: "Kia_CTV2Web", accountName: "Canvas Worldwide", stageName: "DPA and Contract(I/O) Negotiation", amount: 100000, closeDate: "2026-05-04", probability: 50, ownerName: "Dario Shekh", createdDate: "2026-03-30", oppType: "CTV2Web" },
  { name: "Zynga WWF - CTV", accountName: "Zynga", stageName: "Pitched", amount: 90000, closeDate: "2026-06-01", probability: 25, ownerName: "Brendan O'Connor", createdDate: "2026-03-16", oppType: "CTV-to-App" },
  { name: "Self - CTV", accountName: "Self Financial, Inc.", stageName: "Pitched", amount: 79000, closeDate: "2026-04-13", probability: 25, ownerName: "Priyanka Chandraker", createdDate: "2026-03-09", oppType: "CTV-to-App" },
  { name: "DraftKings Casino CTV", accountName: "Draftkings", stageName: "Planned", amount: 62000, closeDate: "2026-04-30", probability: 0, ownerName: "Alex Esposito", createdDate: "2026-03-30", oppType: "CTV-to-App" },
  { name: "DraftKings CTV Upsell", accountName: "Draftkings", stageName: "Planned", amount: 60000, closeDate: "2026-04-01", probability: 0, ownerName: "Alex Esposito", createdDate: "2026-01-27", oppType: "CTV-to-App" },
  { name: "Q2 - Lyft - CTV Upsell", accountName: "Lyft, Inc.", stageName: "Planned", amount: 51200, closeDate: "2026-05-04", probability: 0, ownerName: "Rhea Jethi", createdDate: "2026-01-27", oppType: "CTV2Web" },
  { name: "NYL AARP_CTV2Web", accountName: "NYL AARP", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-02-10", oppType: "CTV2Web" },
  { name: "Nike_CTV2Web_PMG", accountName: "Nike, Inc.", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-02-10", oppType: "CTV2Web" },
  { name: "Michaels_CTV2Web_PMG", accountName: "Michaels", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-02-10", oppType: "CTV2Web" },
  { name: "McAfee_CTV2Web", accountName: "Mcafee", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-02-10", oppType: "CTV2Web" },
  { name: "Best Western_CTV2Web", accountName: "Best Western", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-02-10", oppType: "CTV2Web" },
  { name: "Peloton_CTV2Web", accountName: "Peloton", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-02-10", oppType: "CTV2Web" },
  { name: "Shark Ninja_CTV2Web", accountName: "Shark Ninja", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-02-10", oppType: "CTV2Web" },
  { name: "Shark Ninja_CTV2Cert", accountName: "Shark Ninja", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-02-10", oppType: "CTV2Web" },
  { name: "McAfee_CTV2Web_Q4", accountName: "Mcafee", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-10-23", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-10-23", oppType: "CTV2Web" },
  { name: "Kohler_CTV2Web", accountName: "Kohler", stageName: "Contact Qualified", amount: 50000, closeDate: "2026-04-01", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-10-23", oppType: "CTV2Web" },
  { name: "Tilt - CTV", accountName: "Tilt Finance, Inc.", stageName: "Planned", amount: 46000, closeDate: "2026-10-01", probability: 0, ownerName: "Priyanka Chandraker", createdDate: "2026-02-03", oppType: "CTV-to-App" },
  { name: "Amazon Music - CTV", accountName: "Amazon Mobile LLC", stageName: "Pitched", amount: 45500, closeDate: "2026-04-01", probability: 25, ownerName: "Priyanka Chandraker", createdDate: "2026-02-27", oppType: "CTV-to-App" },
  { name: "Fanatics Shop CTV", accountName: "Fanatics, LLC", stageName: "Planned", amount: 32500, closeDate: "2026-04-27", probability: 0, ownerName: "Stephen Lowe", createdDate: "2025-10-15", oppType: "CTV-to-App" },
  { name: "Peak CTV", accountName: "Peak", stageName: "Pitched", amount: 21500, closeDate: "2025-11-16", probability: 25, ownerName: "Adi Rubin", createdDate: "2025-11-11", oppType: "CTV-to-App" },
  { name: "PrizePicks - CTV Launch", accountName: "PrizePicks", stageName: "Pitched", amount: 18000, closeDate: "2026-03-23", probability: 25, ownerName: "Mitchell James", createdDate: "2025-02-09", oppType: "CTV-to-App" },
  { name: "Q2 - Turo - CTV Upsell", accountName: "Turo Inc.", stageName: "Planned", amount: 15500, closeDate: "2026-04-06", probability: 0, ownerName: "Rhea Jethi", createdDate: "2026-01-27", oppType: "CTV2Web" },
  { name: "Q2 - Benjamin - CTV", accountName: "Benjamin Capital Partners", stageName: "Planned", amount: 14500, closeDate: "2026-04-06", probability: 0, ownerName: "Rhea Jethi", createdDate: "2026-01-27", oppType: "CTV2Web" },
  { name: "Q2 - Instacart - CTV", accountName: "Instacart Inc", stageName: "Planned", amount: 14500, closeDate: "2026-05-04", probability: 0, ownerName: "Rhea Jethi", createdDate: "2025-10-01", oppType: "CTV2Web" },
  { name: "CTV Launch - Hard Rock Bet", accountName: "Hard Rock Bet", stageName: "Pitched", amount: 9000, closeDate: "2026-03-23", probability: 25, ownerName: "Mitchell James", createdDate: "2025-10-21", oppType: "CTV-to-App" },
  { name: "Ridi_Manta_CTV", accountName: "RIDI Corporation", stageName: "Sales Qualified", amount: 9000, closeDate: "2026-04-17", probability: 10, ownerName: "Junhyung Kwon", createdDate: "2025-03-27", oppType: "CTV-to-App" },
  { name: "BLIZZARD CTV", accountName: "Blizzard Entertainment", stageName: "Pitched", amount: 0, closeDate: "2026-04-20", probability: 25, ownerName: "Brendan O'Connor", createdDate: "2026-03-16", oppType: "CTV-to-App" },
  { name: "JITB - CTV", accountName: "Jack in the Box", stageName: "Planned", amount: 0, closeDate: "2026-04-06", probability: 0, ownerName: "Priyanka Chandraker", createdDate: "2026-03-30", oppType: "CTV2Web" },
  { name: "Wayfair_CTV", accountName: "Wayfair LLC", stageName: "Pitched", amount: 0, closeDate: "2026-05-04", probability: 25, ownerName: "Dario Shekh", createdDate: "2026-03-30", oppType: "CTV2Web" },
  { name: "Acorns - CTV", accountName: "Acorns Grow Inc", stageName: "Pitched", amount: 0, closeDate: "2026-05-01", probability: 25, ownerName: "Priyanka Chandraker", createdDate: "2026-03-09", oppType: "CTV-to-App" },
  { name: "Q2 - Courtyard - CTV", accountName: "COURTYARD", stageName: "Planned", amount: 0, closeDate: "2026-04-06", probability: 0, ownerName: "Rhea Jethi", createdDate: "2026-01-27", oppType: "CTV2Web" },
  { name: "Q2 - Doordash - CTV", accountName: "DoorDash, Inc.", stageName: "Planned", amount: 0, closeDate: "2026-05-04", probability: 0, ownerName: "Rhea Jethi", createdDate: "2026-01-27", oppType: "CTV2Web" },
  { name: "FY26Q1 CTV Launch", accountName: "Activehours", stageName: "Pitched", amount: 0, closeDate: "2026-04-15", probability: 25, ownerName: "Priyanka Chandraker", createdDate: "2026-02-03", oppType: "CTV-to-App" },
  { name: "Chewy_CTV", accountName: "Chewy, Inc.", stageName: "Planned", amount: -52000, closeDate: "2026-04-27", probability: 0, ownerName: "Dario Shekh", createdDate: "2026-03-30", oppType: "CTV2Web" },
  { name: "Appodeal CTV", accountName: "Appodeal Stack", stageName: "Pitched", amount: -29000, closeDate: "2026-04-30", probability: 25, ownerName: "Brendan O'Connor", createdDate: "2026-03-16", oppType: "CTV-to-App" },
];

const SFDC_CLOSED_WON = [
  { name: "ARB CTV - Evergreen budget increase", accountName: "ARB Gaming LLC", amount: 0, closeDate: "2026-03-06", ownerName: "Mitchell James", createdDate: "2026-02-09" },
  { name: "Chillgaming CTV", accountName: "CHILLGAMING LTD", amount: 12500, closeDate: "2026-02-09", ownerName: "Anna Luchina", createdDate: "2025-12-08" },
  { name: "ARB CTV budget increase MDF", accountName: "ARB Gaming LLC", amount: 310000, closeDate: "2026-02-04", ownerName: "Mitchell James", createdDate: "2026-02-06" },
  { name: "Superplay: CTV Launch", accountName: "Superplay", amount: 140000, closeDate: "2026-01-25", ownerName: "Prinit Suissa", createdDate: "2026-01-26" },
  { name: "Underdog CTV Upsell", accountName: "Underdog Fantasy Sports", amount: 22000, closeDate: "2026-01-15", ownerName: "Alex Esposito", createdDate: "2025-10-09" },
  { name: "Hutch Games CTV Upsell & MDF", accountName: "Hutch Games Ltd", amount: 64000, closeDate: "2026-01-13", ownerName: "Ilke Barutcuoglu", createdDate: "2026-02-16" },
  { name: "Plarium CTV", accountName: "Plarium Global Ltd.", amount: 85000, closeDate: "2026-01-06", ownerName: "Tomer Magal", createdDate: "2025-12-25" },
  { name: "Q1 - DoorDash - CTV", accountName: "DoorDash, Inc.", amount: 15500, closeDate: "2026-01-01", ownerName: "Rhea Jethi", createdDate: "2025-10-02" },
  { name: "Jackpocket CTV", accountName: "Jackpocket Inc.", amount: 10000, closeDate: "2025-12-23", ownerName: "Alex Esposito", createdDate: "2025-12-23" },
  { name: "CTV Launch - Rush Street", accountName: "RUSH_STREET_INTERACTIVE", amount: 121000, closeDate: "2025-12-01", ownerName: "Mitchell James", createdDate: "2025-10-21" },
  { name: "Glow Recipe CTV", accountName: "Glow Recipe", amount: 35000, closeDate: "2025-11-25", ownerName: "Junhyung Kwon", createdDate: "2025-11-05" },
  { name: "Robinhood CTV Upsell", accountName: "Robinhood", amount: 30000, closeDate: "2025-11-12", ownerName: "Tori Vargas", createdDate: "2025-10-01" },
  { name: "Nexters CTV scaling", accountName: "Nexters", amount: 25500, closeDate: "2025-11-11", ownerName: "Anna Luchina", createdDate: "2025-10-27" },
  { name: "Zynga CTV Upsell", accountName: "Zynga", amount: 248000, closeDate: "2025-10-28", ownerName: "Astrid Preussner", createdDate: "2025-10-01" },
  { name: "ARBGAMINGLLC_CTV", accountName: "ARB Gaming LLC", amount: 105600, closeDate: "2025-10-06", ownerName: "Paloma Pedraza", createdDate: "2025-09-22" },
  { name: "Ria Money Transfer CTV Upsell", accountName: "Ria Money Transfer", amount: 276000, closeDate: "2025-10-01", ownerName: "Stephen Lowe", createdDate: "2025-10-01" },
  { name: "March Madness CTV", accountName: "PMG Worldwide", amount: 204000, closeDate: "2025-03-11", ownerName: "Stephen Lowe", createdDate: "2025-01-24" },
  { name: "Innplay Labs CTV Upsell 1", accountName: "Innplay Labs", amount: 88500, closeDate: "2025-01-17", ownerName: "Adi Rubin", createdDate: "2024-11-12" },
  { name: "Innplay Labs CTV Upsell 2", accountName: "Innplay Labs", amount: 14000, closeDate: "2024-12-25", ownerName: "Adi Rubin", createdDate: "2024-11-11" },
  { name: "Innplay Labs CTV Upsell 3", accountName: "Innplay Labs", amount: 31500, closeDate: "2024-12-14", ownerName: "Adi Rubin", createdDate: "2024-12-04" },
  { name: "Innplay Labs CTV Upsell 4", accountName: "Innplay Labs", amount: 14250, closeDate: "2024-12-13", ownerName: "Adi Rubin", createdDate: "2024-11-11" },
  { name: "Candivore CTV scaling", accountName: "Candivore LTD", amount: 152000, closeDate: "2024-11-24", ownerName: "Adi Rubin", createdDate: "2025-01-01" },
  { name: "Marvel rivals CTV trial", accountName: "NetEase Games", amount: 42000, closeDate: "2025-04-21", ownerName: "Emily Zhu", createdDate: "2025-04-15" },
  { name: "Tubi CTV launch", accountName: "Scorewarrior Limited", amount: 43000, closeDate: "2025-05-19", ownerName: "Paulina Groznikate", createdDate: "2025-05-20" },
  { name: "Smilegate Epic Seven CTV", accountName: "Smilegate Holdings", amount: 8000, closeDate: "2025-09-25", ownerName: "Junhyung Kwon", createdDate: "2025-09-01" },
];

const SFDC_CLOSED_LOST = [
  { name: "Marvel rivals CTV commercial", accountName: "NetEase Games", amount: 1000000, closeDate: "2025-05-05", ownerName: "Emily Zhu", createdDate: "2025-04-15" },
  { name: "Credit Karma Expand Top of Funnel", accountName: "Credit Karma", amount: 600000, closeDate: "2023-10-01", ownerName: "Reece Rowlett", createdDate: "2023-08-01" },
  { name: "Product Madness CTV Upsell", accountName: "Product Madness, Inc", amount: 344000, closeDate: "2025-01-16", ownerName: "Gabriela Kozicki", createdDate: "2024-11-01" },
  { name: "Candivore CTV Upsell", accountName: "Candivore LTD", amount: 338000, closeDate: "2025-01-14", ownerName: "Adi Rubin", createdDate: "2024-11-01" },
  { name: "Robinhood_CTV Upsell", accountName: "Robinhood", amount: 295000, closeDate: "2026-02-01", ownerName: "Tori Vargas", createdDate: "2025-10-01" },
  { name: "EA - SWGOH CTV Pitch", accountName: "Electronic Arts Inc.", amount: 196000, closeDate: "2026-02-01", ownerName: "Diana Chavez", createdDate: "2025-10-01" },
  { name: "GURU CTV Expansion", accountName: "GURU SINGAPORE", amount: 195000, closeDate: "2024-10-28", ownerName: "Bailey Zhang", createdDate: "2024-08-01" },
  { name: "SpinX CTV", accountName: "SpinX Games Limited", amount: 183000, closeDate: "2025-06-01", ownerName: "Simon LV", createdDate: "2025-03-01" },
  { name: "Hutch Games CTV", accountName: "Hutch Games Ltd", amount: 157000, closeDate: "2025-07-28", ownerName: "Ilke Barutcuoglu", createdDate: "2025-05-01" },
  { name: "Robinhood_CTV", accountName: "Robinhood", amount: 155000, closeDate: "2025-12-01", ownerName: "Tori Vargas", createdDate: "2025-10-01" },
  { name: "Blinkist CTV Launch", accountName: "Blinks Labs GmbH", amount: 124000, closeDate: "2025-12-01", ownerName: "Marina Porto Pimentel Mendonca", createdDate: "2025-10-01" },
  { name: "Credit Karma_Q2_CTV", accountName: "Credit Karma", amount: 117500, closeDate: "2025-05-15", ownerName: "Reece Rowlett", createdDate: "2025-03-01" },
  { name: "RIA CTV", accountName: "Ria Money Transfer", amount: 104348, closeDate: "2025-12-08", ownerName: "Stephen Lowe", createdDate: "2025-10-01" },
  { name: "Kabam DMV Test CTV", accountName: "Kabam Games Inc", amount: 100000, closeDate: "2023-03-01", ownerName: "Nathan Pringle-Dressler", createdDate: "2022-12-01" },
  { name: "Autopilot UA+CTV", accountName: "Autopilot Holdings", amount: 100000, closeDate: "2025-11-01", ownerName: "Nathan Pringle-Dressler", createdDate: "2025-08-01" },
  { name: "CashApp UA + CTV", accountName: "Cash App", amount: 100000, closeDate: "2025-10-01", ownerName: "Nathan Pringle-Dressler", createdDate: "2025-07-01" },
  { name: "SOLAR GAME CTV Expansion", accountName: "SOLAR GAME LTD", amount: 96000, closeDate: "2025-04-30", ownerName: "Edward Lau", createdDate: "2025-02-01" },
  { name: "Century Games CTV Expansion", accountName: "Century Games PTE", amount: 96000, closeDate: "2025-04-30", ownerName: "Edward Lau", createdDate: "2025-02-01" },
  { name: "Genius Sports CTV Pitch", accountName: "Genius Sports", amount: 93000, closeDate: "2025-03-01", ownerName: "Libby Ross", createdDate: "2025-01-01" },
  { name: "MISTPLAY CTV Upsell", accountName: "Mistplay, Inc.", amount: 92000, closeDate: "2025-10-01", ownerName: "Gabriel Green", createdDate: "2025-07-01" },
  { name: "DRAFTKINGS CTV Upsell", accountName: "Draftkings", amount: 92000, closeDate: "2025-10-01", ownerName: "Alex Esposito", createdDate: "2025-07-01" },
  { name: "Genius StakeMate CTV Upsell", accountName: "GENIUS - StakeMate", amount: 92000, closeDate: "2025-10-01", ownerName: "Libby Ross", createdDate: "2025-07-01" },
  { name: "Genius Bally CTV Upsell", accountName: "Ballys", amount: 92000, closeDate: "2025-10-01", ownerName: "Jay Raghavan", createdDate: "2025-07-01" },
  { name: "Genius TwinSpires CTV Upsell", accountName: "GENIUS - TwinSpires", amount: 92000, closeDate: "2025-10-01", ownerName: "Libby Ross", createdDate: "2025-07-01" },
  { name: "Opera CTV", accountName: "Opera Norway AS", amount: 92000, closeDate: "2026-05-01", ownerName: "Diletta Della Croce", createdDate: "2025-10-01" },
  { name: "Q1 - Snap - CTV", accountName: "Snap Inc.", amount: 88000, closeDate: "2026-02-16", ownerName: "Gabriel Green", createdDate: "2025-10-01" },
  { name: "Plarium CTV", accountName: "Plarium Global Ltd.", amount: 85000, closeDate: "2026-01-06", ownerName: "Tomer Magal", createdDate: "2025-10-01" },
  { name: "Hutch Games CTV Upsell", accountName: "Hutch Games Ltd", amount: 64000, closeDate: "2026-01-13", ownerName: "Ilke Barutcuoglu", createdDate: "2025-10-01" },
  { name: "Rocket Money CTV", accountName: "Rocket Money", amount: 60000, closeDate: "2026-03-02", ownerName: "Priyanka Chandraker", createdDate: "2025-10-01" },
  { name: "Topps CTV", accountName: "The Topps Company", amount: 60000, closeDate: "2025-12-05", ownerName: "Stephen Lowe", createdDate: "2025-10-01" },
];

async function seedSFDC() {
  console.log("Seeding SFDC opportunities...");
  const now = Date.now();
  
  // Clear existing
  await pool.query("DELETE FROM sfdc_opportunities");
  
  const allOpps = [
    ...SFDC_OPEN_PIPELINE.map(o => ({ ...o, stageName: o.stageName })),
    ...SFDC_CLOSED_WON.map(o => ({ ...o, stageName: "Closed Won", oppType: "CTV-to-App" })),
    ...SFDC_CLOSED_LOST.map(o => ({ ...o, stageName: "Closed Lost", oppType: "CTV-to-App" })),
  ];
  
  for (const opp of allOpps) {
    const id = randomUUID().replace(/-/g, "").slice(0, 32);
    await pool.query(
      `INSERT INTO sfdc_opportunities (id, name, account_name, stage_name, amount, close_date, probability, owner_name, opp_type, created_date, data_source, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, opp.name, opp.accountName, opp.stageName, opp.amount || 0, opp.closeDate, opp.probability || 0, opp.ownerName, opp.oppType || "CTV-to-App", opp.createdDate, "sfdc_scrape_2026-04-01", now]
    );
  }
  
  console.log(`  ✓ Inserted ${allOpps.length} SFDC opportunities`);
  
  // Log the refresh
  const logId = randomUUID().replace(/-/g, "").slice(0, 32);
  await pool.query(
    `INSERT INTO data_refresh_log (id, source, refresh_status, record_count, duration_ms, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [logId, "sfdc", "completed", allOpps.length, 0, now, now]
  );
}

async function seedBQSnapshot() {
  console.log("Pulling live BQ data and storing snapshot...");
  const now = Date.now();
  const startTime = now;
  
  try {
    // Pull from the local BQ endpoint
    const resp = await fetch("http://localhost:3000/api/trpc/reporting.bqRevenue");
    const json = await resp.json();
    const data = json?.result?.data?.json?.data;
    
    if (!data) {
      console.log("  ⚠ No BQ data available from local endpoint, skipping snapshot");
      return;
    }
    
    // summary and trailing_7d are arrays — take first element
    const summary = Array.isArray(data.summary) ? data.summary[0] : data.summary;
    const trailing7d = Array.isArray(data.trailing_7d) ? data.trailing_7d[0] : data.trailing_7d;
    
    const id = randomUUID().replace(/-/g, "").slice(0, 32);
    const today = new Date().toISOString().split("T")[0];
    
    // Clear existing snapshots for today
    await pool.query("DELETE FROM bq_revenue_snapshots WHERE snapshot_date = ?", [today]);
    
    await pool.query(
      `INSERT INTO bq_revenue_snapshots (id, snapshot_date, total_gas, total_campaigns, total_advertisers, avg_daily_gas, trailing_7d_avg, trailing_30d_avg, monthly_data, top_advertisers, exchange_breakdown, daily_trend, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, today,
        summary?.total_gas || 0,
        summary?.total_campaigns || 0,
        summary?.total_advertisers || 0,
        summary?.avg_daily_gas || 0,
        trailing7d?.trailing_7d_daily || 0,
        summary?.avg_daily_gas || 0,
        JSON.stringify(data.monthly || []),
        JSON.stringify(data.top_advertisers || []),
        JSON.stringify(data.exchanges || []),
        JSON.stringify(data.daily_recent || []),
        now,
      ]
    );
    
    console.log(`  ✓ BQ snapshot stored: $${(summary?.total_gas || 0).toLocaleString()} total GAS, ${summary?.total_campaigns} campaigns, ${summary?.total_advertisers} advertisers`);
    
    // Log refresh
    const logId = randomUUID().replace(/-/g, "").slice(0, 32);
    await pool.query(
      `INSERT INTO data_refresh_log (id, source, refresh_status, record_count, duration_ms, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [logId, "bq", "completed", 1, Date.now() - startTime, startTime, Date.now()]
    );
  } catch (err) {
    console.log(`  ⚠ BQ snapshot failed: ${err.message}`);
  }
}

async function seedGongCalls() {
  console.log("Pulling live Gong data and storing calls...");
  const now = Date.now();
  const startTime = now;
  
  try {
    // Pull from the local Gong endpoint
    const resp = await fetch("http://localhost:3000/api/trpc/reporting.gongIntel");
    const json = await resp.json();
    const data = json?.result?.data?.json;
    
    if (!data?.matched_calls || data.matched_calls.length === 0) {
      console.log("  ⚠ No Gong data available from local endpoint, skipping");
      return;
    }
    
    // Clear existing
    await pool.query("DELETE FROM gong_calls");
    
    let inserted = 0;
    for (const call of data.matched_calls) {
      const id = randomUUID().replace(/-/g, "").slice(0, 32);
      const gongCallId = call.id || call.callId || String(call.metaData?.id || "");
      const meta = call.metaData || call;
      
      await pool.query(
        `INSERT INTO gong_calls (id, gong_call_id, title, started, duration, direction, primary_user_name, account_name, parties, transcript_excerpt, is_ctv_relevant, ctv_keywords_found, url, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          gongCallId,
          meta.title || call.title || "",
          meta.started || call.started || "",
          meta.duration || call.duration || 0,
          meta.direction || call.direction || "",
          meta.primaryUser || call.primaryUser || "",
          call.account || meta.account || "",
          JSON.stringify(call.parties || []),
          call.transcript || "",
          1,
          JSON.stringify(call.keywords_found || []),
          meta.url || call.url || `https://app.gong.io/call?id=${gongCallId}`,
          now,
        ]
      );
      inserted++;
    }
    
    console.log(`  ✓ Inserted ${inserted} Gong CTV calls`);
    
    // Log refresh
    const logId = randomUUID().replace(/-/g, "").slice(0, 32);
    await pool.query(
      `INSERT INTO data_refresh_log (id, source, refresh_status, record_count, duration_ms, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [logId, "gong", "completed", inserted, Date.now() - startTime, startTime, Date.now()]
    );
  } catch (err) {
    console.log(`  ⚠ Gong seed failed: ${err.message}`);
  }
}

async function main() {
  console.log("=== CTV Intelligence Data Seed ===");
  console.log(`Database: ${DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`);
  console.log("");
  
  await seedSFDC();
  await seedBQSnapshot();
  await seedGongCalls();
  
  console.log("");
  console.log("=== Seed complete ===");
  
  // Show summary
  const [sfdcCount] = await pool.query("SELECT COUNT(*) as cnt FROM sfdc_opportunities");
  const [gongCount] = await pool.query("SELECT COUNT(*) as cnt FROM gong_calls");
  const [bqCount] = await pool.query("SELECT COUNT(*) as cnt FROM bq_revenue_snapshots");
  const [logCount] = await pool.query("SELECT COUNT(*) as cnt FROM data_refresh_log");
  
  console.log(`SFDC opportunities: ${sfdcCount[0].cnt}`);
  console.log(`Gong calls: ${gongCount[0].cnt}`);
  console.log(`BQ snapshots: ${bqCount[0].cnt}`);
  console.log(`Refresh logs: ${logCount[0].cnt}`);
  
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
