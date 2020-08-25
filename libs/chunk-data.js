import * as vec3 from './gl-matrix/src/vec3.js'
import { blocks } from './blocks.js'
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

export default chunk

if (import.meta.main) {
  for (let i = 0; i < 32; i++) {
    const [t, f] = orientationToNormals(i)
    // console.log(i, orientationToDirections(i))
    if (vec3.dot(t, f)) continue
    console.log(i, t, f)
  }
}
