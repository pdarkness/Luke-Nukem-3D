# Luke Nukem 3D

*A long time ago, in a galaxy far, far away... someone had to kick some Imperial ass.*

A Duke Nukem 3D–style first-person shooter with a Star Wars twist. Luke Nukem has snuck
aboard the Death Star to take back the galaxy's bubble gum supply, and he's all out of gum.

It's a pure-JavaScript raycasting engine with textured walls, floors and ceilings, sliding
blast doors, keycards and billboard sprites. It needs no build step and no asset files:
every texture, sprite and sound effect is generated in code at startup.

## Play

Open `index.html` in a modern browser. That's it; it also works straight from `file://`.
Or serve the folder with any static server (for example `npx serve .`) or GitHub Pages.

## Controls

| Key | Action |
| --- | --- |
| **W A S D** / arrows | Move / strafe (arrows turn) |
| **Mouse** | Aim (click the screen to capture the mouse) |
| **Shift** | Run |
| **Left click** / Ctrl | Fire |
| **Right click** / **F** | Force push (costs Force, regenerates) |
| **E** / Space | Open doors, press switches |
| **1–4**, mouse wheel, Q | Switch weapons |
| **Tab** / M | Toggle map |
| **V** | Toggle Luke's spoken one-liners |
| **N** | Toggle sound |
| **P** / Esc | Pause |

## Arsenal

1. **Lightsaber**: melee with unlimited uses. Swing it at incoming blaster bolts to send them back at the shooter.
2. **DL-44 blaster**: a reliable sidearm that runs on power cells.
3. **E-11 blaster rifle**: rapid fire. You'll find it in the detention block.
4. **Thermal detonators**: bouncing grenades with a short fuse.

The Force push knocks enemies back and slams them into walls. It also reverses incoming bolts.

## Missions

1. **Detention Block AA-23**: escape the cell block, find the red and blue keycards.
2. **Hangar Bay 327**: fight through a crate-filled hangar full of probe droids and death troopers.
3. **Death Star Reactor Core**: face Darth Vader, then hit the reactor core.

## Enemies

Stormtroopers, death troopers, Imperial probe droids and a certain asthmatic Sith Lord
who throws his lightsaber and deflects your blaster bolts.

## Project layout

```
index.html           page, HUD and menu screens
css/style.css        HUD / menu styling
js/audio.js          WebAudio sound synthesis + speech-synth one-liners
js/assets.js         procedural textures and sprites
js/levels.js         ASCII maps (legend at the top of the file)
js/game.js           raycaster, AI, weapons, game flow
tools/check-levels.js  validates maps: `node tools/check-levels.js`
```

To add a level, append a map to `js/levels.js` and run the checker. It verifies the map
is sealed and that the exit can be reached with the keycards available.

*Fan-made parody. Not affiliated with Lucasfilm, Disney, 3D Realms or Gearbox.*
