import boto3

TABLE = "Business-4bvvlw4hebcelf7kbu6tutknne-NONE"
client = boto3.client("dynamodb", region_name="us-east-2")

seeds = {
    "Natural Essence": dict(street="1331 U St NW", city="Washington", state="DC", zip="20009", lat=38.9172, lon=-77.0367),
    "Mindful Wellness": dict(street="520 King St", city="Alexandria", state="VA", zip="22314", lat=38.8048, lon=-77.0466),
    "Empowered Birth": dict(street="3600 16th St NW", city="Washington", state="DC", zip="20010", lat=38.9315, lon=-77.0364),
    "Urban Tech": dict(street="1000 Wilson Blvd", city="Arlington", state="VA", zip="22209", lat=38.8954, lon=-77.0722),
    "Heritage Books": dict(street="641 Indiana Ave NW", city="Washington", state="DC", zip="20004", lat=38.8941, lon=-77.0207),
    "Soul Food": dict(street="2723 Georgia Ave NW", city="Washington", state="DC", zip="20001", lat=38.9275, lon=-77.0196),
}

res = client.scan(TableName=TABLE, ProjectionExpression="id, businessName")
for item in res["Items"]:
    id_ = item["id"]["S"]
    name = item.get("businessName", {}).get("S", "")
    seed = next((v for k, v in seeds.items() if k in name), None)
    if not seed:
        print(f"No seed for: {name}")
        continue
    client.update_item(
        TableName=TABLE,
        Key={"id": {"S": id_}},
        UpdateExpression="SET #st = :street, city = :city, #sta = :state, zip = :zip, latitude = :lat, longitude = :lon",
        ExpressionAttributeNames={"#st": "street", "#sta": "state"},
        ExpressionAttributeValues={
            ":street": {"S": seed["street"]},
            ":city": {"S": seed["city"]},
            ":state": {"S": seed["state"]},
            ":zip": {"S": seed["zip"]},
            ":lat": {"N": str(seed["lat"])},
            ":lon": {"N": str(seed["lon"])},
        },
    )
    print(f"Updated: {name} -> {seed['street']}, {seed['city']}, {seed['state']} {seed['zip']}")

print("Done.")
