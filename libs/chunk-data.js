import * as vec3 from './gl-matrix/src/vec3.js'
/*

Pull block out of toolbag using controller (small haptic feedback)
  Press joypad to toggle toolbag and move to select device
  this also has smooth snapping and light haptic feedback
  grid of tools is zoomed bigger in middle and maybe curves back in 3d space
  press gripper to clone an item from the toolbar
block tracks controller smoothly, maybe smaller than 100% or less than 100% opacity.
an in-air grid of blue vertices glows near block and fades away
when the block is near an aligned position it grows to proper size, grows more opaque and even moved into aligned position
with tiny haptic feedback
if close to grid when let go, snap fully into place with stronger haptic
if not close, drift in space slowly and slow to a stop.
pressing trigger while still gripped will clone/stamp a block to nearest grid "can" be removed by grabbing them with gripper
*/

// Block Orientations
// top can be up, down, east, west, north, south
// front can be any of the 4 touching whatever up is.
// 24 total orientations
// 5 bits can store all combinations
// 10 bits left for block type index (1024 "total" in system)

/* base 6
0 east
1 west
2 up
3 down
4 south
5 north

      02 03 04 05
      12 13 14 15
20 21       24 25
30 31       34 35
40 41 42 43
50 51 52 53

n cannot be paired with either of:
  a = n - (n % 2)
  b = a + 1

00 east
01 west
02 up
03 down
04 south
05 north

*/

// 10 bits for texture index
const BARREL_TOP = 0
const BARREL_SIDE = 1
const BARREL_BOTTOM = 2
const BARREL_OPEN = 3
const BOOKSHELF = 4
const OAK_PLANKS = 5
const OAK_LOG = 6
const OAK_END = 7
const STRIPPED_OAK_LOG = 8
const STRIPPED_OAK_END = 9
const STONE = 10
const GRASS_BLOCK_TOP = 11
const GRASS_BLOCK_SIDE = 12
const DIRT_BLOCK = 13
const HAY_TOP = 14
const HAY_SIDE = 15
const GLASS = 16
const FURNACE_BOTTOM = 17
const FURNACE_SIDE = 18
const FURNACE_FRONT = 19
const FURNACE_FRONT_ON = 20
const MUSIC_BOX_TOP = 21
const MUSIC_BOX_SIDE = 22
const LOOM_TOP = 23
const LOOM_FRONT = 24
const LOOM_SIDE = 25
const COBBLESTONE = 26
const CRAFTING_TABLE_TOP = 27
const CRAFTING_TABLE_FRONT = 28
const CRAFTING_TABLE_SIDE = 29
const PUMPKIN_TOP = 30
const PUMPKIN_SIDE = 31

// 5 bits for texture x coordinate (needs 0-16 range)
// 5 bits for texture y coordinate (needs 0-16 range)
const TL = (w, h) => 0
const BL = (w, h) => h << 10
const TR = (w, h) => w << 15
const BR = (w, h) => w << 15 | h << 10

// 3 bits for normal index
const RIGHT = 0 << 20 // 1,0,0
const LEFT = 1 << 20 // -1,0,0
const TOP = 2 << 20 // 0,1,0
const BOTTOM = 3 << 20 // 0,-1,0
const FRONT = 4 << 20 // 0,0,1
const BACK = 5 << 20 // 0,0,-1

// 1 bit of precision leftover

const blocks = {
  barrel: [BARREL_SIDE, BARREL_SIDE, BARREL_TOP, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE],
  barrelOpen: [BARREL_SIDE, BARREL_SIDE, BARREL_OPEN, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE],
  bookshelf: [BOOKSHELF, BOOKSHELF, OAK_PLANKS, OAK_PLANKS, BOOKSHELF, BOOKSHELF],
  cobblestone: [COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE],
  craftingTable: [CRAFTING_TABLE_SIDE, CRAFTING_TABLE_SIDE, CRAFTING_TABLE_TOP, OAK_PLANKS, CRAFTING_TABLE_FRONT, CRAFTING_TABLE_SIDE],
  dirt: [DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK],
  furnace: [FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT],
  furnaceOn: [FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT_ON],
  glass: [GLASS, GLASS, GLASS, GLASS, GLASS, GLASS],
  grass: [GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE],
  hay: [HAY_SIDE, HAY_SIDE, HAY_TOP, HAY_TOP, HAY_SIDE, HAY_SIDE],
  loom: [LOOM_SIDE, LOOM_SIDE, LOOM_TOP, OAK_PLANKS, LOOM_FRONT, LOOM_SIDE],
  musicBox: [MUSIC_BOX_SIDE, MUSIC_BOX_SIDE, MUSIC_BOX_TOP, MUSIC_BOX_TOP, MUSIC_BOX_SIDE, MUSIC_BOX_SIDE],
  oakLog: [OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG],
  oakPlanks: [OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS],
  pumpkin: [PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE],
  stone: [STONE, STONE, STONE, STONE, STONE, STONE],
  strippedOak: [STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG]
}

