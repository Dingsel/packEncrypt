import { existsSync, readFileSync, writeFileSync } from 'fs';
// @ts-ignore
import pkg from 'aes-js';
const { ModeOfOperation, utils } = pkg;
import { glob } from 'glob';

const exclude = ["manifest.json", "pack_icon.png"]

const mainKey = Buffer.from(
    Array.from({ length: 32 }, () => {
        const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return characters.charAt(Math.floor(Math.random() * characters.length));
    }).join('')
)
const iv = mainKey.subarray(0, 16)

if (!existsSync("./RP/manifest.json")) throw new TypeError("No Manifest Or Invalid File Structure")

const uuid = JSON.parse(readFileSync("./RP/manifest.json").toString())["header"]["uuid"];
if (!uuid) throw new TypeError("Invalid Manifest Or No UUID")

const contentsJSON = {
    content: []
}

const files = glob.sync("./RP/**/*", { nodir: true });
for (const file of files) {
    const fileBuffer = readFileSync(file)
    if (exclude.some(x => file.endsWith(x))) {
        writeFileSync(file, fileBuffer); contentsJSON.content.push({
            path: "." + file.split("RP", 2)[1].replace(/\\/g, "/"),
            key: null
        });
        continue
    }
    const subKey = Buffer.from(
        Array.from({ length: 32 }, () => {
            const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            return characters.charAt(Math.floor(Math.random() * characters.length));
        }).join('')
    )
    const mode = new ModeOfOperation.cfb(subKey, subKey.subarray(0, 16), 1)
    const arr = mode.encrypt(fileBuffer)
    writeFileSync(file, arr)
    contentsJSON.content.push({
        key: subKey.toString("utf-8"),
        path: file.split("RP", 2)[1].replace(/\\/g, "/").substring(1)
    })
}
const versionBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
const magicBuffer = Buffer.from([0xFC, 0xB9, 0xCF, 0x9B]);
const idBytes = Buffer.from([uuid.length]);

const header = Buffer.concat([versionBuffer, magicBuffer, Buffer.alloc(0x08), idBytes, Buffer.from(uuid), Buffer.alloc(0xcb)]);

const buffer = Buffer.from(JSON.stringify(contentsJSON))

const cipher = new ModeOfOperation.cfb(mainKey, iv, 1)

const file = Buffer.concat([header, Buffer.from(cipher.encrypt(buffer).buffer)])
console.warn(mainKey.toString())

writeFileSync("./RP/contents.json", file)