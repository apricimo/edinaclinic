import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../../data/appointments_table.json");

async function readItems() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({ ...item }));
    }
    return [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeItems(items) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const payload = JSON.stringify(items, null, 2);
  await fs.writeFile(DATA_FILE, payload);
}

async function updateItems(mutator) {
  const items = await readItems();
  const clone = items.map((item) => ({ ...item }));
  const outcome = await mutator(clone);
  const nextItems = Array.isArray(outcome?.items) ? outcome.items : clone;
  if (!Array.isArray(nextItems)) {
    throw new Error("tableStore mutator must return array of items");
  }
  await writeItems(nextItems);
  return outcome?.result;
}

async function getItem(pk, sk) {
  const items = await readItems();
  return items.find((item) => item.pk === pk && item.sk === sk) || null;
}

async function queryByPrefix(prefix) {
  const items = await readItems();
  return items.filter((item) => item.pk.startsWith(prefix));
}

export default {
  readItems,
  writeItems,
  updateItems,
  getItem,
  queryByPrefix
};