const transLevel = {
  glass: 1
}
const blockNames = Object.keys(blocks)
blockNames.forEach((n, i) => { blocks[n].index = i })

/**
 * @param {number} d direction index (0=+x 1=-x 2=+y 3=-y 4=+z 5=-z)
 * @returns {[number,number,number`]}
 */
function directionToNormal (d) {
  const s = (d & 1) ? -1 : 1
  return (d & 4) ? [0, 0, s] : (d & 2) ? [0, s, 0] : [s, 0, 0]
}

/**
 * @param {number} o orientation index from 0-31 mapping to the 24 different block orientations.
 * @returns {[number,number]} direction indices of top and front of block.
 */
function orientationToDirections (o) {
  o += 2
  return [(o / 6) | 0, o % 6]
}

/**
 * @param {number} o orientation index from 0-31 mapping to the 24 different block orientations.
 * @returns {[[number,number,number],[number,number,number]]}
 */
function orientationToNormals (o) {
  return orientationToDirections(o).map(directionToNormal)
}

// Face Orientations
// Each face can be rotated 4 directions in 90 degree clockwise increments
// down faces down for sides, down faces front for top and bottom.
// 2 bits for face rotation.
// 10 bits for texture index
// 6 bits free

function generateBlock (x, y, z, w, h, d, right, left, top, bottom, front, back) {
  return [
    // x, y, z, normal index | texture coordinate index | texture index
    x + w, y + 0, z + 0, RIGHT | BR(d, h) | right,
    x + w, y + h, z + 0, RIGHT | TR(d, h) | right,
    x + w, y + 0, z + d, RIGHT | BL(d, h) | right,
    x + w, y + 0, z + d, RIGHT | BL(d, h) | right,
    x + w, y + h, z + 0, RIGHT | TR(d, h) | right,
    x + w, y + h, z + d, RIGHT | TL(d, h) | right,
    x + 0, y + 0, z + 0, LEFT | BL(d, h) | left,
    x + 0, y + 0, z + d, LEFT | BR(d, h) | left,
    x + 0, y + h, z + 0, LEFT | TL(d, h) | left,
    x + 0, y + h, z + 0, LEFT | TL(d, h) | left,
    x + 0, y + 0, z + d, LEFT | BR(d, h) | left,
    x + 0, y + h, z + d, LEFT | TR(d, h) | left,
    x + 0, y + h, z + 0, TOP | TL(w, d) | top,
    x + 0, y + h, z + d, TOP | BL(w, d) | top,
    x + w, y + h, z + 0, TOP | TR(w, d) | top,
    x + w, y + h, z + 0, TOP | TR(w, d) | top,
    x + 0, y + h, z + d, TOP | BL(w, d) | top,
    x + w, y + h, z + d, TOP | BR(w, d) | top,
    x + 0, y + 0, z + 0, BOTTOM | TR(w, d) | bottom,
    x + w, y + 0, z + 0, BOTTOM | TL(w, d) | bottom,
    x + 0, y + 0, z + d, BOTTOM | BR(w, d) | bottom,
    x + 0, y + 0, z + d, BOTTOM | BR(w, d) | bottom,
    x + w, y + 0, z + 0, BOTTOM | TL(w, d) | bottom,
    x + w, y + 0, z + d, BOTTOM | BL(w, d) | bottom,
    x + 0, y + 0, z + d, FRONT | BL(w, h) | front,
    x + w, y + 0, z + d, FRONT | BR(w, h) | front,
    x + 0, y + h, z + d, FRONT | TL(w, h) | front,
    x + 0, y + h, z + d, FRONT | TL(w, h) | front,
    x + w, y + 0, z + d, FRONT | BR(w, h) | front,
    x + w, y + h, z + d, FRONT | TR(w, h) | front,
    x + 0, y + 0, z + 0, BACK | BR(w, h) | back,
    x + 0, y + h, z + 0, BACK | TR(w, h) | back,
    x + w, y + 0, z + 0, BACK | BL(w, h) | back,
    x + w, y + 0, z + 0, BACK | BL(w, h) | back,
    x + 0, y + h, z + 0, BACK | TR(w, h) | back,
    x + w, y + h, z + 0, BACK | TL(w, h) | back
  ]
}

