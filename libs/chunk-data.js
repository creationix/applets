// Block Orientations
// top can be up, down, east, west, north, south
// front can be any of the 4 touching whatever up is.
// 24 total orientations
// 5 bits can store all combinations
// 10 bits left for texture set index

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

// Face Orientations
// Each face can be rotated 4 directions in 90 degree clockwise increments
// down faces down for sides, down faces front for top and bottom.
// 2 bits for face rotation.
// 10 bits for texture index
// 6 bits free

const chunk = new Uint8Array(16 * 16 * 16)

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
// Define the geometry and store it in buffer objects
export default new Float32Array([
  ...generateBlock(0, 0, 0, 16, 1, 16, STONE, STONE, STONE, STONE, STONE, STONE),
  ...generateBlock(0, 1, 0, 16, 1, 16, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK),

  ...generateBlock(0, 2, 0, 5, 1, 16, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
  ...generateBlock(14, 2, 0, 2, 1, 16, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
  ...generateBlock(5, 2, 0, 9, 1, 4, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
  ...generateBlock(5, 2, 11, 9, 1, 5, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),

  ...generateBlock(5, 2, 4, 9, 1, 7, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE),
  ...generateBlock(5, 3, 4, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
  ...generateBlock(5, 3, 10, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
  ...generateBlock(13, 3, 4, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
  ...generateBlock(13, 3, 10, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),

  ...generateBlock(5, 3, 5, 1, 2, 5, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
  ...generateBlock(5, 6, 5, 1, 2, 5, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
  ...generateBlock(5, 8, 6, 1, 1, 3, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
  ...generateBlock(5, 9, 7, 1, 1, 1, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
  ...generateBlock(5, 5, 5, 1, 1, 5, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),

  ...generateBlock(6, 3, 4, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(12, 3, 4, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 3, 4, 5, 1, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 6, 4, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 4, 4, 5, 2, 1, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),

  ...generateBlock(6, 3, 10, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(12, 3, 10, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 3, 10, 5, 1, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 6, 10, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 4, 10, 5, 2, 1, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),
  ...generateBlock(7, 6, 10, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),

  ...generateBlock(1, 3, 2, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
  ...generateBlock(2, 3, 4, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
  ...generateBlock(3, 3, 3, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
  ...generateBlock(2, 3, 2, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
  ...generateBlock(4, 3, 1, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),

  ...generateBlock(6, 3, 5, 2, 2, 3, HAY_SIDE, HAY_SIDE, HAY_TOP, HAY_TOP, HAY_SIDE, HAY_SIDE),
  ...generateBlock(8, 3, 5, 1, 1, 1, BARREL_SIDE, BARREL_SIDE, BARREL_TOP, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE),
  ...generateBlock(6, 3, 8, 1, 1, 1, BARREL_SIDE, BARREL_SIDE, BARREL_OPEN, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE),

  ...generateBlock(6, 3, 9, 2, 3, 1, BOOKSHELF, BOOKSHELF, OAK_PLANKS, OAK_PLANKS, BOOKSHELF, BOOKSHELF),
  ...generateBlock(9, 3, 9, 1, 1, 1, FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT),
  ...generateBlock(10, 3, 9, 1, 1, 1, FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT_ON),
  ...generateBlock(11, 3, 9, 1, 1, 1, MUSIC_BOX_SIDE, MUSIC_BOX_SIDE, MUSIC_BOX_TOP, MUSIC_BOX_TOP, MUSIC_BOX_SIDE, MUSIC_BOX_SIDE),

  ...generateBlock(11, 3, 5, 1, 1, 1, LOOM_SIDE, LOOM_SIDE, LOOM_TOP, OAK_PLANKS, LOOM_FRONT, LOOM_SIDE),
  ...generateBlock(12, 3, 5, 1, 1, 1, CRAFTING_TABLE_SIDE, CRAFTING_TABLE_SIDE, CRAFTING_TABLE_TOP, OAK_PLANKS, CRAFTING_TABLE_FRONT, CRAFTING_TABLE_SIDE)

])
