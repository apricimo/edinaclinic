const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} = require("@aws-sdk/lib-dynamodb");

let documentClient;

function getClient() {
  if (!documentClient) {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
    const base = new DynamoDBClient({ region });
    documentClient = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return documentClient;
}

function getItem(params) {
  return getClient().send(new GetCommand(params));
}

function putItem(params) {
  return getClient().send(new PutCommand(params));
}

function updateItem(params) {
  return getClient().send(new UpdateCommand(params));
}

function deleteItem(params) {
  return getClient().send(new DeleteCommand(params));
}

function queryItems(params) {
  return getClient().send(new QueryCommand(params));
}

function scanItems(params) {
  return getClient().send(new ScanCommand(params));
}

module.exports = {
  getClient,
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  scanItems
};