// 5 bits for orientation, rest for type
const chunk = new Uint16Array(16 * 16 * 16)

function setBlocks (chunk, x, y, z, w, h, d, block, orientation = 24) {
  const blockIndex = block.index + 1
  for (let i = x; i < x + w; i++) {
    for (let j = y; j < y + h; j++) {
      for (let k = z; k < z + d; k++) {
        chunk[i + j * 16 + k * 256] = (blockIndex << 5) | orientation
      }
    }
  }
}

setBlocks(chunk, 0, 0, 0, 16, 1, 16, blocks.stone)
setBlocks(chunk, 0, 1, 0, 16, 1, 16, blocks.dirt)
setBlocks(chunk, 0, 2, 0, 5, 1, 16, blocks.grass)
setBlocks(chunk, 14, 2, 0, 2, 1, 16, blocks.grass)
setBlocks(chunk, 5, 2, 0, 9, 1, 4, blocks.grass)
setBlocks(chunk, 5, 2, 11, 9, 1, 5, blocks.grass)
setBlocks(chunk, 5, 2, 4, 9, 1, 7, blocks.cobblestone)
setBlocks(chunk, 5, 3, 4, 1, 5, 1, blocks.oakLog)
setBlocks(chunk, 5, 3, 10, 1, 5, 1, blocks.oakLog)
setBlocks(chunk, 13, 3, 4, 1, 5, 1, blocks.oakLog)
setBlocks(chunk, 13, 3, 10, 1, 5, 1, blocks.oakLog)
setBlocks(chunk, 5, 3, 5, 1, 2, 5, blocks.strippedOak)
setBlocks(chunk, 5, 6, 5, 1, 2, 5, blocks.strippedOak)
setBlocks(chunk, 5, 8, 6, 1, 1, 3, blocks.strippedOak)
setBlocks(chunk, 5, 9, 7, 1, 1, 1, blocks.strippedOak)
setBlocks(chunk, 5, 5, 5, 1, 1, 5, blocks.glass)
setBlocks(chunk, 6, 3, 4, 1, 5, 1, blocks.oakPlanks)
setBlocks(chunk, 12, 3, 4, 1, 5, 1, blocks.oakPlanks)
setBlocks(chunk, 7, 3, 4, 5, 1, 1, blocks.oakPlanks)
setBlocks(chunk, 7, 6, 4, 5, 2, 1, blocks.oakPlanks)
setBlocks(chunk, 7, 4, 4, 5, 2, 1, blocks.glass)
setBlocks(chunk, 6, 3, 10, 1, 5, 1, blocks.oakPlanks)
setBlocks(chunk, 12, 3, 10, 1, 5, 1, blocks.oakPlanks)
setBlocks(chunk, 7, 3, 10, 5, 1, 1, blocks.oakPlanks)
setBlocks(chunk, 7, 6, 10, 5, 2, 1, blocks.oakPlanks)
setBlocks(chunk, 7, 4, 10, 5, 2, 1, blocks.glass)
setBlocks(chunk, 7, 6, 10, 5, 2, 1, blocks.oakPlanks)
setBlocks(chunk, 1, 3, 2, 1, 1, 1, blocks.pumpkin)
setBlocks(chunk, 2, 3, 4, 1, 1, 1, blocks.pumpkin)
setBlocks(chunk, 3, 3, 3, 1, 1, 1, blocks.pumpkin)
setBlocks(chunk, 2, 3, 2, 1, 1, 1, blocks.pumpkin)
setBlocks(chunk, 4, 3, 1, 1, 1, 1, blocks.pumpkin)
setBlocks(chunk, 6, 3, 5, 2, 2, 3, blocks.hay)
setBlocks(chunk, 8, 3, 5, 1, 1, 1, blocks.barrel)
setBlocks(chunk, 6, 3, 8, 1, 1, 1, blocks.barrelOpen)
setBlocks(chunk, 6, 3, 9, 2, 3, 1, blocks.bookshelf)
setBlocks(chunk, 9, 3, 9, 1, 1, 1, blocks.furnace)
setBlocks(chunk, 10, 3, 9, 1, 1, 1, blocks.furnaceOn)
setBlocks(chunk, 11, 3, 9, 1, 1, 1, blocks.musicBox)
setBlocks(chunk, 11, 3, 5, 1, 1, 1, blocks.loom)
setBlocks(chunk, 12, 3, 5, 1, 1, 1, blocks.craftingTable)

/**
 * @param {Uint16Array} chunk
 * @returns {Float32Array}
 */
