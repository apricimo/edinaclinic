import os, json, boto3

dynamodb = boto3.resource("dynamodb")
TABLE = os.environ.get("APPOINTMENTS_TABLE", "appointments")

def handler(event, context):
    params = event.get("queryStringParameters") or {}
    appt_id = params.get("id")
    if not appt_id:
        return {"statusCode": 400, "body": json.dumps({"error": "missing id"})}
    table = dynamodb.Table(TABLE)
    res = table.get_item(Key={"pk": f"APPT#{appt_id}", "sk": "v0"})
    item = res.get("Item")
    if not item:
        return {"statusCode": 404, "body": json.dumps({"error": "not found"})}
    return {"statusCode": 200, "body": json.dumps(item)}