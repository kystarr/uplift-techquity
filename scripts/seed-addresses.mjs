/**
 * One-time script: seed DC/VA/MD addresses and lat/lng into all Business records.
 * Run with: node scripts/seed-addresses.mjs
 */
import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const TABLE = "Business-4bvvlw4hebcelf7kbu6tutknne-NONE";
const REGION = "us-east-2";

const client = new DynamoDBClient({ region: REGION });

// Seed data keyed by business name (partial match)
const seeds = [
  {
    match: "Natural Essence",
    street: "1331 U St NW",
    city: "Washington",
    state: "DC",
    zip: "20009",
    latitude: 38.9172,
    longitude: -77.0367,
  },
  {
    match: "Mindful Wellness",
    street: "520 King St",
    city: "Alexandria",
    state: "VA",
    zip: "22314",
    latitude: 38.8048,
    longitude: -77.0466,
  },
  {
    match: "Empowered Birth",
    street: "3600 16th St NW",
    city: "Washington",
    state: "DC",
    zip: "20010",
    latitude: 38.9315,
    longitude: -77.0364,
  },
  {
    match: "Urban Tech",
    street: "1000 Wilson Blvd",
    city: "Arlington",
    state: "VA",
    zip: "22209",
    latitude: 38.8954,
    longitude: -77.0722,
  },
  {
    match: "Heritage Books",
    street: "641 Indiana Ave NW",
    city: "Washington",
    state: "DC",
    zip: "20004",
    latitude: 38.8941,
    longitude: -77.0207,
  },
  {
    match: "Soul Food",
    street: "2723 Georgia Ave NW",
    city: "Washington",
    state: "DC",
    zip: "20001",
    latitude: 38.9275,
    longitude: -77.0196,
  },
];

const scanRes = await client.send(new ScanCommand({
  TableName: TABLE,
  ProjectionExpression: "id, businessName",
}));

for (const item of scanRes.Items ?? []) {
  const id = item.id.S;
  const name = item.businessName?.S ?? "";
  const seed = seeds.find((s) => name.includes(s.match));
  if (!seed) {
    console.log(`No seed for: ${name}`);
    continue;
  }

  await client.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: { id: { S: id } },
    UpdateExpression:
      "SET #street = :street, city = :city, #state = :state, zip = :zip, latitude = :lat, longitude = :lon",
    ExpressionAttributeNames: { "#street": "street", "#state": "state" },
    ExpressionAttributeValues: {
      ":street": { S: seed.street },
      ":city": { S: seed.city },
      ":state": { S: seed.state },
      ":zip": { S: seed.zip },
      ":lat": { N: String(seed.latitude) },
      ":lon": { N: String(seed.longitude) },
    },
  }));

  console.log(`Updated: ${name} → ${seed.street}, ${seed.city}, ${seed.state} ${seed.zip}`);
}

console.log("Done.");