function generateMesh (chunk) {
  function getBlock (x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= 16 || y >= 16 || z >= 16) return { trans: Infinity }
    const point = chunk[x | (y << 4) | (z << 8)]
    if (!point) return { trans: Infinity }
    const blockName = blockNames[(point >> 5) - 1]
    return {
      orientation: point & 0x1f,
      trans: transLevel[blockName] || 0,
      textures: blocks[blockName]

    }
  }

  const mesh = []
  for (let z = 0; z < 16; z++) {
    // console.log(z, chunk.subarray(z * 256, z * 256 + 256))
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const block = getBlock(x, y, z)
        if (!block.textures) continue
        const { trans, textures: [right, left, top, bottom, front, back] } = block
        const w = 1
        const h = 1
        const d = 1
        // x, y, z, normal index | texture coordinate index | texture index
        if (trans < getBlock(x + 1, y, z).trans) {
          mesh.push(
            x + w, y + 0, z + 0, RIGHT | BR(d, h) | right,
            x + w, y + h, z + 0, RIGHT | TR(d, h) | right,
            x + w, y + 0, z + d, RIGHT | BL(d, h) | right,
            x + w, y + 0, z + d, RIGHT | BL(d, h) | right,
            x + w, y + h, z + 0, RIGHT | TR(d, h) | right,
            x + w, y + h, z + d, RIGHT | TL(d, h) | right
          )
        }
        if (trans < getBlock(x - 1, y, z).trans) {
          mesh.push(
            x + 0, y + 0, z + 0, LEFT | BL(d, h) | left,
            x + 0, y + 0, z + d, LEFT | BR(d, h) | left,
            x + 0, y + h, z + 0, LEFT | TL(d, h) | left,
            x + 0, y + h, z + 0, LEFT | TL(d, h) | left,
            x + 0, y + 0, z + d, LEFT | BR(d, h) | left,
            x + 0, y + h, z + d, LEFT | TR(d, h) | left
          )
        }
        if (trans < getBlock(x, y + 1, z).trans) {
          mesh.push(
            x + 0, y + h, z + 0, TOP | TL(w, d) | top,
            x + 0, y + h, z + d, TOP | BL(w, d) | top,
            x + w, y + h, z + 0, TOP | TR(w, d) | top,
            x + w, y + h, z + 0, TOP | TR(w, d) | top,
            x + 0, y + h, z + d, TOP | BL(w, d) | top,
            x + w, y + h, z + d, TOP | BR(w, d) | top
          )
        }
        if (trans < getBlock(x, y - 1, z).trans) {
          mesh.push(
            x + 0, y + 0, z + 0, BOTTOM | TR(w, d) | bottom,
            x + w, y + 0, z + 0, BOTTOM | TL(w, d) | bottom,
            x + 0, y + 0, z + d, BOTTOM | BR(w, d) | bottom,
            x + 0, y + 0, z + d, BOTTOM | BR(w, d) | bottom,
            x + w, y + 0, z + 0, BOTTOM | TL(w, d) | bottom,
            x + w, y + 0, z + d, BOTTOM | BL(w, d) | bottom
          )
        }
        if (trans < getBlock(x, y, z + 1).trans) {
          mesh.push(
            x + 0, y + 0, z + d, FRONT | BL(w, h) | front,
            x + w, y + 0, z + d, FRONT | BR(w, h) | front,
            x + 0, y + h, z + d, FRONT | TL(w, h) | front,
            x + 0, y + h, z + d, FRONT | TL(w, h) | front,
            x + w, y + 0, z + d, FRONT | BR(w, h) | front,
            x + w, y + h, z + d, FRONT | TR(w, h) | front
          )
        }
        if (trans < getBlock(x, y, z - 1).trans) {
          mesh.push(
            x + 0, y + 0, z + 0, BACK | BR(w, h) | back,
            x + 0, y + h, z + 0, BACK | TR(w, h) | back,
            x + w, y + 0, z + 0, BACK | BL(w, h) | back,
            x + w, y + 0, z + 0, BACK | BL(w, h) | back,
            x + 0, y + h, z + 0, BACK | TR(w, h) | back,
            x + w, y + h, z + 0, BACK | TL(w, h) | back
          )
        }
      }
    }
  }
  // console.log(chunk)
  console.log('vertex count', mesh.length >>> 2)
  return new Float32Array(mesh)
}

export default generateMesh(chunk)

if (import.meta.main) {
  for (let i = 0; i < 32; i++) {
    const [t, f] = orientationToNormals(i)
    // console.log(i, orientationToDirections(i))
    if (vec3.dot(t, f)) continue
    console.log(i, t, f)
  }
}
