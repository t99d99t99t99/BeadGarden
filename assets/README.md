# Asset Layout

- `assets/atlases/`: runtime sprite sheets, currently `beads.png` and `pots.png`.
- `assets/audio/music/`: BGM and sound effects.
- `assets/backgrounds/`: screen and themed craft backgrounds.
- `assets/beads/{plant,star,ocean}/`: source images for individual bead art.
- `assets/concepts/`: concept selection preview images.
- `assets/fonts/`: local font files.
- `assets/objects/`: gameplay object support images.
- `assets/pots/source/`: source images for individual pot art.
- `assets/tutorial/`: tutorial step images.
- `assets/ui/stem-bead-craft/`: stem bead craft UI graphics.

Gameplay uses the atlas sheets in `assets/atlases/`. Rebuild the bead atlas manifest with:

```sh
python3 src/tools/buildBeadAtlas.py
```
