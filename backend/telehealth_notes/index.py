import os, json, boto3, datetime, base64

dynamodb = boto3.resource("dynamodb")
TABLE = os.environ.get("APPOINTMENTS_TABLE", "appointments")

def _resp(code, obj):
    return {
        "statusCode": code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(obj),
    }

def handler(event, context):
    try:
        body_raw = event.get("body") or ""
        if event.get("isBase64Encoded"):
            body_raw = base64.b64decode(body_raw).decode("utf-8")
        data = json.loads(body_raw or "{}")
    except Exception as e:
        return _resp(400, {"error": "invalid_json", "detail": str(e)})

    appt_id = data.get("appointment_id")
    content = data.get("content", "")
    author = data.get("author", "provider")
    if not appt_id:
        return _resp(400, {"error": "appointment_id_required"})

    pk = f"APPT#{appt_id}"
    sk = "v0"
    table = dynamodb.Table(TABLE)

    # make sure the appointment exists
    got = table.get_item(Key={"pk": pk, "sk": sk})
    if "Item" not in got:
        return _resp(404, {"error": "appointment_not_found"})

    now = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
    updated = table.update_item(
        Key={"pk": pk, "sk": sk},
        UpdateExpression="SET notes_markdown = :n, notes_updated_at = :t, notes_author = :a",
        ExpressionAttributeValues={":n": content, ":t": now, ":a": author},
        ReturnValues="ALL_NEW",
    )

    return _resp(200, {"ok": True, "updated": updated.get("Attributes", {})})
